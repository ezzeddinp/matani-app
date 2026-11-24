"""Paper figures and quoted numbers for the Sentinel-1 → NDVI manuscript, from frozen files only.

    uv run --no-project --with numpy --with matplotlib --with polars --with pyarrow \
        python research/scripts/make-ml-paper-figures.py \
        --handoff research/private/ml-dataset/ml-dataset-v2 \
        --pipelines research/pipelines \
        --ci research/private/ml-dataset/reviewer-pipeline-ci \
        --out docs/manuscripts

Normally run through research/scripts/rebuild-ml-paper.sh. The results are the reviewer's 12-ablation pipeline
(research/pipelines/, DEC-61) plus our block-bootstrap intervals (reviewer_ci.py).

Writes ml-fig-{area,gap,krangkeng}.{png,pdf} and ml-paper-numbers.json. Reads no provider, fits no model.
"""

import argparse
import csv
import json
import math
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import polars as pl

# Validated categorical slots (dataviz reference palette, light); every series also has a marker/linestyle.
BLUE, ORANGE, AQUA, YELLOW, GREY, INK = "#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#8a8a85", "#222220"
GREEN_TINT, GREEN_INK = "#e3f1e6", "#14532d"  # Matani's estimate green (app/detail-lahan-page.tsx): where estimates are shown
TILES = {"42": "Indramayu, West Java", "49": "Pati, Central Java", "55": "Gresik, East Java"}
TILE_COLOUR = {"42": BLUE, "49": ORANGE, "55": AQUA}
SHOWCASE_MODEL = ("rf", "F0+F1")  # primary configuration; RF and XGBoost do not differ (numbers.json → ci.paired)
MIN_BRACKETED_GAP_DAYS, MIN_LEADING_GAP_DAYS, MIN_TRAILING_GAP_DAYS = 80, 30, 20  # utils/estimate-timeline.ts (DEC-62/63)

plt.rcParams.update({"font.family": "serif", "font.size": 8, "axes.spines.top": False, "axes.spines.right": False,
                     "axes.edgecolor": "#6b6b66", "axes.linewidth": 0.6, "xtick.color": "#4a4a46",
                     "ytick.color": "#4a4a46", "axes.labelcolor": INK, "legend.frameon": False,
                     "savefig.dpi": 300, "savefig.bbox": "tight"})


def read(path):
    with open(path, newline="") as handle:
        return list(csv.DictReader(handle))


def d(value):
    return date.fromisoformat(value[:10])


def save(fig, out, name):
    for ext in ("png", "pdf"):
        fig.savefig(out / f"{name}.{ext}")
    plt.close(fig)


def area_figure(blocks, out):
    fig, ax = plt.subplots(figsize=(3.45, 1.45))
    for tile, name in TILES.items():
        pts = [f for f in blocks if f["properties"]["tile"] == tile]
        xy = np.array([np.mean(f["geometry"]["coordinates"][0][:-1], axis=0) for f in pts])
        x0, y0 = 2 * math.floor(xy[:, 0].min() / 2), 2 * math.floor(xy[:, 1].min() / 2)
        ax.add_patch(plt.Rectangle((x0, y0), 2, 2, fill=False, lw=0.6, ec="#b5b4ad", ls=(0, (3, 2))))
        pool = [p for p, f in zip(xy, pts) if f["properties"]["role"] == "pool"]
        ax.scatter(*np.array(pool).T, s=9, c=TILE_COLOUR[tile], ec="white", lw=0.4, zorder=3)
        ax.text(x0 + 1, y0 + 2.06, f"Tile {tile}: {name.split(',')[0]}", ha="center", va="bottom", fontsize=6, color=INK)
        for p, f in zip(xy, pts):
            if f["properties"]["role"] == "showcase":
                ax.scatter(*p, s=46, marker="*", facecolors="none", ec=INK, lw=0.6, zorder=4)
                ax.annotate("Krangkeng", p, xytext=(7, 3), textcoords="offset points",
                            fontsize=6, ha="left", va="center", color=INK)
    ax.set(xlim=(107.9, 114.1), ylim=(-8.1, -5.72), aspect="equal", xlabel="Longitude (°E)", ylabel="Latitude (°)")
    ax.tick_params(labelsize=6.5)
    save(fig, out, "ml-fig-area")


