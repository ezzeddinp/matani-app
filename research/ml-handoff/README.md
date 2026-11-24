# Matani ML dataset {{DATASET_VERSION}}: estimating NDVI from Sentinel-1 radar

This folder holds everything needed to train and evaluate the Matani NDVI-estimation models for the AGERS 2026 paper. Please read sections 1–6 before training. The rules in section 5 decide whether the results can be published.

Dataset version: `{{DATASET_VERSION}}` · built {{BUILT_AT}} · file hashes are in `MANIFEST.json`.

---

## 1. What this is for

**Matani** is a mobile app that shows rice farmers a dated NDVI time series (a greenness index from the Sentinel-2 optical satellite) for their field. Clouds block Sentinel-2. For one studied rice block in Indramayu in 2021, only **23 of 365 days** had a usable NDVI value, and one gap lasted **65 days**, in the rainy season when farmers most need information.

**Sentinel-1** is a radar satellite that sees through clouds. Rice changes the radar signal as it grows: flooded fields at transplanting look dark (low VH), growing canopies look brighter, and harvest drops it again.

**The question for the paper:** how accurately can a model estimate NDVI from radar alone over rice fields it has never seen? And after how many days without an optical observation does the radar estimate beat simply interpolating between the nearest optical observations?

Your models answer the first part. The gap comparison and the paper figures are computed afterwards from your per-row predictions (section 6).

This is an **evaluation study**, not a new algorithm. Random Forest and XGBoost are the planned models, and an honest "radar does not beat interpolation" is still a publishable result.

---

## 2. The prediction task

```
INPUT  (one rice block on one date)                         OUTPUT
Sentinel-1 radar features ──► model (RF or XGBoost) ──►    ndvi  (block-mean NDVI, −1..1)
  measured on that pass + earlier passes                   that Sentinel-2 would have seen
```

- **Unit:** one rice block (6 × 6 cells of 10 m ≈ 60 × 60 m ≈ 0.36 ha) on one date.
- **Target `ndvi`:** the mean NDVI over the block from a clear Sentinel-2 image. Only dates where **≥ 80 % of the block's 36 pixels** were cloud-free are used. Rice NDVI typically ranges from about 0.1 (flooded, just planted) to about 0.85 (full canopy).
- **Matching:** each target date is paired with the **nearest Sentinel-1 pass within ±3 days**, from either orbit direction. `offset_days` is radar time minus optical time.
- **Inputs:** radar only. **No optical value is ever an input.** That keeps the model usable during cloudy periods, and it means the target can't leak into the inputs.

### Example row (from `data/ml_table.csv`)

```
block_id=open-sea-2021-tile-49-r…  tile=49  window=49:11132_16698  s2_date=2021-07-18
vv_db=-9.8  vh_db=-16.9  vh_minus_vv_db=-7.1  inc_angle=37.8  orbit_asc=0
vh_db_prev1=-18.4  vh_db_prev2=-22.7  dvh_1=1.5  vh_db_min_60d=-22.7  days_since_vh_min_60d=24
doy_sin=-0.36  doy_cos=-0.93                           → ndvi=0.74
```
(These numbers are illustrative; real values are in the file.)

---

## 3. Files

| File | What it is |
|---|---|
| `data/ml_table.csv` | **The training/evaluation table.** One row per block × clear date with a matched radar pass. {{N_ROWS}} rows from {{N_BLOCKS}} blocks. |
| `data/showcase_apply.csv` | {{N_APPLY}} rows for the **showcase block** (Krangkeng), one per 2021 radar pass. There is **no target**: predict these to fill the app's gaps (section 5.4). |
| `data/features.json` | The feature groups F0, F1 and F2 (section 4). |
| `data/splits-v1.csv` | `block_id, tile, window, role` for every block. **Fixed; do not change.** |
| `data/blocks.geojson` | Block polygons (EPSG:4326) with the same properties. |
| `data/matched.csv` | Every Sentinel-2 acquisition, including cloudy and unmatched ones (the inventory). Not for training. |
| `data/s1-observations.csv`, `data/s2-observations.csv` | The full radar and optical series per block, for context and plots. |
| `example_train.py` | A reference harness that follows every rule below. Use it as-is or as a template. |
| `check_predictions.py` | Validates your `predictions.csv` before you send it back. |
| `predictions_template.csv` | The required output format. |
| `MANIFEST.json` | Counts, extraction settings, and a SHA-256 hash for every file. |

