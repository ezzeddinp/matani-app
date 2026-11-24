"""Checks that a prediction file belongs to the dataset version it will be evaluated against (review N3).

    python3 research/scripts/check_run_binding.py <run>/predictions.csv <handoff-dir>

Row IDs are identical across dataset versions, so check_predictions.py cannot tell them apart. The training
harness writes `sha256 <path> <hash>` lines to env.txt for its input data files and for predictions.csv; this
script requires every one of them and checks the data hashes against the handoff MANIFEST and the prediction
hash against the file on disk. Standard library only. Exits non-zero with a reason on any mismatch.
"""

import hashlib
import json
import sys
from pathlib import Path

DATA = ("data/ml_table.csv", "data/showcase_apply.csv", "data/features.json", "data/splits-v1.csv")


def check(predictions, handoff):
    run = predictions.parent
    env = run / "env.txt"
    if not env.exists():
        raise ValueError(f"{env} missing: return env.txt from the training harness with the predictions")
    recorded = dict(line.split()[1:3] for line in env.read_text().splitlines() if line.startswith("sha256 "))
    expected = json.loads((handoff / "MANIFEST.json").read_text())["sha256"]
    for name in DATA:
        if name not in recorded:
            raise ValueError(f"env.txt has no hash for {name}: retrain with the current example_train.py")
        if recorded[name] != expected[name]:
            raise ValueError(f"{name} differs from {handoff.name}: trained on another dataset version")
    if "predictions.csv" not in recorded:
        raise ValueError("env.txt has no hash for predictions.csv: retrain with the current example_train.py")
    if recorded["predictions.csv"] != hashlib.sha256(predictions.read_bytes()).hexdigest():
        raise ValueError("predictions.csv does not match the hash its training run recorded")
    return f"training data and predictions match {handoff.name}"


if __name__ == "__main__":
    try:
        print(check(Path(sys.argv[1]), Path(sys.argv[2])))
    except ValueError as error:
        sys.exit(f"run binding: {error}")