def gap_figure(ci, analyses, out):
    """Radar minus baseline absolute error per natural-gap bin (reviewer notebooks 05 and 06; NOCB from
    revision_analyses.py) with block-bootstrap 95 % intervals, each bin placed at its mean gap length, the isotonic fit
    of Random Forest, and the gap lengths where Matani shows an estimate. Below zero, radar is more accurate."""
    rf_x = lambda table: {b: v["gap_mean"] for b, v in table.items()}
    ci_bins = lambda base, model: {v["bin"]: v for k, v in ci["gap_bins"].items() if k.startswith(f"{base} {model} ") and v["bin"] != "all"}
    nocb = analyses["nocb"]
    panels = (
        ("(a) Bracketed gap, vs linear interpolation", "Optical gap bracketing the target (days)", (0, 102), (-0.16, 0.17),
         [("Random Forest", ORANGE, "D", ci_bins("interpolation", "rf"), rf_x(analyses["table_iii"]["interpolation"]), analyses["isotonic_crossover"]["interpolation"]["curve"]),
          ("XGBoost", AQUA, "^", ci_bins("interpolation", "xgb"), rf_x(analyses["table_iii"]["interpolation"]), None)],
         [(MIN_BRACKETED_GAP_DAYS, f"shown ≥{MIN_BRACKETED_GAP_DAYS} d\n(exploratory)")]),
        ("(b) Open gap, vs persistence and NOCB", "Days to the nearest observation", (0, 82), (-0.56, 0.24),
         [("RF vs persistence", ORANGE, "D", ci_bins("locf", "rf"), rf_x(analyses["table_iii"]["locf"]), analyses["isotonic_crossover"]["locf"]["curve"]),
          ("XGB vs persistence", AQUA, "^", ci_bins("locf", "xgb"), rf_x(analyses["table_iii"]["locf"]), None),
          ("RF vs NOCB", BLUE, "s", nocb["bins"], rf_x(nocb["bins"]), nocb["isotonic_crossover"]["curve"])],
         [(MIN_TRAILING_GAP_DAYS, f"shown ≥{MIN_TRAILING_GAP_DAYS} d after last obs."), (MIN_LEADING_GAP_DAYS, f"≥{MIN_LEADING_GAP_DAYS} d before first obs.")]),
    )
    fig, axes = plt.subplots(2, 1, figsize=(3.45, 2.75))
    for ax, (title, xlabel, xlim, ylim, series, cutoffs) in zip(axes, panels):
        ax.set_title(title, loc="left", fontsize=6.6, fontweight="bold", pad=3)
        for k, (start, label) in enumerate(cutoffs):  # display zones: darker where both open-gap rules show estimates
            ax.axvspan(start, xlim[1], color=GREEN_TINT, alpha=0.5 if k == 0 else 0.6, lw=0, zorder=0)
            # later cutoffs stop below the earlier labels so no line runs through text
            ax.axvline(start, ymax=1 if k == 0 else 0.98 - 0.1 * k, color=GREEN_INK, lw=0.6, ls=(0, (2, 1.5)), zorder=1)
            ax.text(start + 1, 0.97 - 0.1 * k, label, transform=ax.get_xaxis_transform(), fontsize=5.6,
                    color=GREEN_INK, va="top", ha="left")
        offsets = np.linspace(-1.2, 1.2, len(series)) if len(series) > 1 else [0]
        for (label, colour, marker, bins, xs, curve), dx in zip(series, offsets):
            keys = sorted(bins, key=lambda b: xs[b])
            x = np.array([xs[b] for b in keys]) + dx
            y = np.array([bins[b]["diff"] for b in keys])
            err = np.array([[bins[b]["diff"] - bins[b]["lo"], bins[b]["hi"] - bins[b]["diff"]] for b in keys]).T
            ax.errorbar(x, y, yerr=err, color=colour, marker=marker, ms=3.2, lw=0, elinewidth=0.8, capsize=0,
                        label=label, mec="white", mew=0.4, zorder=3)
            if curve:
                cx, cy = np.array(curve).T
                ax.plot(cx, cy, color=colour, lw=0.9, zorder=2)
        ax.axhline(0, color=INK, lw=0.6, zorder=1)
        ax.set(xlim=xlim, ylim=ylim, xlabel=xlabel, ylabel="Radar − baseline MAE")
        ax.xaxis.label.set_size(6.6)
        ax.yaxis.label.set_size(6.6)
        ax.tick_params(labelsize=6.2)
        ax.grid(axis="y", lw=0.4, color="#e4e3dd")
        handles, labels = ax.get_legend_handles_labels()
        handles.append(matplotlib.lines.Line2D([], [], color="#6b6b66", lw=0.9))
        labels.append("Isotonic fit (RF)")
        ax.legend(handles, labels, fontsize=5.6, loc="lower left", ncol=2 if len(series) > 2 else 1, handletextpad=0.4,
                  borderaxespad=0.2, columnspacing=0.8,
                  labelspacing=0.25, handlelength=1.4, frameon=True, facecolor="white", edgecolor="none", framealpha=0.92)
    fig.tight_layout(h_pad=0.9)
    save(fig, out, "ml-fig-gap")