### Rows per tile

{{TILE_TABLE}}

---

## 4. Features (all radar or calendar; dB = decibels)

| Group | Column | Meaning |
|---|---|---|
| **F0** radar now | `vv_db` | VV backscatter on the matched pass (block mean computed in linear power, then converted to dB) |
| | `vh_db` | VH backscatter; the most rice-sensitive channel |
| | `vh_minus_vv_db` | VH − VV in dB (the log of the cross-ratio) |
| | `inc_angle` | Local incidence angle (degrees) |
| | `orbit_asc` | 1 = ascending pass (~11:00 UTC), 0 = descending (~22:00 UTC) |
| **F1** radar history | `vh_db_prev1`, `vh_db_prev2` | VH on the previous 1st/2nd pass of the **same relative orbit (track)**, usually ~12 and ~24 days earlier |
| | `dvh_1` | `vh_db − vh_db_prev1` (growth trend) |
| | `vh_db_min_60d` | Lowest VH in the last 60 days on the same track, including the current pass (intended to capture flooding before transplanting) |
| | `days_since_vh_min_60d` | Days since that minimum (a rough "time since planting") |
| **F2** calendar | `doy_sin`, `doy_cos` | Day of year on the unit circle |

- **History is past-only.** Each value uses only passes at or before the matched pass. Radar data from Oct–Dec 2020 is included so that January 2021 rows have history.
- **F1 can be empty (NaN)** early in a series. XGBoost handles NaN natively, and scikit-learn ≥ 1.4 Random Forest does too. **Do not drop these rows or impute with statistics computed over the whole table.**

### Feature-set runs (all four, for both models)

| Name | Columns | Why |
|---|---|---|
| `F0` | F0 | Same-date radar only (the classic setup) |
| `F0+F1` | F0 + F1 | **Primary model**: radar plus history, to separate growth from ripening |
| `F0+F1+F2` | F0 + F1 + F2 | Adds seasonal timing |
| `F2` | F2 | **Calendar-only baseline**. If radar doesn't beat this, radar isn't adding information. |

---

## 5. Rules (these make the result valid)

### 5.1 Spatial evaluation: leave one tile out
There are 3 tiles, each a separate ~2° region of northern Java (tile 42 includes Indramayu, 49 includes Pati, 55 includes Gresik; windows inside a tile are up to ~110 km apart).

For each tile T:
- **Train** on the `role = pool` rows of the other two tiles.
- **Test** on all rows of tile T.

Every test prediction then comes from a model that never saw that region. This is the claim of the paper: transfer to unseen places within 2021.

**Never use random k-fold or random row splits.** Neighbouring blocks and the same dates are strongly correlated, so random splits give inflated scores that reviewers will reject.

### 5.2 Tuning: inside the training tiles only
- Choose hyperparameters with `GroupKFold` grouped by `window`, a cluster of blocks within about 2.5 km, using the two training tiles only.
- **At most 30 configurations per model per feature set.**
- XGBoost early stopping may only use the inner validation fold.
- The test tile is predicted **once**, with the chosen configuration refit on all training rows.

### 5.3 Same conditions for both models
Random Forest and XGBoost use identical rows, features and splits, and the same ceiling of 30 configurations. The reference grids use 18 (RF) and 12 (XGBoost), tuned with seed 0. Report both even if one is clearly better or they are equal. Return `env.txt` unchanged: it records the SHA-256 of the data files you trained on and of `predictions.csv`, and results without it are rejected.

