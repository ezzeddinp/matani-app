"""Reference training harness for the Matani ML dataset (README sections 5-6).

Leave-one-tile-out outer loop, GroupKFold-by-window tuning inside the training tiles,
Random Forest and XGBoost under the same budget, 5 seeds per chosen configuration.
Writes predictions.csv, configs.json and env.txt next to this file.

    pip install "pandas>=2" "scikit-learn>=1.4" "xgboost>=2"
    python example_train.py
"""

import hashlib
import json
import platform
from pathlib import Path

import numpy as np
import pandas as pd
import sklearn
import xgboost
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import GroupKFold, ParameterGrid
from xgboost import XGBRegressor

HERE = Path(__file__).parent
DATA = HERE / "data"
SEEDS = range(5)
SHOWCASE_TILE = 42

table = pd.read_csv(DATA / "ml_table.csv")
apply_rows = pd.read_csv(DATA / "showcase_apply.csv")
groups = json.loads((DATA / "features.json").read_text())
FEATURE_SETS = {
    "F0": groups["F0"],
    "F0+F1": groups["F0"] + groups["F1"],
    "F0+F1+F2": groups["F0"] + groups["F1"] + groups["F2"],
    "F2": groups["F2"],
}

# Budgets: RF 18 configs, XGB 12 configs (limit is 30 each).
RF_GRID = list(ParameterGrid({
    "max_depth": [None, 8, 16],
    "min_samples_leaf": [1, 5, 10],
    "max_features": ["sqrt", 1.0],
}))
XGB_GRID = list(ParameterGrid({
    "learning_rate": [0.03, 0.1],
    "max_depth": [3, 5, 7],
    "min_child_weight": [1, 5],
}))
XGB_MAX_TREES = 2000


def make_model(name, params, seed, n_estimators=None):
    if name == "rf":  # scikit-learn >= 1.4 RandomForest accepts NaN in F1 features
        return RandomForestRegressor(n_estimators=300, random_state=seed, n_jobs=-1, **params)
    return XGBRegressor(
        n_estimators=n_estimators or XGB_MAX_TREES, subsample=0.8, colsample_bytree=0.8,
        random_state=seed, n_jobs=-1, early_stopping_rounds=None if n_estimators else 50, **params,
    )


def inner_cv(name, params, train, features):
    """Mean MAE over GroupKFold(window) inside the training tiles; also returns XGB tree counts."""
    folds = GroupKFold(n_splits=min(3, train["window"].nunique()))
    maes, trees = [], []
    for fit_idx, val_idx in folds.split(train, groups=train["window"]):
        fit, val = train.iloc[fit_idx], train.iloc[val_idx]
        model = make_model(name, params, seed=0)
        if name == "xgb":  # early stopping sees the inner validation fold only
            model.fit(fit[features], fit["ndvi"], eval_set=[(val[features], val["ndvi"])], verbose=False)
            trees.append(model.best_iteration + 1)
        else:
            model.fit(fit[features], fit["ndvi"])
        maes.append(np.mean(np.abs(model.predict(val[features]) - val["ndvi"])))
    return float(np.mean(maes)), (int(np.mean(trees)) if trees else None)


predictions, configs = [], []
for test_tile in sorted(table["tile"].unique()):
    train = table[(table["tile"] != test_tile) & (table["role"] == "pool")].reset_index(drop=True)
    test = table[table["tile"] == test_tile]
    assert not set(train["block_id"]) & set(test["block_id"]), "block leaked across the split"
    assert (train["role"] == "pool").all(), "showcase rows must never train"

    for feature_set, features in FEATURE_SETS.items():
        for name, grid in (("rf", RF_GRID), ("xgb", XGB_GRID)):
            scored = [(params, *inner_cv(name, params, train, features)) for params in grid]
            best_params, best_mae, best_trees = min(scored, key=lambda item: item[1])
            configs.append({
                "outer_fold": int(test_tile), "model": name, "feature_set": feature_set,
                "chosen": best_params, "chosen_inner_mae": best_mae, "xgb_trees": best_trees,
                "grid": [{"params": p, "inner_mae": m} for p, m, _ in scored],
            })
            for seed in SEEDS:
                model = make_model(name, best_params, seed, n_estimators=best_trees)
                model.fit(train[features], train["ndvi"])
                targets = [("ml_table", test)]
                if test_tile == SHOWCASE_TILE:
                    targets.append(("showcase_apply", apply_rows))
                for table_name, rows in targets:
                    for row_id, y_pred in zip(rows["row_id"], model.predict(rows[features])):
                        predictions.append((int(row_id), table_name, name, feature_set, int(test_tile), seed, float(y_pred)))
            print(f"tile {test_tile} held out | {name:3} {feature_set:9} inner MAE {best_mae:.4f}")

out = pd.DataFrame(predictions, columns=["row_id", "table", "model", "feature_set", "outer_fold", "seed", "y_pred"])
out.to_csv(HERE / "predictions.csv", index=False)
(HERE / "configs.json").write_text(json.dumps(configs, indent=1, default=str))
DATA_FILES = ("ml_table.csv", "showcase_apply.csv", "features.json", "splits-v1.csv")
(HERE / "env.txt").write_text(
    f"python {platform.python_version()}\nnumpy {np.__version__}\npandas {pd.__version__}\n"
    f"scikit-learn {sklearn.__version__}\nxgboost {xgboost.__version__}\nmachine {platform.platform()} {platform.processor()}\n"
    # binds these predictions to the exact dataset version they were trained on (checked by rebuild-ml-paper.sh)
    + "".join(f"sha256 data/{name} {hashlib.sha256((DATA / name).read_bytes()).hexdigest()}\n" for name in DATA_FILES)
    + f"sha256 predictions.csv {hashlib.sha256((HERE / 'predictions.csv').read_bytes()).hexdigest()}\n"
)

# Sanity print only: the paper's metrics are computed from predictions.csv by the developer.
scored = out[out["table"] == "ml_table"].merge(table[["row_id", "ndvi"]], on="row_id")
summary = scored.assign(err=(scored["y_pred"] - scored["ndvi"]).abs()).groupby(["model", "feature_set"])["err"].mean()
print("\nPooled test MAE (all seeds):\n" + summary.round(4).to_string())
