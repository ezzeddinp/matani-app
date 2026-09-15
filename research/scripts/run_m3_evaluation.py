from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from matani_rs.evaluation import adapt_m1, analyse_snapshot, canonical_json


def main():
    parser = argparse.ArgumentParser(description="Offline M1 snapshot evaluation; never calls providers")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    raw = args.input.read_bytes()
    snapshot = adapt_m1(json.loads(raw))
    report = analyse_snapshot(snapshot)
    output = args.output_dir.resolve()
    if snapshot["data_state"] != "fixture" and not output.is_relative_to((ROOT / "private").resolve()):
        raise ValueError("Non-fixture snapshots must be written under ignored research/private/")
    output.mkdir(parents=True, exist_ok=False)
    (output / "source.json").write_bytes(raw)
    for name, value in (("snapshot.json", snapshot), ("report.json", report)):
        (output / name).write_text(canonical_json(value), encoding="utf-8")
    with (output / "monthly.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["field_reference_hash", "month", "season", "intervals", "ndvi", "ndmi", "joint"])
        writer.writeheader()
        for field in report["fields"]:
            for row in field["monthly"]:
                writer.writerow({"field_reference_hash": field["field_reference_hash"], **row})
    lines = ["# M3 offline descriptive report", "", f"Data state: **{snapshot['data_state']}**. No cadence or agronomic-accuracy claim.", "",
             "Per-index columns measure pixel-floor sufficiency; joint retains the source quality decision.", "",
             "| Field | Month | Season | Intervals | NDVI | NDMI | Joint |",
             "|---|---|---|---:|---:|---:|---:|"]
    for field in report["fields"]:
        for row in field["monthly"]:
            lines.append("| " + " | ".join(str(value) for value in [field["field_reference_hash"], *row.values()]) + " |")
    (output / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    analysis_sources = [Path(__file__).resolve(), ROOT / "src/matani_rs/evaluation.py"]
    manifest = {"schema_version": "m3-artifact-manifest-v1", "data_state": snapshot["data_state"],
                "analysis_source_sha256": {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
                                           for path in analysis_sources},
                "network_called": False, "files": {path.name: hashlib.sha256(path.read_bytes()).hexdigest()
                                                     for path in sorted(output.iterdir())}}
    (output / "manifest.json").write_text(canonical_json(manifest), encoding="utf-8")
    print(f"Wrote {snapshot['data_state']} evaluation to {output}")


if __name__ == "__main__":
    main()