def krangkeng_figure(handoff, predictions, analyses, out):
    data = handoff / "data"
    show = next(r["block_id"] for r in read(data / "ml_table.csv") if r["role"] == "showcase")
    obs = [r for r in read(data / "s2-observations.csv") if r["block_id"] == show and r["ndvi"] != ""
           and d(r["date"]).year == 2021]
    clear = [r for r in obs if float(r["valid_frac"]) >= 0.8]
    table = {("ml_table", r["row_id"]): r for r in read(data / "ml_table.csv") if r["role"] == "showcase"}
    table |= {("showcase_apply", r["row_id"]): r for r in read(data / "showcase_apply.csv")}
    est = defaultdict(list)
    for p in read(predictions):
        key = (p["table"], p["row_id"])
        if key in table and (p["model"], p["feature_set"]) == SHOWCASE_MODEL:
            assert p["outer_fold"] == "42", "showcase predicted by a model that saw tile 42"
            est[key].append(float(p["y_pred"]))
    held = sorted((d(table[k]["s2_date"]), np.mean(v), float(table[k]["ndvi"])) for k, v in est.items()
                  if k[0] == "ml_table")
    applied = sorted((d(table[k]["s1_date"]), np.mean(v)) for k, v in est.items() if k[0] == "showcase_apply")
    display = sorted(d(r["date"]) for r in obs if int(r["valid_px"]) >= 9)
    gaps = [(b - a).days for a, b in zip(display, display[1:])]
    g = int(np.argmax(gaps))
    gap = (display[g], display[g + 1], gaps[g])

    # 80% range by estimate value, as Matani draws it (utils/estimate-timeline.ts RANGE_BY_RUN, analyses.json)
    b = analyses["uncertainty"]["per_bin_all_tiles"]
    bins = [(0.3, b["<=0.3"]), (0.5, b["0.3-0.5"]), (0.7, b["0.5-0.7"]), (np.inf, b[">0.7"])]
    q = lambda v: next(qs for up, qs in bins if v <= up)
    lo = [min(1, max(-1, v + q(v)["q10"])) for _, v in applied]
    hi = [min(1, max(-1, v + q(v)["q90"])) for _, v in applied]
    shown = {d(t) for t in app_display(handoff)["shown_dates"]}

    fig, ax = plt.subplots(figsize=(3.45, 2.2))
    ax.axvspan(gap[0], gap[1], color="#efeee8", lw=0, zorder=0)
    ax.text(gap[0] + (gap[1] - gap[0]) / 2, 0.97, f"{gap[2]}-day\noptical gap",
            ha="center", va="top", fontsize=6.3, color="#4a4a46")
    ax.fill_between([a for a, _ in applied], lo, hi, color=ORANGE, alpha=0.13, lw=0, zorder=1, label="80% range of each estimate")
    ax.plot([a for a, _ in applied], [v for _, v in applied], color=ORANGE, lw=0.6, ls=(0, (3, 1.6)), zorder=2)
    ax.scatter([a for a, _ in applied if a not in shown], [v for a, v in applied if a not in shown], s=7, marker="D",
               facecolors="white", edgecolors=ORANGE, linewidths=0.7, zorder=3, label="Model-derived estimate, not shown")
    ax.scatter([a for a, _ in applied if a in shown], [v for a, v in applied if a in shown], s=11, marker="D",
               facecolors=ORANGE, edgecolors="white", linewidths=0.4, zorder=3, label="Model-derived estimate, shown in Matani")
    ax.scatter([d(r["date"]) for r in clear], [float(r["ndvi"]) for r in clear], s=9, c=INK, zorder=4,
               label="Sentinel-2 NDVI")
    for t, p, ref in held:
        ax.plot([t, t], [p, ref], color=ORANGE, lw=0.6, alpha=0.7, zorder=2)
    ax.axhline(0, color="#b5b4ad", lw=0.5)
    ax.set(ylabel="NDVI", ylim=(-0.6, 1.0), xlim=(date(2021, 1, 1), date(2021, 12, 31)))
    ax.xaxis.set_major_formatter(matplotlib.dates.DateFormatter("%b"))
    ax.grid(axis="y", lw=0.4, color="#e4e3dd")
    ax.legend(fontsize=5.8, loc="lower left", ncol=1, handletextpad=0.4, borderaxespad=0.2)
    ax.tick_params(labelsize=6.5)
    save(fig, out, "ml-fig-krangkeng")
    in_gap = [(t, v) for t, v in applied if gap[0] < t < gap[1]]
    steps = [(abs(b[1] - a[1]), (b[0] - a[0]).days) for a, b in zip(in_gap, in_gap[1:])]
    big = max(steps)
    acquisitions = sum(1 for r in read(data / "s2-observations.csv") if r["block_id"] == show and d(r["date"]).year == 2021)
    return {"acquisitions_2021": acquisitions, "display_rule_dates": len(display), "target_v1_dates_2021": len(clear), "held_out_rows": len(held),
            "applied_rows": len(applied), "longest_gap": [str(gap[0]), str(gap[1]), gap[2]],
            "leading_absence_days": (display[0] - date(2021, 1, 1)).days,
            "applied_in_longest_gap": len(in_gap),
            "in_gap_range": [min(v for _, v in in_gap), max(v for _, v in in_gap)],
            "in_gap_max_step": {"change": big[0], "days": big[1]},
            "held_out_mae": float(np.mean([abs(p - r) for _, p, r in held])),
            "held_out": [[str(t), p, r] for t, p, r in held],
            # seed spread of the in-gap estimates only, the ones IV-E discusses (review N40)
            "seed_range_mean": float(np.mean([np.ptp(v) for k, v in est.items() if k[0] == "showcase_apply"
                                              and gap[0] < d(table[k]["s1_date"]) < gap[1]])),
            "seed_range_in_gap_n": sum(1 for k in est if k[0] == "showcase_apply" and gap[0] < d(table[k]["s1_date"]) < gap[1])}


