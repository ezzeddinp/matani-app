"""Confidence intervals for the reviewer's 12-ablation pipeline (research/pipelines/, DEC-61).

    uv run --no-project --with polars --with pyarrow --with numpy python research/scripts/reviewer_ci.py \
        --pipelines research/pipelines --out research/private/ml-dataset/reviewer-pipeline-ci

The reviewer's outputs are point estimates (means over five seeds). This adds sampling uncertainty without
changing his pipeline: a block cluster bootstrap within tiles (BlockBootstrap from evaluate_ml.py) over his
row-level predictions. Every point estimate is asserted equal to his parquet value before a CI is attached.
Also exports his predictions in the handoff format (predictions.csv) for the app importer. Refuses to overwrite.
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import polars as pl

sys.path.insert(0, str(Path(__file__).resolve().parent))
from evaluate_ml import BlockBootstrap  # noqa: E402

MODELS = ("rf", "xgb")
FEATURE_SETS = ("F0", "F0+F1", "F0+F1+F2", "F2")
PRIMARY = "F0+F1"
TOL = 1e-9


def lo_hi(values):
    finite = values[np.isfinite(values)]
    low, high = np.percentile(finite, [2.5, 97.5])
    return float(low), float(high), float(np.mean(np.isfinite(values)))


def crossover(x, y, w):
    """Notebook 07's estimator per bootstrap replicate: least-squares line of y on x, root where it crosses 0
    (only for a negative slope). x, y: rows; w: replicate × row weights. Returns one crossover per replicate."""
    n = w.sum(1)
    mx, my = (w @ x) / n, (w @ y) / n
    slope = ((w @ (x * y)) / n - mx * my) / ((w @ (x * x)) / n - mx * mx)
    root = mx - my / slope  # -(my - slope*mx)/slope
    return np.where(slope < 0, root, np.nan)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipelines", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    if args.out.exists():
        raise SystemExit(f"refusing to overwrite {args.out}")
    P = args.pipelines
    rows = pl.read_parquet(P / "dataprep/output/evaluationRows.parquet")
    gaps = pl.read_parquet(P / "dataprep/output/opticalGapCases.parquet")
    preds = pl.read_parquet(P / "primary/output/modelPredictions.parquet")
    tile_of_block = dict(rows.select("blockId", "tile").unique().iter_rows())
    boot = BlockBootstrap(tile_of_block)
    row_weights = lambda blocks: boot.weights[:, [boot.index[b] for b in blocks]]  # replicate × row

    # per row and model × feature set: absolute error averaged over the five seeds. The seed mean of per-seed
    # MAE equals the row mean of this, so point estimates match the reviewer's exactly.
    scored = (preds.filter(pl.col("sourceTable") == "mlTable")
              .join(rows.select("rowId", "blockId", "tile", "ndvi"), on="rowId")
              .with_columns((pl.col("prediction") - pl.col("ndvi")).abs().alias("absError")))
    per_row = (scored.group_by("rowId", "blockId", "tile", "model", "featureSet")
               .agg(pl.col("absError").mean(), pl.len().alias("seeds")).sort("rowId"))
    assert per_row.get_column("seeds").unique().to_list() == [5]
    err = {(m, f): per_row.filter(model=m, featureSet=f).sort("rowId") for m in MODELS for f in FEATURE_SETS}
    blocks = err[("rf", PRIMARY)].get_column("blockId").to_list()
    for frame in err.values():
        assert frame.get_column("blockId").to_list() == blocks  # same 792 rows, same order

    stability = pl.read_parquet(P / "primary/output/seedStability.parquet")
    out = {"resamples": int(boot.weights.shape[0]), "method": "block cluster bootstrap within tiles (evaluate_ml.BlockBootstrap)",
           "metrics": {}, "paired": {}, "gap_bins": {}, "crossover": {}}
    for (m, f), frame in err.items():
        values = frame.get_column("absError").to_numpy()
        his = stability.filter(model=m, featureSet=f).row(0, named=True)
        assert abs(values.mean() - his["meanMae"]) < TOL, (m, f)
        low, high = boot.ci(blocks, values)
        out["metrics"][f"{m} {f}"] = {"mae": his["meanMae"], "mae_lo": low, "mae_hi": high, "rmse": his["meanRmse"],
                                      "bias": his["meanBias"], "seed_mae_sd": his["seedMaeStd"], "n_rows": len(values)}

    def paired(name, a, b):
        diff = err[a].get_column("absError").to_numpy() - err[b].get_column("absError").to_numpy()
        low, high = boot.ci(blocks, diff)
        out["paired"][name] = {"diff": float(diff.mean()), "lo": low, "hi": high}

    paired("rf-xgb F0+F1", ("rf", PRIMARY), ("xgb", PRIMARY))
    for m in MODELS:
        paired(f"{m} F0+F1-F0", (m, PRIMARY), (m, "F0"))
        paired(f"{m} F0+F1+F2-F0+F1", (m, "F0+F1+F2"), (m, PRIMARY))
        paired(f"{m} F0+F1-F2", (m, PRIMARY), (m, "F2"))

    # radar minus baseline per gap bin (notebooks 05, 06) and the linear crossover (notebook 07)
    specs = {"interpolation": ("interpolationEvaluable", "interpolationNdvi", "bracketingGapDays", "interpolationGapRange",
                               "operational/output/radarVsInterpolation.parquet"),
             "locf": ("locfEvaluable", "locfNdvi", "gapAgeDays", "locfGapRange", "operational/output/radarVsLocf.parquet")}
    his_cross = pl.read_parquet(P / "operational/output/gapLengthCrossover.parquet")
    for baseline, (flag, base_col, gap_col, bin_col, his_path) in specs.items():
        cases = gaps.filter(pl.col(flag)).select("rowId", "blockId", "ndvi", base_col, gap_col, bin_col)
        his_bins = pl.read_parquet(P / his_path)
        for m in MODELS:
            joined = (scored.filter(model=m, featureSet=PRIMARY)
                      .join(cases.drop("ndvi"), on=["rowId", "blockId"])
                      .with_columns((pl.col("absError") - (pl.col(base_col) - pl.col("ndvi")).abs()).alias("diff")))
            by_row = joined.group_by("rowId", "blockId", gap_col, bin_col).agg(pl.col("diff").mean()).sort("rowId")
            for (label,), frame in by_row.partition_by(bin_col, as_dict=True).items():
                d = frame.get_column("diff").to_numpy()
                his = his_bins.filter(model=m, featureSet=PRIMARY).filter(pl.col(bin_col) == label)
                assert abs(d.mean() - his.get_column("meanErrorDifference").mean()) < TOL, (baseline, m, label)
                base_mae = his.get_column(f"{baseline}Mae").mean()
                low, high = boot.ci(frame.get_column("blockId").to_list(), d)
                out["gap_bins"][f"{baseline} {m} {label}"] = {
                    "bin": str(label), "min_days": int(frame.get_column(gap_col).min()), "max_days": int(frame.get_column(gap_col).max()),
                    "n_rows": len(d), "radar_mae": float(his.get_column("radarMae").mean()), "baseline_mae": float(base_mae),
                    "diff": float(d.mean()), "lo": low, "hi": high, "radar_win_rate": float(his.get_column("radarWinRate").mean())}
            # all natural gaps pooled: equals his per-bin values weighted by row count
            d = by_row.get_column("diff").to_numpy()
            his = his_bins.filter(model=m, featureSet=PRIMARY)
            weighted = lambda col: float((his.get_column(col) * his.get_column("rowCount")).sum() / his.get_column("rowCount").sum())
            assert abs(d.mean() - weighted("meanErrorDifference")) < TOL, (baseline, m, "all")
            low, high = boot.ci(by_row.get_column("blockId").to_list(), d)
            out["gap_bins"][f"{baseline} {m} all"] = {
                "bin": "all", "min_days": int(by_row.get_column(gap_col).min()), "max_days": int(by_row.get_column(gap_col).max()),
                "n_rows": len(d), "radar_mae": weighted("radarMae"), "baseline_mae": weighted(f"{baseline}Mae"),
                "diff": float(d.mean()), "lo": low, "hi": high, "radar_win_rate": weighted("radarWinRate")}
            # crossover: reviewer's per-seed estimator, averaged over seeds, on every bootstrap replicate
            per_seed = joined.sort("seed", "rowId")
            seeds = sorted(per_seed.get_column("seed").unique().to_list())
            reps, points = [], []
            for s in seeds:
                frame = per_seed.filter(seed=s)
                x = frame.get_column(gap_col).cast(pl.Float64).to_numpy()
                y = frame.get_column("diff").to_numpy()
                points.append(crossover(x, y, np.ones((1, len(x))))[0])
                reps.append(crossover(x, y, row_weights(frame.get_column("blockId").to_list())))
            his_row = his_cross.filter(model=m, featureSet=PRIMARY, baseline=baseline).sort("seed")
            assert np.allclose(points, his_row.get_column("crossoverDays").to_numpy(), atol=1e-6), (baseline, m)
            reps = np.nanmean(np.vstack(reps), axis=0)  # seed mean per replicate, as his point estimate
            low, high, valid = lo_hi(reps)
            out["crossover"][f"{baseline} {m}"] = {
                "days": float(np.mean(points)), "lo": low, "hi": high, "replicates_with_negative_slope": valid,
                "min_gap_days": float(his_row.get_column("minimumGapDays").min()),
                "max_gap_days": float(his_row.get_column("maximumGapDays").max()),
                "in_range_seeds": int(his_row.get_column("crossoverInObservedRange").sum())}

    args.out.mkdir(parents=True)
    (args.out / "ci.json").write_text(json.dumps(out, indent=1) + "\n")
    handoff = (preds.select(pl.col("rowId").alias("row_id"),
                            pl.col("sourceTable").replace_strict({"mlTable": "ml_table", "showcaseApply": "showcase_apply"}).alias("table"),
                            "model", pl.col("featureSet").alias("feature_set"), pl.col("outerFold").alias("outer_fold"),
                            "seed", pl.col("prediction").alias("y_pred"))
               .sort("table", "model", "feature_set", "outer_fold", "seed", "row_id"))
    handoff.write_csv(args.out / "predictions.csv")
    hashes = {str(p.relative_to(P)): hashlib.sha256(p.read_bytes()).hexdigest()
              for p in sorted(P.rglob("*")) if p.is_file() and p.name != ".DS_Store"}
    (args.out / "inputs-sha256.json").write_text(json.dumps(hashes, indent=1) + "\n")
    print(f"OK {args.out}: {len(out['metrics'])} metrics, {len(out['paired'])} paired, {len(out['gap_bins'])} gap bins, "
          f"{len(out['crossover'])} crossovers; {len(hashes)} input files hashed")


if __name__ == "__main__":
    main()
