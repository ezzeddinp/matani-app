"""AGERS 2026 camera-ready analyses requested by the reviewers, from the frozen pipeline outputs only.

    uv run --no-project --with polars --with pyarrow --with numpy --with scikit-learn python \
        research/scripts/revision_analyses.py --pipelines research/pipelines \
        --s1 research/private/ml-dataset/extraction-v2/s1-observations.csv \
        --out research/private/ml-dataset/revision-2026-11

Every comparison is radar (Random Forest, F0+F1, seed-mean prediction) minus a baseline, in absolute error, per
gap bin, with the block cluster bootstrap behind Table III (evaluate_ml.BlockBootstrap). The script first
reproduces the published LOCF >30 and interpolation >60 bins and the linear crossovers from reviewer_ci.py's
estimator, and refuses to continue if they differ. Fits no NDVI model and calls no provider. Refuses to overwrite.
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import polars as pl
from sklearn.isotonic import IsotonicRegression

sys.path.insert(0, str(Path(__file__).resolve().parent))
from evaluate_ml import BlockBootstrap  # noqa: E402

MODEL, FEATURES = "rf", "F0+F1"
OPEN_BINS = ((0, 5, "<=5"), (6, 10, "6-10"), (11, 20, "11-20"), (21, 30, "21-30"), (31, 10**6, ">30"))
PUBLISHED = {("locf", ">30"): (-0.14962, -0.19518, -0.09588, 45), ("interpolation", ">60"): (-0.0098, -0.0830, 0.0660, 29)}
LINEAR_CROSSOVER = {"locf": 19.37, "interpolation": 78.64}
VH_PAIR_DAYS = 6  # a previous-date pass must be this close to the previous observation, same relative orbit


def open_bin(days):
    return next(label for low, high, label in OPEN_BINS if low <= days <= high)


def load(P, s1_path):
    rows = pl.read_parquet(P / "dataprep/output/evaluationRows.parquet")
    gaps = pl.read_parquet(P / "dataprep/output/opticalGapCases.parquet")
    preds = (pl.read_parquet(P / "primary/output/modelPredictions.parquet")
             .filter(sourceTable="mlTable", model=MODEL, featureSet=FEATURES))
    seed_mean = preds.group_by("rowId").agg(pl.col("prediction").mean().alias("radar"), pl.len().alias("seeds"))
    assert seed_mean.get_column("seeds").unique().to_list() == [5]
    # per-row radar absolute error averaged over seeds, as in reviewer_ci.py (not the error of the mean prediction)
    radar_err = (preds.join(rows.select("rowId", "ndvi"), on="rowId")
                 .group_by("rowId").agg((pl.col("prediction") - pl.col("ndvi")).abs().mean().alias("radarErr")))
    frame = (rows.select("rowId", "blockId", "tile", "targetDate", "ndvi", "s1Date", "relativeOrbit", "vhDb",
                         "flagNegativeNdvi", "offsetDirection")
             .join(gaps.select("rowId", "previousOpticalDate", "previousOpticalNdvi", "nextOpticalDate",
                               "nextOpticalNdvi", "gapAgeDays", "daysToNextOptical", "bracketingGapDays",
                               "locfEvaluable", "locfNdvi", "locfGapRange", "interpolationEvaluable",
                               "interpolationNdvi", "interpolationGapRange"), on="rowId")
             .join(seed_mean.drop("seeds"), on="rowId").join(radar_err, on="rowId").sort("rowId"))
    s1 = (pl.read_csv(s1_path, try_parse_dates=True)
          .select(pl.col("block_id").alias("blockId"), pl.col("date").alias("passDate"),
                  pl.col("relative_orbit").alias("relativeOrbit"), pl.col("vh_db").alias("passVh")))
    return frame.with_columns(pl.col("offsetDirection").cast(pl.Utf8)), s1


def compare(frame, boot, base, gap, label):
    """Radar minus baseline absolute error per row, summarised per bin with the block bootstrap CI."""
    d = frame.with_columns((pl.col("radarErr") - (pl.col(base) - pl.col("ndvi")).abs()).alias("diff"))
    out = {}
    for (bin_label,), part in sorted(d.partition_by(label, as_dict=True).items(), key=lambda kv: str(kv[0][0])):
        diff = part.get_column("diff").to_numpy()
        low, high = boot.ci(part.get_column("blockId").to_list(), diff)
        out[str(bin_label)] = {
            "rows": part.height, "blocks": part.get_column("blockId").n_unique(), "tiles": part.get_column("tile").n_unique(),
            "dates": part.get_column("targetDate").n_unique(), "tile_dates": part.select("tile", "targetDate").n_unique(),
            "radar_mae": float(part.get_column("radarErr").mean()),
            "baseline_mae": float((part.get_column(base) - part.get_column("ndvi")).abs().mean()),
            "diff": float(diff.mean()), "lo": low, "hi": high, "gap_mean": float(part.get_column(gap).mean()),
            "gap_min": int(part.get_column(gap).min()),
            "gap_max": int(part.get_column(gap).max())}
    return out


def leave_one_out(part, boot, base, key):
    """Bin difference and CI with each cluster (block, or tile × S2 date) removed in turn."""
    d = part.with_columns((pl.col("radarErr") - (pl.col(base) - pl.col("ndvi")).abs()).alias("diff"))
    runs = []
    clusters = d.select(key).unique().rows()
    for values in clusters:
        mask = pl.lit(True)
        for name, value in zip(key, values):
            mask = mask & (pl.col(name) == value)
        rest = d.filter(~mask)
        diff = rest.get_column("diff").to_numpy()
        low, high = boot.ci(rest.get_column("blockId").to_list(), diff)
        runs.append({"dropped": [str(v) for v in values], "rows": rest.height, "diff": float(diff.mean()), "lo": low, "hi": high})
    diffs = [r["diff"] for r in runs]
    excludes_zero = [r["hi"] < 0 or r["lo"] > 0 for r in runs]
    worst = max(runs, key=lambda r: r["diff"]) if np.mean(diffs) < 0 else min(runs, key=lambda r: r["diff"])
    return {"clusters": len(runs), "diff_min": min(diffs), "diff_max": max(diffs),
            "ci_excludes_zero": int(sum(excludes_zero)), "least_favourable": worst}


def event_ci(part, base):
    """Bin difference with the bootstrap clustered by tile × Sentinel-2 date instead of block, resampled within tiles."""
    d = part.with_columns((pl.col("radarErr") - (pl.col(base) - pl.col("ndvi")).abs()).alias("diff"),
                          pl.format("{}:{}", "tile", "targetDate").alias("event"))
    events = BlockBootstrap(dict(d.select("event", "tile").unique().iter_rows()))
    low, high = events.ci(d.get_column("event").to_list(), d.get_column("diff").to_numpy())
    return {"events": d.get_column("event").n_unique(), "diff": float(d.get_column("diff").mean()), "lo": low, "hi": high}


def isotonic_crossover(part, boot, base, gap):
    """Non-parametric crossover: decreasing isotonic fit of the per-row difference on gap length, first gap where
    the fit falls below zero; the CI refits it on every block bootstrap replicate."""
    d = part.with_columns((pl.col("radarErr") - (pl.col(base) - pl.col("ndvi")).abs()).alias("diff"))
    x = d.get_column(gap).cast(pl.Float64).to_numpy()
    y = d.get_column("diff").to_numpy()
    idx = np.array([boot.index[b] for b in d.get_column("blockId").to_list()])

    def cross(weights):
        keep = weights > 0
        fit = IsotonicRegression(increasing=False).fit(x[keep], y[keep], sample_weight=weights[keep])
        grid = np.arange(x.min(), x.max() + 1)  # gaps are multiples of 5 days; the fit is interpolated between them
        below = grid[fit.predict(grid) < 0]
        return float(below[0]) if below.size else np.nan

    point = cross(np.ones_like(y))
    grid = np.unique(x)
    curve = IsotonicRegression(increasing=False).fit(x, y).predict(grid)  # the full-sample fit, for Fig. 2
    reps = np.array([cross(boot.weights[r, idx]) for r in range(boot.weights.shape[0])])
    # a replicate whose fit never falls below zero has its crossover beyond the observed range, not missing
    low, high = np.percentile(np.where(np.isfinite(reps), reps, np.inf), [2.5, 97.5])
    return {"days": point, "lo": float(low), "hi": float(high) if np.isfinite(high) else "beyond observed range",
            "replicates_with_crossing": float(np.isfinite(reps).mean()), "gap_range": [int(x.min()), int(x.max())],
            "curve": [[float(g), float(v)] for g, v in zip(grid, curve)]}


def hybrid_baseline(frame, s1):
    """Persistence plus radar change: NDVI_prev + beta · (VH at the matched pass − VH at the same-orbit pass nearest the
    previous observation, within VH_PAIR_DAYS). beta is refitted for each held-out tile on the other two tiles' rows,
    by least squares through the origin. Rows without a previous same-orbit pass keep plain persistence."""
    prev = (frame.filter(pl.col("locfEvaluable"))
            .select("rowId", "blockId", "relativeOrbit", "previousOpticalDate")
            .join(s1, on=["blockId", "relativeOrbit"])
            .with_columns((pl.col("passDate") - pl.col("previousOpticalDate")).dt.total_days().abs().alias("lag"))
            .filter(pl.col("lag") <= VH_PAIR_DAYS)
            .sort("lag", "passDate").group_by("rowId").first()
            .select("rowId", pl.col("passVh").alias("prevVh")))
    f = (frame.join(prev, on="rowId", how="left")
         .with_columns(pl.when(pl.col("prevVh").is_not_null()).then(pl.col("vhDb") - pl.col("prevVh")).otherwise(0.0)
                       .alias("dVh"), (pl.col("ndvi") - pl.col("locfNdvi")).alias("dNdvi")))
    betas, parts = {}, []
    for tile in sorted(f.get_column("tile").unique().to_list()):
        train = f.filter((pl.col("tile") != tile) & pl.col("locfEvaluable") & pl.col("prevVh").is_not_null())
        x, y = train.get_column("dVh").to_numpy(), train.get_column("dNdvi").to_numpy()
        betas[str(tile)] = float((x @ y) / (x @ x))
        parts.append(f.filter(pl.col("tile") == tile)
                     .with_columns((pl.col("locfNdvi") + betas[str(tile)] * pl.col("dVh")).alias("hybridNdvi")))
    out = pl.concat(parts).sort("rowId")
    paired = out.filter(pl.col("locfEvaluable") & pl.col("prevVh").is_not_null()).height
    return out, betas, paired


def uncertainty_band(frame):
    """Empirical 80% range per predicted-NDVI bin, from two tiles, checked on the third (leave-one-tile-out),
    against the pooled ±MAE disclosure on the same rows. Residuals are of the seed-mean prediction, the value the app
    shows, not the seed-mean absolute error used elsewhere (the two MAEs differ by 0.0001)."""
    edges = [-np.inf, 0.3, 0.5, 0.7, np.inf]
    f = frame.with_columns((pl.col("ndvi") - pl.col("radar")).alias("resid"),
                           pl.col("radar").cut(edges[1:-1], labels=["<=0.3", "0.3-0.5", "0.5-0.7", ">0.7"]).alias("predBin"))  # right-closed
    covered, mae_covered, widths, table = 0, 0, [], {}
    for tile in sorted(f.get_column("tile").unique().to_list()):
        train, test = f.filter(pl.col("tile") != tile), f.filter(pl.col("tile") == tile)
        mae = float(train.get_column("resid").abs().mean())
        q = train.group_by("predBin").agg(pl.col("resid").quantile(0.1, "linear").alias("q10"),
                                         pl.col("resid").quantile(0.9, "linear").alias("q90"))
        t = test.join(q, on="predBin")
        covered += int(((t["resid"] >= t["q10"]) & (t["resid"] <= t["q90"])).sum())
        mae_covered += int((t["resid"].abs() <= mae).sum())
        widths += (t["q90"] - t["q10"]).to_list()
    full = f.group_by("predBin").agg(pl.len().alias("rows"), pl.col("resid").quantile(0.1, "linear").alias("q10"),
                                     pl.col("resid").quantile(0.9, "linear").alias("q90"),
                                     pl.col("resid").mean().alias("bias")).sort("predBin")
    for r in full.iter_rows(named=True):
        table[r["predBin"]] = {k: (float(v) if k != "rows" else v) for k, v in r.items() if k != "predBin"}
    return {"rows": f.height, "band_coverage": covered / f.height, "band_mean_width": float(np.mean(widths)),
            "pooled_mae_coverage": mae_covered / f.height, "per_bin_all_tiles": table}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipelines", type=Path, required=True)
    ap.add_argument("--s1", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    if args.out.exists():
        raise SystemExit(f"refusing to overwrite {args.out}")
    frame, s1 = load(args.pipelines, args.s1)
    boot = BlockBootstrap(dict(frame.select("blockId", "tile").unique().iter_rows()))
    locf = frame.filter(pl.col("locfEvaluable"))
    interp = frame.filter(pl.col("interpolationEvaluable"))
    out = {"model": f"{MODEL} {FEATURES}", "resamples": int(boot.weights.shape[0])}

    out["table_iii"] = {"locf": compare(locf, boot, "locfNdvi", "gapAgeDays", "locfGapRange"),
                        "interpolation": compare(interp, boot, "interpolationNdvi", "bracketingGapDays", "interpolationGapRange")}
    for (base, label), (diff, lo, hi, rows) in PUBLISHED.items():
        got = out["table_iii"][base][label]
        assert got["rows"] == rows and abs(got["diff"] - diff) < 5e-4 and abs(got["lo"] - lo) < 5e-4 and abs(got["hi"] - hi) < 5e-4, \
            f"does not reproduce Table III {base} {label}: {got}"

    long_bins = {"locf": (locf.filter(pl.col("locfGapRange") == ">30"), "locfNdvi"),
                 "interpolation": (interp.filter(pl.col("interpolationGapRange") == ">60"), "interpolationNdvi")}
    out["long_bins"] = {}
    for base, (part, col) in long_bins.items():
        per_block = part.group_by("blockId").len().get_column("len")
        out["long_bins"][base] = {
            "rows": part.height, "blocks": part.get_column("blockId").n_unique(), "tiles": part.get_column("tile").n_unique(),
            "s2_dates": part.get_column("targetDate").n_unique(), "tile_dates": part.select("tile", "targetDate").n_unique(),
            "max_rows_per_block": int(per_block.max()), "rows_by_tile": dict(part.group_by("tile").len().sort("tile").iter_rows()),
            "negative_references": int(part.get_column("flagNegativeNdvi").sum()),
            "event_clustered_ci": event_ci(part, col),
            "leave_one_block_out": leave_one_out(part, boot, col, ["blockId"]),
            "leave_one_event_out": leave_one_out(part, boot, col, ["tile", "targetDate"])}

    # flooded references: drop rows whose target or whose baseline input observation is negative
    no_neg_locf = locf.filter((pl.col("ndvi") >= 0) & (pl.col("locfNdvi") >= 0))
    no_neg_interp = interp.filter((pl.col("ndvi") >= 0) & (pl.col("previousOpticalNdvi") >= 0) & (pl.col("nextOpticalNdvi") >= 0))
    out["without_negative"] = {
        "locf": compare(no_neg_locf, boot, "locfNdvi", "gapAgeDays", "locfGapRange"),
        "interpolation": compare(no_neg_interp, boot, "interpolationNdvi", "bracketingGapDays", "interpolationGapRange"),
        "rows_removed": {"locf": locf.height - no_neg_locf.height, "interpolation": interp.height - no_neg_interp.height}}

    # radar acquired at or before the optical date only (the live-monitoring direction)
    causal = frame.filter(pl.col("offsetDirection") == "radarBeforeOptical")
    out["radar_before_optical"] = {
        "rows": causal.height,
        "locf": compare(causal.filter(pl.col("locfEvaluable")), boot, "locfNdvi", "gapAgeDays", "locfGapRange"),
        "interpolation": compare(causal.filter(pl.col("interpolationEvaluable")), boot, "interpolationNdvi",
                                 "bracketingGapDays", "interpolationGapRange")}

    # before the first observation: next observation carried backward, by days to that observation
    nocb = frame.filter(pl.col("nextOpticalNdvi").is_not_null()).with_columns(
        pl.col("daysToNextOptical").map_elements(open_bin, return_dtype=pl.Utf8).alias("nocbGapRange"))
    leading = nocb.filter(pl.col("previousOpticalDate").is_null())
    out["nocb"] = {"rows": nocb.height, "rows_before_first_observation": leading.height,
                   "event_clustered_ci_over_30": event_ci(nocb.filter(pl.col("nocbGapRange") == ">30"), "nextOpticalNdvi"),
                   "bins": compare(nocb, boot, "nextOpticalNdvi", "daysToNextOptical", "nocbGapRange"),
                   "isotonic_crossover": isotonic_crossover(nocb, boot, "nextOpticalNdvi", "daysToNextOptical")}

    out["isotonic_crossover"] = {"locf": isotonic_crossover(locf, boot, "locfNdvi", "gapAgeDays"),
                                 "interpolation": isotonic_crossover(interp, boot, "interpolationNdvi", "bracketingGapDays"),
                                 "linear_for_reference": LINEAR_CROSSOVER}

    hybrid, betas, paired = hybrid_baseline(frame, s1)
    hyb = hybrid.filter(pl.col("locfEvaluable"))
    out["hybrid"] = {"betas_by_held_out_tile": betas, "rows": hyb.height, "rows_with_previous_pass": paired,
                     "hybrid_mae": float((hyb["hybridNdvi"] - hyb["ndvi"]).abs().mean()),
                     "locf_mae": float((hyb["locfNdvi"] - hyb["ndvi"]).abs().mean()),
                     "radar_mae": float(hyb["radarErr"].mean()),
                     "radar_minus_hybrid": compare(hyb, boot, "hybridNdvi", "gapAgeDays", "locfGapRange"),
                     "hybrid_minus_locf": compare(hyb.with_columns(pl.col("hybridNdvi").alias("h")).with_columns(
                         (pl.col("h") - pl.col("ndvi")).abs().alias("radarErr")), boot, "locfNdvi", "gapAgeDays",
                         "locfGapRange")}

    out["uncertainty"] = uncertainty_band(frame)

    args.out.mkdir(parents=True)
    (args.out / "analyses.json").write_text(json.dumps(out, indent=1, default=str) + "\n")
    print(json.dumps(out, indent=1, default=str))


if __name__ == "__main__":
    main()
