"""Packages an extraction run into the reviewer handoff folder (docs/matani-ml-technical-spec.md §11).

    python3 research/scripts/make-ml-handoff.py \
        --extraction research/private/ml-dataset/extraction-v1 \
        --out research/private/ml-dataset/ml-dataset-v1

Standard library only. Refuses to overwrite. Fails on any split/leakage violation.
"""

import argparse
import csv
import hashlib
import json
import shutil
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
TEMPLATES = REPO / "research" / "ml-handoff"
GO_MIN_BLOCKS, GO_MIN_ROWS = 30, 10  # HYP go/no-go, spec §13

parser = argparse.ArgumentParser()
parser.add_argument("--extraction", required=True, type=Path)
parser.add_argument("--out", required=True, type=Path)
parser.add_argument("--version", default="ml-dataset-v1")
args = parser.parse_args()


def read(path):
    with open(path, newline="") as handle:
        return list(csv.DictReader(handle))


def write(path, rows, columns):
    with open(path, "x", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


source = args.extraction
features = json.loads((source / "features.json").read_text())
feature_columns = [column for group in features.values() for column in group]
matched = read(source / "matched.csv")
apply_rows = read(source / "showcase-apply.csv")
blocks = json.loads((source / "blocks.geojson").read_text())["features"]

# --- invariants -----------------------------------------------------------------
block_props = {feature["properties"]["id"]: feature["properties"] for feature in blocks}
assert len(block_props) == len(blocks), "duplicate block ids"
window_tile = {}
for props in block_props.values():
    assert window_tile.setdefault(props["window"], props["tile"]) == props["tile"], f"window {props['window']} spans tiles"
    assert props["role"] in {"pool", "showcase"}, props["role"]
assert not any("ndvi" in column or "ndmi" in column for column in feature_columns), "optical column in feature list"

ml_rows = []
for row in matched:
    if row["target_v1_pass"] != "true" or row["match_status"] != "matched":
        continue
    props = block_props[row["block_id"]]
    assert (row["tile"], row["window"], row["role"]) == (props["tile"], props["window"], props["role"]), row["row_id"]
    assert row["ndvi"] != "" and -1 <= float(row["ndvi"]) <= 1, row["row_id"]
    assert all(row[column] != "" for column in features["F0"] + features["F2"]), f"F0/F2 missing in row {row['row_id']}"
    assert abs(float(row["offset_days"])) <= 3, row["row_id"]
    ml_rows.append({**row, "matched_row_id": row["row_id"], "row_id": len(ml_rows)})
for row in apply_rows:
    assert block_props[row["block_id"]]["role"] == "showcase", "apply rows must be showcase only"

# --- write folder -----------------------------------------------------------------
out = args.out
out.mkdir(parents=True)  # raises if it exists
(out / "data").mkdir()
ML_COLUMNS = ["row_id", "matched_row_id", "block_id", "tile", "window", "role", "s2_date", "s2_datetime",
              "ndvi", "ndvi_valid_frac", "s1_date", "s1_datetime", "s1_products", "orbit_direction",
              "relative_orbit", "offset_days", *feature_columns, "doy"]
write(out / "data" / "ml_table.csv", ml_rows, ML_COLUMNS)
write(out / "data" / "showcase_apply.csv", apply_rows, list(apply_rows[0].keys()) if apply_rows else ["row_id"])
write(out / "data" / "splits-v1.csv", [{"block_id": key, **props} for key, props in block_props.items()],
      ["block_id", "tile", "window", "role"])
for name in ("matched.csv", "s1-observations.csv", "s2-observations.csv", "blocks.geojson", "features.json"):
    shutil.copyfile(source / name, out / "data" / name)
for name in ("example_train.py", "check_predictions.py"):
    shutil.copyfile(TEMPLATES / name, out / name)
(out / "predictions_template.csv").write_text(
    "row_id,table,model,feature_set,outer_fold,seed,y_pred\n0,ml_table,rf,F0+F1,42,0,0.6123\n0,showcase_apply,xgb,F0+F1,42,0,0.4410\n"
)

# --- counts, README, manifest ----------------------------------------------------
rows_per_block = Counter(row["block_id"] for row in ml_rows)
per_tile = defaultdict(lambda: {"blocks": set(), "windows": set(), "rows": 0})
for props in block_props.values():
    per_tile[props["tile"]]["blocks"].add(props["id"])
    per_tile[props["tile"]]["windows"].add(props["window"])
for row in ml_rows:
    per_tile[row["tile"]]["rows"] += 1
tile_table = "| tile | blocks | windows | ML rows |\n|---|---:|---:|---:|\n" + "\n".join(
    f"| {tile} | {len(v['blocks'])} | {len(v['windows'])} | {v['rows']} |" for tile, v in sorted(per_tile.items())
)
go_blocks = sum(1 for props in block_props.values() if props["role"] == "pool" and rows_per_block[props["id"]] >= GO_MIN_ROWS)
built_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
readme = (TEMPLATES / "README.md").read_text()
for token, value in {
    "{{DATASET_VERSION}}": args.version, "{{BUILT_AT}}": built_at, "{{N_ROWS}}": str(len(ml_rows)),
    "{{N_BLOCKS}}": str(len(rows_per_block)), "{{N_APPLY}}": str(len(apply_rows)), "{{TILE_TABLE}}": tile_table,
}.items():
    readme = readme.replace(token, value)
assert "{{" not in readme, "unfilled README placeholder"
(out / "README.md").write_text(readme)

extraction_manifest = json.loads((source / "MANIFEST.json").read_text())
manifest = {
    "version": args.version,
    "built_at": built_at,
    "counts": {
        "blocks": len(block_props),
        "pool_blocks": sum(1 for p in block_props.values() if p["role"] == "pool"),
        "ml_rows": len(ml_rows),
        "showcase_apply_rows": len(apply_rows),
        "ml_rows_per_block": dict(sorted(rows_per_block.items())),
        "per_tile": {tile: {"blocks": len(v["blocks"]), "windows": len(v["windows"]), "ml_rows": v["rows"]} for tile, v in sorted(per_tile.items())},
    },
    "go_no_go": {
        "rule": f">= {GO_MIN_BLOCKS} pool blocks with >= {GO_MIN_ROWS} ML rows",
        "pool_blocks_meeting_rule": go_blocks,
        "go": go_blocks >= GO_MIN_BLOCKS,
    },
    "extraction": {key: extraction_manifest[key] for key in ("created_at", "versions", "settings", "provider", "code_sha256")},
}
files = sorted(path for path in out.rglob("*") if path.is_file())
manifest["sha256"] = {str(path.relative_to(out)): hashlib.sha256(path.read_bytes()).hexdigest() for path in files}
(out / "MANIFEST.json").write_text(json.dumps(manifest, indent=2) + "\n")
archive = shutil.make_archive(str(out), "zip", root_dir=out.parent, base_dir=out.name)

print(tile_table)
print(f"ML rows {len(ml_rows)}, apply rows {len(apply_rows)}; go/no-go: {go_blocks} pool blocks with >= {GO_MIN_ROWS} rows -> {'GO' if manifest['go_no_go']['go'] else 'NO-GO'}")
print(f"wrote {out} and {archive}")
