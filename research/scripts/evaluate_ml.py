"""Scores Sentinel-1 → NDVI predictions against baselines (docs/matani-ml-technical-spec.md §7.1, §8, §9).

    python3 research/scripts/evaluate_ml.py \
        --handoff research/private/ml-dataset/ml-dataset-v2 \
        --predictions research/private/ml-dataset/team-run-v2-final/predictions.csv \
        --out research/private/ml-dataset/<new-evaluation-dir>

Normally run through research/scripts/rebuild-ml-paper.sh, which first checks the run binding.

Standard library + numpy. Refuses to overwrite. Every §9 check that can run here is an assert.
B3 (calendar-only RF) is the `rf F2` run in the predictions file (DEC-57), so it has no code here.
"""

import argparse
import csv
import hashlib
import json
from collections import defaultdict
from datetime import date
from pathlib import Path

import numpy as np

GAPS = (0, 10, 20, 30, 60)  # hidden window L in days; 0 = hide the target date only (natural gaps), HYP
BIN_EDGES = (0, 10, 20, 30, 45, 60, 90)  # effective-gap bin lower edges in days, HYP
MAPE_MIN_NDVI = 0.2  # HYP, spec §8.1
RESAMPLES = 2000
RNG_SEED = 20260926
MODELS = ("rf", "xgb")
FEATURE_SETS = ("F0", "F0+F1", "F0+F1+F2", "F2")
PRIMARY = "F0+F1"


def read(path):
    with open(path, newline="") as handle:
        return list(csv.DictReader(handle))