def app_display(handoff, wins_days=3):
    """Which Krangkeng radar estimates Matani shows under its display rules (utils/estimate-timeline.ts): a
    measurement within 3 days wins; a gap bracketed by observations must reach MIN_BRACKETED_GAP_DAYS, an estimate
    before the first observation MIN_LEADING_GAP_DAYS and one after the last MIN_TRAILING_GAP_DAYS."""
    data = handoff / "data"
    show = next(r["block_id"] for r in read(data / "ml_table.csv") if r["role"] == "showcase")
    measured = sorted(d(r["date"]) for r in read(data / "s2-observations.csv")
                      if r["block_id"] == show and r["ndvi"] != "" and int(r["valid_px"]) >= 9 and d(r["date"]).year == 2021)
    radar = sorted(d(r["s1_date"]) for r in read(data / "showcase_apply.csv"))

    def long_enough(t):
        before, after = [m for m in measured if m <= t], [m for m in measured if m >= t]
        if before and after:
            return (after[0] - before[-1]).days >= MIN_BRACKETED_GAP_DAYS
        if not before and not after:
            return False  # no qualifying observation: no established interval, nothing shown (as in the app)
        return (after[0] - t).days >= MIN_LEADING_GAP_DAYS if after else (t - before[-1]).days >= MIN_TRAILING_GAP_DAYS

    near = [t for t in radar if any(abs((m - t).days) <= wins_days for m in measured)]
    shown = [t for t in radar if t not in near and long_enough(t)]
    return {"radar_passes": len(radar), "near_measurement": len(near), "short_gap": len(radar) - len(near) - len(shown),
            "shown": len(shown), "shown_before_first": sum(t < measured[0] for t in shown),
            "shown_after_last": sum(t > measured[-1] for t in shown),
            "shown_bracketed": sum(measured[0] < t < measured[-1] for t in shown),
            "shown_dates": [str(t) for t in shown], "first_measured": str(measured[0]) if measured else None,
            "last_measured": str(measured[-1]) if measured else None}