### 5.4 The showcase block (Krangkeng)
- Rows with `role = showcase` (tile 42) are **never used for training or tuning**.
- They are predicted only by the model trained for the **tile-42 test fold**, for:
  - its `ml_table` rows (held-out test with known NDVI), and
  - **all** `showcase_apply` rows (the gap-filling estimates shown in the app).

### 5.5 Seeds and freezing
- Refit the chosen configuration with seeds **0–4** and return all five predictions per row.
- Once the test predictions exist, don't go back and change features, configurations or rows to improve them.
- If you find a real bug, fix it, rerun everything, and note it in `configs.json`.

### 5.6 Please don't
- Add optical, NDVI-derived or target-derived columns as features.
- Drop blocks, dates or tiles because they predict badly.
- Normalise or impute using statistics from test rows.
- Report pixel counts as sample size: the independent units are blocks and windows, not pixels.

---

## 6. What to send back

1. **`predictions.csv`**, in the format of `predictions_template.csv`:

   | column | values |
   |---|---|
   | `row_id` | `row_id` from the table named in `table` |
   | `table` | `ml_table` or `showcase_apply` |
   | `model` | `rf` or `xgb` |
   | `feature_set` | `F0`, `F0+F1`, `F0+F1+F2`, `F2` |
   | `outer_fold` | the held-out tile (`42`, `49`, `55`) |
   | `seed` | 0–4 |
   | `y_pred` | predicted NDVI |

   Include **every** `ml_table` row once per model × feature set × seed, and every `showcase_apply` row, predicted by the tile-42 fold.
2. **`configs.json`**: per model × feature set × outer fold, the full search grid, inner-CV mean MAE per configuration, the chosen configuration, and (for XGBoost) the number of trees used.
3. **`env.txt`**: Python, numpy, pandas, scikit-learn and xgboost versions, plus hardware.

Run `python check_predictions.py predictions.csv` before sending; it must print `OK`.

**Not needed from you:** metrics tables, confidence intervals, the gap-length experiment and figures. These are computed from `predictions.csv` so every number in the paper traces back to one file. If you want to share your own diagnostics (feature importance, residual plots), they're welcome as extras.

### 6.1 How your predictions reach the app (API)

`predictions.csv` is the only interface. You don't call any API; the developer imports the file:

```
predictions.csv
  → research/scripts/import-ndvi-estimates.mjs   validates rows, averages the 5 seeds,
                                                 skips dates with a real measurement within ±3 days
  → Supabase RPC import_ndvi_estimates(p_lahan_id, p_rows)   service role only
  → table ndvi_estimates                                     owner-only read (RLS)
  → Matani field chart                                       dashed diamond = "estimated"
```

Only **showcase-block** rows go to the app. Pool-block rows are for the paper. One model × feature set is imported, chosen after evaluation.

| `predictions.csv` | `ndvi_estimates` column |
|---|---|
| `model` `rf` / `xgb` | `model_name` `random_forest` / `xgboost` |
| mean of `y_pred` over seeds 0–4 | `ndvi_estimate` |
| `table = showcase_apply` | `evaluation_role = applied`; `target_date` = radar date |
| `table = ml_table` (showcase rows) | `evaluation_role = held_out_test`; `target_date` = optical date; `reference_ndvi` = the real NDVI |
| `feature_set`, `outer_fold`, seeds, `row_id` | `feature_set`, `provenance` |

One row as the API receives it:

```json
{
  "target_date": "2021-02-14", "ndvi_estimate": 0.41, "status": "estimated",
  "radar_acquired_at": "2021-02-14T22:25:40.000Z", "radar_product_ids": ["S1A_IW_GRDH_…"],
  "orbit_direction": "DESCENDING", "offset_days": 0,
  "model_name": "random_forest", "model_version": "rf-v1", "feature_set": "F0+F1",
  "dataset_version": "{{DATASET_VERSION}}", "run_id": "reviewer-2026-09-28",
  "evaluation_role": "applied", "reference_ndvi": null, "model_test_mae": 0.07,
  "provenance": { "source_row_table": "showcase_apply", "source_row_id": "12", "outer_fold": "42", "seeds": [0, 1, 2, 3, 4] }
}
```
(Values are illustrative.)