def write(path, rows, columns):
    with open(path, "x", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def day(value):
    return date.fromisoformat(value[:10]).toordinal()


def bracket(series, t, gap):
    """Last and first retained (day, ndvi) outside [t - gap/2, t + gap/2]. The target date is always hidden."""
    half = gap / 2
    before = [obs for obs in series if obs[0] < t - half]
    after = [obs for obs in series if obs[0] > t + half]
    prev, nxt = (before[-1] if before else None), (after[0] if after else None)
    assert all(abs(obs[0] - t) > half and obs[0] != t for obs in (prev, nxt) if obs), "§9.5 hidden observation used"
    return prev, nxt


def interpolate(prev, nxt, t):
    if not (prev and nxt):
        return None
    return prev[1] + (nxt[1] - prev[1]) * (t - prev[0]) / (nxt[0] - prev[0])


def bin_of(gap):
    return max(edge for edge in BIN_EDGES if gap >= edge)


class BlockBootstrap:
    """Cluster bootstrap over blocks, resampled within each tile and pooled across tiles (spec §8.4)."""

    def __init__(self, tile_of_block, resamples=RESAMPLES, seed=RNG_SEED):
        rng = np.random.default_rng(seed)
        blocks = sorted(tile_of_block)
        self.index = {block: i for i, block in enumerate(blocks)}
        self.weights = np.zeros((resamples, len(blocks)))
        for tile in sorted(set(tile_of_block.values())):
            members = [self.index[b] for b in blocks if tile_of_block[b] == tile]
            draws = rng.integers(0, len(members), (resamples, len(members)))
            for r in range(resamples):
                self.weights[r, members] = np.bincount(draws[r], minlength=len(members))

    def ci(self, blocks, values):
        """95 % percentile interval of the mean of `values`, resampling their blocks."""
        idx = np.array([self.index[b] for b in blocks])
        sums, counts = np.zeros(self.weights.shape[1]), np.zeros(self.weights.shape[1])
        np.add.at(sums, idx, values)
        np.add.at(counts, idx, 1)
        with np.errstate(invalid="ignore", divide="ignore"):
            means = (self.weights @ sums) / (self.weights @ counts)
        low, high = np.nanpercentile(means, [2.5, 97.5])
        return float(low), float(high)


def scores(truth, pred, blocks, boot):
    err = pred - truth
    mape_rows = truth >= MAPE_MIN_NDVI
    sst = float(np.sum((truth - truth.mean()) ** 2))
    row = {
        "n_rows": len(truth), "n_blocks": len(set(blocks)),
        "mae": float(np.mean(np.abs(err))), "rmse": float(np.sqrt(np.mean(err ** 2))), "bias": float(np.mean(err)),
        "mape": float(np.mean(np.abs(err[mape_rows]) / truth[mape_rows]) * 100) if mape_rows.any() else None,
        "mape_n_excluded": int((~mape_rows).sum()),
        "r2": 1 - float(np.sum(err ** 2)) / sst if sst else None,
    }
    if boot:
        row["mae_lo"], row["mae_hi"] = boot.ci(blocks, np.abs(err))
        row["rmse_lo"], row["rmse_hi"] = (float(np.sqrt(v)) for v in boot.ci(blocks, err ** 2))
    return row


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--handoff", required=True, type=Path)
    parser.add_argument("--predictions", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    data = args.handoff / "data"

    # §9.6: inputs are the frozen handoff files
    manifest = json.loads((args.handoff / "MANIFEST.json").read_text())
    for name, digest in manifest["sha256"].items():
        if name.startswith("data/"):
            assert sha256(args.handoff / name) == digest, f"§9.6 {name} differs from MANIFEST"

    features = json.loads((data / "features.json").read_text())
    assert not any("ndvi" in c or "ndmi" in c for group in features.values() for c in group), "§9.4 optical feature"
    table = read(data / "ml_table.csv")
    rows = {int(r["row_id"]): r for r in table}
    pool = [r for r in table if r["role"] == "pool"]
    tile_of_block = {r["block_id"]: r["tile"] for r in pool}

    series = defaultdict(list)  # every target-quality optical observation, matched to radar or not
    for r in read(data / "matched.csv"):
        if r["target_v1_pass"] == "true":
            series[r["block_id"]].append((day(r["s2_date"]), float(r["ndvi"])))
    for block, obs in series.items():
        obs.sort()
        assert len({d for d, _ in obs}) == len(obs), f"duplicate optical date in {block}"

    # Reviewer predictions: one per row × model × feature set × seed, predicted by the fold of the row's tile (§9.7)
    preds = defaultdict(dict)
    for p in read(args.predictions):
        if p["table"] != "ml_table":
            continue
        row = rows[int(p["row_id"])]
        assert p["outer_fold"] == row["tile"], f"§9.7 row {p['row_id']} predicted by a fold that saw its tile"
        seeds = preds[(int(p["row_id"]), p["model"], p["feature_set"])]
        assert p["seed"] not in seeds, f"duplicate prediction {p['row_id']} {p['model']} {p['feature_set']} {p['seed']}"
        seeds[p["seed"]] = float(p["y_pred"])
    methods = [f"{m} {fs}" for m in MODELS for fs in FEATURE_SETS]
    ml = {}
    for r in table:
        key = int(r["row_id"])
        for m in MODELS:
            for fs in FEATURE_SETS:
                seeds = preds.get((key, m, fs))
                assert seeds, f"missing prediction for row {key} {m} {fs}"
                ml[(key, f"{m} {fs}")] = float(np.mean(list(seeds.values())))

    # B4: linear regression on F0, leave-one-tile-out, pool rows only (§9.1, §9.2)
    b4 = {}
    for tile in sorted({r["tile"] for r in table}):
        train = [r for r in pool if r["tile"] != tile]
        test = [r for r in table if r["tile"] == tile]
        assert not {r["block_id"] for r in train} & {r["block_id"] for r in test}, "§9.1 block in train and test"
        assert all(r["role"] == "pool" for r in train), "§9.2 showcase row in training"
        x = lambda rs: np.column_stack([np.ones(len(rs))] + [[float(r[c]) for r in rs] for c in features["F0"]])
        coef, *_ = np.linalg.lstsq(x(train), np.array([float(r["ndvi"]) for r in train]), rcond=None)
        b4.update({int(r["row_id"]): float(v) for r, v in zip(test, x(test) @ coef)})

    boot = BlockBootstrap(tile_of_block)
    args.out.mkdir(parents=True)  # raises if it exists

    # Method table at natural gaps (L = 0), on rows where every method is available
    natural = []
    for r in table:
        t, key = day(r["s2_date"]), int(r["row_id"])
        prev, nxt = bracket(series[r["block_id"]], t, 0)
        natural.append({"row_id": key, "block_id": r["block_id"], "tile": r["tile"], "role": r["role"],
                        "ndvi": float(r["ndvi"]), "offset_days": float(r["offset_days"]),
                        "B1": prev[1] if prev else None, "B2": interpolate(prev, nxt, t), "B4": b4[key]})
    write(args.out / "baseline_predictions.csv", natural, list(natural[0]))
    common = [r for r in natural if r["role"] == "pool" and r["B1"] is not None and r["B2"] is not None]
    cuts = np.quantile([r["ndvi"] for r in common], [1 / 3, 2 / 3])
    subsets = {"pooled": common}
    for tile in sorted(set(tile_of_block.values())):
        subsets[f"tile {tile}"] = [r for r in common if r["tile"] == tile]
    for i, name in enumerate(("low", "mid", "high")):
        low, high = ([-np.inf, *cuts, np.inf])[i:i + 2]
        subsets[f"ndvi tercile {name}"] = [r for r in common if low <= r["ndvi"] < high]
    subsets["|offset| <= 1 d"] = [r for r in common if abs(r["offset_days"]) <= 1]
    subsets["|offset| > 1 d"] = [r for r in common if abs(r["offset_days"]) > 1]

    value = lambda r, method: r[method] if method in ("B1", "B2", "B4") else ml[(r["row_id"], method)]
    metric_rows = []
    for subset, members in subsets.items():
        truth, blocks = np.array([r["ndvi"] for r in members]), [r["block_id"] for r in members]
        for method in ("B1", "B2", "B4", *methods):
            pred = np.array([value(r, method) for r in members])
            metric_rows.append({"subset": subset, "method": method, **scores(truth, pred, blocks, boot)})
    showcase = [r for r in natural if r["role"] == "showcase" and r["B1"] is not None and r["B2"] is not None]
    for method in ("B1", "B2", "B4", *methods):  # one block: no interval
        metric_rows.append({"subset": "showcase (Krangkeng)", "method": method, **scores(
            np.array([r["ndvi"] for r in showcase]), np.array([value(r, method) for r in showcase]), [], None)})
    availability = {m: sum(r[m] is not None for r in natural if r["role"] == "pool") for m in ("B1", "B2")}
    write(args.out / "metrics.csv", metric_rows, ["subset", "method", "n_rows", "n_blocks", "mae", "mae_lo", "mae_hi",
          "rmse", "rmse_lo", "rmse_hi", "mape", "mape_n_excluded", "bias", "r2"])

    # Gap experiment (§8.3): one event per distinct bracketing pair; radar predictions need no retraining
    events, seen, gap_availability = [], set(), []
    for L in GAPS:
        counts = {"L_days": L, "events": 0, "b1_available": 0, "b2_available": 0}
        for r in pool:
            t = day(r["s2_date"])
            prev, nxt = bracket(series[r["block_id"]], t, L)
            counts["events"] += 1
            counts["b1_available"] += prev is not None
            counts["b2_available"] += prev is not None and nxt is not None
            if not (prev and nxt):
                continue
            gap = nxt[0] - prev[0]
            key = (r["block_id"], t, bin_of(gap))  # a date counts once per bin, at its smallest L
            if key in seen:
                continue
            seen.add(key)
            events.append({"row_id": int(r["row_id"]), "block_id": r["block_id"], "tile": r["tile"], "L_days": L,
                           "effective_gap_days": gap, "bin": bin_of(gap), "ndvi": float(r["ndvi"]),
                           "B1": prev[1], "B2": interpolate(prev, nxt, t), "B4": b4[int(r["row_id"])],
                           **{m: ml[(int(r["row_id"]), m)] for m in methods}})
        gap_availability.append(counts)
    write(args.out / "gap_events.csv", events, list(events[0]))
    write(args.out / "gap_availability.csv", gap_availability, list(gap_availability[0]))

    summary_rows, crossover = [], {}
    for edge in BIN_EDGES:
        members = [e for e in events if e["bin"] == edge]
        if not members:
            continue
        truth, blocks = np.array([e["ndvi"] for e in members]), [e["block_id"] for e in members]
        b2_err = np.abs(np.array([e["B2"] for e in members]) - truth)
        for method in ("B1", "B2", "B4", *methods):
            err = np.abs(np.array([e[method] for e in members]) - truth)
            lo, hi = boot.ci(blocks, err)
            row = {"bin_days": edge, "method": method, "n_events": len(members), "n_blocks": len(set(blocks)),
                   "mae": float(err.mean()), "mae_lo": lo, "mae_hi": hi}
            if method != "B2":  # paired per-event difference: negative = better than interpolation
                row["diff_vs_b2"] = float((err - b2_err).mean())
                row["diff_lo"], row["diff_hi"] = boot.ci(blocks, err - b2_err)
                if method in methods and row["diff_hi"] < 0:
                    crossover.setdefault(method, edge)
            summary_rows.append(row)
    write(args.out / "gap_summary.csv", summary_rows,
          ["bin_days", "method", "n_events", "n_blocks", "mae", "mae_lo", "mae_hi", "diff_vs_b2", "diff_lo", "diff_hi"])

    summary = {
        "inputs": {"handoff_version": manifest["version"], "predictions_sha256": sha256(args.predictions)},
        "settings": {"gaps_days": GAPS, "bin_edges_days": BIN_EDGES, "mape_min_ndvi": MAPE_MIN_NDVI,
                     "resamples": RESAMPLES, "rng_seed": RNG_SEED, "primary_feature_set": PRIMARY},
        "natural_gap_rows": {"pool": len(pool), "common_subset": len(common), "available": availability},
        "crossover_bin_days": {m: crossover.get(m) for m in methods},
        "checks_passed": ["§9.1", "§9.2", "§9.4", "§9.5", "§9.6", "§9.7"],
        "checks_elsewhere": {"§9.3": "tests/s1-extraction.test.mjs", "§9.1 inner folds": "reviewer harness"},
    }
    (args.out / "summary.json").write_text(json.dumps(summary, indent=1))
    print(json.dumps({"crossover_bin_days": summary["crossover_bin_days"], **summary["natural_gap_rows"]}, indent=1))


if __name__ == "__main__":
    main()
