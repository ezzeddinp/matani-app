"""Validates a predictions.csv against the dataset rules (README section 6). Standard library only.

    python check_predictions.py predictions.csv
"""

import csv
import math
import sys
from collections import Counter
from pathlib import Path

DATA = Path(__file__).parent / "data"
MODELS = {"rf", "xgb"}
FEATURE_SETS = {"F0", "F0+F1", "F0+F1+F2", "F2"}
SEEDS = {str(seed) for seed in range(5)}
SHOWCASE_TILE = "42"


def read(path):
    with open(path, newline="") as handle:
        return list(csv.DictReader(handle))


def main(path):
    table = {row["row_id"]: row for row in read(DATA / "ml_table.csv")}
    apply_ids = {row["row_id"] for row in read(DATA / "showcase_apply.csv")}
    rows = read(path)
    problems = []
    expected_columns = ["row_id", "table", "model", "feature_set", "outer_fold", "seed", "y_pred"]
    if not rows or list(rows[0].keys()) != expected_columns:
        sys.exit(f"columns must be exactly {expected_columns}")

    keys = Counter()
    outside = 0
    for number, row in enumerate(rows, start=2):
        where = f"line {number}"
        if row["model"] not in MODELS or row["feature_set"] not in FEATURE_SETS or row["seed"] not in SEEDS:
            problems.append(f"{where}: unknown model/feature_set/seed")
            continue
        try:
            value = float(row["y_pred"])
        except ValueError:
            value = math.nan
        if not math.isfinite(value):
            problems.append(f"{where}: y_pred is not a finite number")
        elif abs(value) > 1:
            outside += 1
        if row["table"] == "ml_table":
            source = table.get(row["row_id"])
            if source is None:
                problems.append(f"{where}: unknown ml_table row_id {row['row_id']}")
            elif row["outer_fold"] != source["tile"]:
                problems.append(f"{where}: row from tile {source['tile']} predicted by fold {row['outer_fold']} (must be its own held-out tile)")
        elif row["table"] == "showcase_apply":
            if row["row_id"] not in apply_ids:
                problems.append(f"{where}: unknown showcase_apply row_id {row['row_id']}")
            if row["outer_fold"] != SHOWCASE_TILE:
                problems.append(f"{where}: showcase rows must come from the tile-{SHOWCASE_TILE} fold")
        else:
            problems.append(f"{where}: table must be ml_table or showcase_apply")
        keys[(row["table"], row["row_id"], row["model"], row["feature_set"], row["seed"])] += 1

    duplicates = [key for key, count in keys.items() if count > 1]
    if duplicates:
        problems.append(f"{len(duplicates)} duplicated predictions, e.g. {duplicates[0]}")
    for table_name, ids in (("ml_table", table.keys()), ("showcase_apply", apply_ids)):
        for model in MODELS:
            for feature_set in FEATURE_SETS:
                for seed in SEEDS:
                    missing = [row_id for row_id in ids if (table_name, row_id, model, feature_set, seed) not in keys]
                    if missing:
                        problems.append(f"missing {len(missing)} {table_name} predictions for {model}/{feature_set}/seed {seed}")

    if outside:
        print(f"note: {outside} predictions outside [-1, 1] (allowed here, flagged before import into the app)")
    if problems:
        print("\n".join(problems[:25]) + (f"\n... {len(problems) - 25} more" if len(problems) > 25 else ""))
        sys.exit(1)
    print(f"OK: {len(rows)} predictions")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "predictions.csv")