def reviewer(pipelines):
    """The reviewer's parquet results (seed means over five seeds), summarised for quoting."""
    r = lambda path: pl.read_parquet(pipelines / path)
    mean_over_seeds = lambda df, keys, cols: {
        " ".join(str(v) for v in k): {c: row[c] for c in cols + ["rowCount"]}
        for k, row in ((tuple(row[key] for key in keys), row)
                       for row in df.group_by(keys).agg([pl.col(c).mean() for c in cols] + [pl.col("rowCount").first()]).iter_rows(named=True))}
    primary = pl.col("featureSet") == "F0+F1"
    metrics = r("primary/output/evaluationMetrics.parquet")
    ev = r("dataprep/output/evaluationRows.parquet")
    gaps = r("dataprep/output/opticalGapCases.parquet")
    split = r("optional/output/splitStrategyComparison.parquet")
    tuning = r("primary/output/tuningResults.parquet").filter(pl.col("chosen"), primary)
    return {
        "pooled": mean_over_seeds(metrics.filter(aggregation="pooled"), ["model", "featureSet"], ["mae", "rmse", "r2", "bias"]),
        "region": mean_over_seeds(r("robustness/output/heldOutRegionPerformance.parquet").filter(primary), ["tile", "model"], ["mae", "rmse", "r2", "bias"]),
        "ndvi_range": mean_over_seeds(r("robustness/output/errorByNdviRange.parquet").filter(primary), ["ndviRange", "model"], ["mae", "bias", "minimumNdvi", "maximumNdvi"]),
        "offset": mean_over_seeds(r("robustness/output/errorBySensorOffset.parquet").filter(primary), ["absOffsetRange", "offsetDirection", "model"], ["mae", "bias"]),
        "flagged": mean_over_seeds(r("robustness/output/flaggedObservationSensitivity.parquet").filter(primary), ["sensitivitySet", "model"], ["mae", "rmse", "bias"]),
        "flag_counts": {c: int(ev.get_column(c).sum()) for c in ("flagHighNdvi", "flagNegativeNdvi", "flagBrightVv", "flaggedObservation")},
        "split": {k[0]: {"mae": float(g.get_column("mae").mean()), "rmse": float(g.get_column("rmse").mean()),
                         "r2": float(g.get_column("r2").mean()), "seeds": g.height, "rows": int(g.get_column("rowCount")[0])}
                  for k, g in split.partition_by("splitScheme", as_dict=True).items()},
        "evaluable": {"interpolation": int(gaps.get_column("interpolationEvaluable").sum()),
                      "locf": int(gaps.get_column("locfEvaluable").sum()), "rows": gaps.height},
        "showcase": showcase(ev, gaps, r("primary/output/modelPredictions.parquet")),
        "chosen_f0f1": {f"{row['model']} fold {row['outerFold']}": {"parameters": json.loads(row["parameters"]),
                        "inner_mae": row["innerMae"], "trees": row["treeCount"]} for row in tuning.iter_rows(named=True)},
    }