This is a batch import for the 2021 study. There is no live inference endpoint: a new radar pass isn't turned into an estimate automatically.

---

## 7. Quick start

```sh
python -m venv .venv && source .venv/bin/activate
pip install "pandas>=2" "scikit-learn>=1.4" "xgboost>=2"
python example_train.py            # writes predictions.csv, configs.json, env.txt
python check_predictions.py predictions.csv
```

On macOS, XGBoost needs the OpenMP runtime: `brew install libomp`. Without it, `import xgboost` fails with "libomp.dylib not loaded". The whole harness runs in about 3 minutes on a laptop.

`example_train.py` implements sections 5.1–5.5 with a small grid (under 30 configurations per model). Feel free to change the search space within the budget, or replace the harness entirely, as long as the rules hold.

---

## 8. How the data was made (for the methods section)

- **Blocks:** Open-SEA-Rice-10 (2021 rice map, 10 m, CC-BY-4.0). 14 windows (~2.5 km squares) across 3 Java tiles; 3 blocks spread evenly through each window's list of fully-rice 6 × 6 blocks. The rule was fixed before any satellite value was read. The Krangkeng block from the earlier study is the showcase.
- **Sentinel-2 target:** Copernicus Data Space Ecosystem, L2A, B04/B08 at 10 m. Pixels with SCL classes 0, 1, 3, 8, 9, 10 are masked (water, class 6, is kept because flooded paddies are real). Block mean over valid pixels.
- **Sentinel-1 inputs:** Copernicus GRD, IW mode, VV+VH. Terrain-flattened gamma0 (`GAMMA0_TERRAIN`) with the Copernicus 30 m DEM, orthorectified, no speckle filter (the 36-pixel block mean does the smoothing). Radar-shadow pixels are excluded. Averaged in linear power, then converted to dB.
- The extraction reproduced the earlier study exactly: the same 71 acquisitions and the same 23 clear dates for Krangkeng, with NDVI matching to 5 × 10⁻⁵.

---

## 9. Known limitations (these will be stated in the paper)

- **Clear-sky bias:** targets only exist on clear days, mostly in the dry season, but the model is meant for cloudy (wet-season) periods.
- **Map circularity:** the rice map itself was built from Sentinel-1 and Sentinel-2 time series, so the blocks are "textbook" rice; fragmented smallholder plots may behave worse.
- **Small evaluation base:** 3 test regions and one year (2021). The claim is within-year transfer to unseen places.
- **The target has its own error:** cloud-mask misses and mixed edge pixels. It is a satellite reference, not field-measured truth.

---

## 10. Known data quirks (kept on purpose)

All rows follow the target rule fixed before extraction, so none were removed after the data was seen. Please don't drop them. They will get a sensitivity analysis in the paper.

- **Implausibly high NDVI:** block `open-sea-2021-tile-55-r11294-c5764` on 2021-03-14 (0.997) and 2021-03-19 (0.978), with uniform values across all 36 pixels. This is probably a red-band artifact.
- **Negative NDVI (−0.26 to −0.53):** late-December rows in window `42:5566_5566`, with VH −22 to −30 dB. These values are consistent with flooded paddies; field state and crop stage were not verified.
- **Very bright VV (> −3 dB):** 4 September–October rows, probably stubble, rough soil or nearby structures after harvest.

## 11. Glossary

- **NDVI:** (NIR − Red)/(NIR + Red), a greenness index; higher means more green canopy.
- **Backscatter (VV, VH):** radar energy returned to the satellite. VV = sent and received vertically; VH = sent vertically, received horizontally (more sensitive to vegetation volume).
- **dB:** 10·log₁₀(linear power). Radar values here are around −30 to −5 dB.
- **Tile / window / block:** Open-SEA-Rice-10 grid tile (~2° region) ⊃ window (~2.5 km cluster) ⊃ block (60 m).
- **Showcase block:** the Krangkeng block Matani displays; never trained on.