def showcase(ev, gaps, preds):
    """Krangkeng showcase rows: RF F0+F1 (seed mean per row) against interpolation and LOCF where available."""
    rows = ev.filter(role="showcase").select("rowId", "ndvi")
    est = (preds.filter(sourceTable="mlTable", model=SHOWCASE_MODEL[0], featureSet=SHOWCASE_MODEL[1])
           .group_by("rowId").agg(pl.col("prediction").mean()))
    j = rows.join(est, on="rowId").join(gaps.select("rowId", "interpolationNdvi", "locfNdvi", "interpolationEvaluable", "locfEvaluable"), on="rowId")
    mae = lambda df, col: float((df.get_column(col) - df.get_column("ndvi")).abs().mean())
    i, l = j.filter("interpolationEvaluable"), j.filter("locfEvaluable")
    return {"rows": j.height, "radar_mae": mae(j, "prediction"),
            "interpolation_rows": i.height, "radar_mae_interp_rows": mae(i, "prediction"), "interpolation_mae": mae(i, "interpolationNdvi"),
            "locf_rows": l.height, "radar_mae_locf_rows": mae(l, "prediction"), "locf_mae": mae(l, "locfNdvi")}


def numbers(handoff, pipelines, ci):
    data = handoff / "data"
    matched = read(data / "matched.csv")
    inv = defaultdict(Counter)
    for r in matched:
        c = inv[r["tile"]]
        c["acquisitions"] += 1
        c["target_pass"] += r["target_v1_pass"] == "true"
        c["display_pass"] += r["display_rule_pass"] == "true"
        c["ml_rows"] += r["target_v1_pass"] == "true" and r["match_status"] == "matched"
    ml = read(data / "ml_table.csv")
    months = Counter(d(r["s2_date"]).month for r in ml)
    return {
        "sources": {"handoff": str(handoff), "pipelines": str(pipelines), "ci": str(ci)},
        "inventory": {t: dict(c) for t, c in sorted(inv.items())} | {"total": dict(sum(inv.values(), Counter()))},
        "ml_rows": len(ml), "pool_rows": sum(r["role"] == "pool" for r in ml),
        "blocks": len({r["block_id"] for r in matched}), "windows": len({r["window"] for r in matched}),
        "rows_by_month": dict(sorted(months.items())),
        "rows_nov_apr": sum(v for k, v in months.items() if k in (11, 12, 1, 2, 3, 4)),
        "orbit_counts": dict(Counter(r["orbit_direction"] for r in ml)),
        "median_abs_offset_days": float(np.median([abs(float(r["offset_days"])) for r in ml])),
        "ndvi_range": [min(float(r["ndvi"]) for r in ml), max(float(r["ndvi"]) for r in ml)],
        "radar_after_optical": sum(float(r["offset_days"]) > 0 for r in ml),
        "rows_per_pool_block": dict(Counter(r["block_id"] for r in ml if r["role"] == "pool")),
        "reviewer": reviewer(pipelines),
        "ci": json.loads((ci / "ci.json").read_text()),
        "app_display": app_display(handoff),
    }


def main():
    parser = argparse.ArgumentParser()
    for name in ("handoff", "pipelines", "ci", "analyses", "out"):
        parser.add_argument(f"--{name}", required=True, type=Path)
    a = parser.parse_args()
    analyses = json.loads(a.analyses.read_text())
    area_figure(json.loads((a.handoff / "data/blocks.geojson").read_text())["features"], a.out)
    result = numbers(a.handoff, a.pipelines, a.ci)
    gap_figure(result["ci"], analyses, a.out)
    result["krangkeng"] = krangkeng_figure(a.handoff, a.ci / "predictions.csv", analyses, a.out)
    (a.out / "ml-paper-numbers.json").write_text(json.dumps(result, indent=1, default=str))
    print(json.dumps(result["app_display"], indent=1))
    print(json.dumps({k: v for k, v in result["krangkeng"].items() if k != "held_out"}, indent=1))


if __name__ == "__main__":
    main()
