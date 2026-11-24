# Matani ML Technical Specification: Sentinel-1 → NDVI Estimation

**Prepared:** 2026-09-25 (Asia/Jakarta)
**Status:** Implemented specification for the AGERS 2026 submission (updated 2026-09-28). The models are trained by the team (DEC-57), and the official run is `team-run-v2-final` on ml-dataset-v2 (DEC-56). Not advisor-approved. Where this document and the manuscript differ, the implemented code and `docs/manuscripts/ml-paper.md` describe what was done. Thresholds marked HYP are unvalidated starting values. External facts were checked on 2026-09-25 (see §2). The §2.4 literature is registered as EVID-097–108 and OBS-76; the §2.1–2.2 dataset facts still need EVID entries in `.agent/evidence-register.md` before they enter canonical documents.
**Companion documents:** [ML direction brief](matani-ml-direction-agent-brief.md) (rationale), [submission roadmap](matani-ml-submission-roadmap.md) (schedule).
**Roles:** The developer owns sampling, extraction, the matched table, splits, baselines and the paper. The reviewer was to own Random Forest and XGBoost fitting and tuning. From 2026-09-28 the developer trains with the frozen harness (`example_train.py`), and a reviewer run, if any, is a replication check (DEC-57).

---

## 1. Task definition

| Item | Specification |
|---|---|
| Task | Regression: estimate block-mean Sentinel-2 NDVI on a target date from Sentinel-1 backscatter |
| Unit of analysis | One mapped-rice block (6 × 6 Open-SEA-Rice-10 cells, ≈ 60 × 60 m, ≈ 0.36 ha) on one date |
| Target | Block-mean NDVI from quality-passing Sentinel-2 L2A (B04/B08, 10 m) — a sensor-derived reference, not agronomic truth |
| Inputs to ML models | Sentinel-1 only (current and past acquisitions) plus optional calendar terms. **No optical values enter the ML feature set.** |
| Period | Calendar 2021 (matches the rice-map year; DEC pending advisor confirmation) |
| Information setting | Radar features use only passes at or before the matched radar acquisition, which can fall up to 3 days after the optical date (383 of 792 pairs), so an estimate uses information available at the radar pass. Interpolation baselines are retrospective (use both sides) and are labelled as such. |
| Out of scope | NDMI, phenology stages, crop health, disease, yield, farmer benefit, live forecasting |

Why radar-only inputs: this keeps leakage simple to rule out, and hiding optical observations leaves every radar prediction unchanged (error per gap bin can still differ, because each bin holds different targets). The paper's key result is then the gap length beyond which radar beats interpolation (§8.3).

---

## 2. Datasets: verified sources and roles

All entries were checked on 2026-09-25 through the publisher's API or page. "Checked" lists exactly what was verified.

### 2.1 Used in the study

| Dataset | Role | Checked | Licence | Verdict |
|---|---|---|---|---|
| **Sentinel-2 L2A** via CDSE Sentinel Hub (existing pipeline, `research/lib/cdse-pilot.mjs`) | Target NDVI + SCL quality | Already in production use in the study (OBS-69/70) | Copernicus free & open | **Primary** |
| **Sentinel-1 GRD** via CDSE Sentinel Hub, collection `sentinel-1-grd` ([docs](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S1GRD.html)) | Radar features | Bands VV/VH in **linear power**; `localIncidenceAngle`, `shadowMask`, `dataMask` available; `backCoeff` ∈ {BETA0, SIGMA0_ELLIPSOID, GAMMA0_ELLIPSOID (default), GAMMA0_TERRAIN}; `orthorectify` default FALSE; `demInstance` COPERNICUS_30; `speckleFilter` NONE/LEE; dataFilter `acquisitionMode`, `polarization`, `resolution`, `orbitDirection`. Statistical API usage for S1 is shown in [CDSE examples](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Statistical/Examples.html). | Copernicus free & open | **Primary** |
| **Open-SEA-Rice-10** ([Zenodo 14627003](https://zenodo.org/records/14627003), [Sci. Data 12:1408, 2025](https://doi.org/10.1038/s41597-025-05722-1)) | Sampling frame for rice blocks | CC-BY-4.0; 547 MB GeoTIFF zip; 10 m, EPSG:4326, year 2021; rice cropping-intensity values 1/2/3 in the tile rasters used here. Indonesia validation: OA 98.8 %, F1 0.851. The classifier used **2020–2021 monthly S1 VH medians + S2 NDVI max composites + MNDWI**. | CC-BY-4.0 | **Sampling frame** (already used; tiles 42/49/55) |
| **RiceAtlas** ([Harvard Dataverse 10.7910/DVN/JE6R2R](https://doi.org/10.7910/DVN/JE6R2R), [Sci. Data 2017](https://www.nature.com/articles/sdata201774)) | Season definitions (planting/harvest windows) for stratified error reporting only | CC0 1.0; v4.1 released 2024-02-07; `RiceCalendar_v1.zip` (107 MB) | CC0 | **Context only** — never a model feature or target |

### 2.2 Relevant but not used for this deadline

| Dataset | Checked | Why not now |
|---|---|---|
| **SEN12TP** ([Zenodo 7342060](https://zenodo.org/records/7342060)) | CC-BY-4.0; 2,319 scenes / 1,236 ROIs, 2017-03-28 → 2020-12-31; S1–S2 pairs ≤ 12 h apart (mostly ~6 h); includes σ° and γ°; **237.9 GB** | Global, not rice-specific, pre-2021, very large. Suitable for a future pretraining or external test of a global model. Its paper ([Roßberg & Schmitt, PFG 2023](https://doi.org/10.1007/s41064-023-00238-y)) is the key related work to cite. |
| **SEN12MS-CR-TS** ([project page](https://patricktum.github.io/cloud_removal/sen12mscrts/)) | 53 global ROIs, 2018, 30 co-registered S1/S2 time points each, mediaTUM hosting; licence not stated on page | Cloud-removal benchmark, 2018, not rice/Indonesia; licence unconfirmed |
| **SEN12TS** (source.coop) | Per the brief: 2020, CC-BY-NC-4.0, ~1.69 TB — not re-checked today | Non-commercial licence, wrong year, size |
| **CloudSEN12+** | Per the brief: CC0 labels | Only relevant to a cloud-masking study, not this task |
| **BPS KSA survey** (monthly rice growth-phase observations at segment points; used by [Thorp & Drajat, RSE 265:112679, 2021](https://doi.org/10.1016/j.rse.2021.112679) — 21,696 West Java locations, Nov 2018–Apr 2019) | Aggregate KSA results are public (e.g. West Java open-data portal); point-level labels were available to that study through a BPS co-author, and no public release was found | This would be the gold standard for rice stages in Java, but it is not openly available. Future work: request it through BPS. Cite Thorp & Drajat as the closest Indonesian S1+S2 rice ML study. |

### 2.3 Rejected

| Dataset | Reason |
|---|---|
| Zhao et al. 2026, 30 m paddy maps 1995–2024 ([ESSD 18:5583](https://essd.copernicus.org/articles/18/5583/2026/)) | Covers South and mainland Southeast Asia; **Indonesia is not included** |
| Any "ground truth" derived from Open-SEA-Rice-10 | The map was built partly from S1 VH and S2 NDVI, so it cannot serve as an independent check of this model (§10, threat T2) |

### 2.4 Prior results to benchmark against (cite; do not over-compare)

- Mohite et al. 2020 ([ISPRS Archives XLIII-B3-2020:1379](https://isprs-archives.copernicus.org/articles/XLIII-B3-2020/1379/2020/)): RF and SVR, S1 VV/VH/ratio/incidence angle → NDVI, Punjab/Haryana paddy; RF best, rice **R² 0.79, RMSE 0.08**. Their split design was not verified here. Compare only after checking whether it was spatially independent. (EVID-097–098)
- Roßberg & Schmitt 2023: global deep model on SEN12TP (VV, VH, WorldCover, DEM); terrain correction is unnecessary when DEM is an input (full-text check pending, EVID-099). It predicts from a single date (EVID-100), which motivates, but does not validate, the F1 temporal features.
- Brinkhoff 2025, IGARSS ([doi](https://doi.org/10.1109/IGARSS55030.2025.11243072)): **closest prior work**. Estimates Sentinel-2 vegetation indices for rice (the red-edge chlorophyll index is the reported example) from Sentinel-1 plus field dates, training on 2018–2023 and testing on 2024. LightGBM was best, and day of season alone outperformed SAR. These claims are verified from the abstract (EVID-108 update, 2026-09-26). The study location and whether NDVI or gap-length results appear in the full text remain unverified; see T8.
- Tsardanidis et al. 2025 (EVID-102–103): Sentinel-1 + Sentinel-2 CNN–RNN for grassland NDVI in Lithuania; beats linear, Akima and quadratic interpolation.
- Chen et al. 2024, BRIOS (EVID-104–105): Sentinel-1 + Sentinel-2 recurrent fusion; beats harmonic regression under long continuous gaps, but tests fixed gap periods rather than a sweep of gap length.
- Chen et al. 2023 (EVID-107): random-forest NDVI from Sentinel-1 plus environmental data, with ensemble uncertainty (method details UNVERIFIED).
- Chu et al. 2021 (EVID-106): optical-only NDVI gap reconstruction in cloud-prone Mainland Southeast Asia; relevant only to the interpolation side.

What this study adds (OBS-76, targeted scan, not a systematic review): an error-versus-gap-length comparison against interpolation, for small Indonesian rice blocks, scored on unseen tiles. Never claim to be first.

---

## 3. Sampling

| Parameter | Value |
|---|---|
| Frame | Open-SEA-Rice-10, Java tiles 42 (includes Krangkeng, Indramayu), 49 (includes Dukuhseti, Pati), 55 (includes Dukun, Gresik); the same **nine 256 × 256 windows per tile** (27 total, ~55 km apart) as `docs/m3-candidate-selection-2026-09-14.md`. 14 windows have ≥ 5 eligible blocks (tile 42: 4, 49: 6, 55: 4) |
| Block | Non-overlapping 6 × 6 cells, all cells rice values 1/2/3, as implemented in `research/scripts/select-ml-blocks.mjs` (corrected from a mistyped −1/−2/−3, external review round 4) |
| Selection | Per window with ≥ 5 eligible blocks: list eligible blocks in row/column order (Krangkeng removed) and take **3 evenly spread** (`floor((k+0.5)·n/3)`) → 14 × 3 = **42 pool blocks** + Krangkeng as `role=showcase` (HYP: enough for the deadline, not a power calculation). Script: `research/scripts/select-ml-blocks.mjs` → `research/private/ml-dataset/blocks-v1.geojson` |
| Excluded | The original Krangkeng study block (the showcase case study; never used in training or tuning) |
| Groups | `tile` (3 groups, the spatial test unit) ⊃ `window` (14 groups, the tuning CV unit) ⊃ `block` |

The selection is fixed before any radar or NDVI value is looked at. Record `selection_order` for every block. No block is dropped after its results are seen.

---

## 4. Extraction

### 4.1 Sentinel-2 target (reuse existing pipeline)

- Same Statistical API request, evalscript family and SCL exclusion set `[0, 1, 3, 8, 9, 10]` as `research/lib/cdse-pilot.mjs:21`. SCL 6 (water) stays **retained**. Flooded paddies at transplanting are real low-NDVI observations, and radar sees them too.
- Per block and acquisition date, store `source_px`, `valid_px`, `valid_frac`, `ndvi_mean`, `ndvi_std`, `cloud_shadow_frac`, product ID and exact timestamp.
- **Target-quality rule (new, versioned `target-v1`, HYP):** `valid_frac ≥ 0.8`. The existing display rule (≥ 9 of 36 valid pixels, `backend/measurement/statistics.js:60`) accepts a clear corner covering only 25 % of the block, which is too weak for a regression reference. Report the 9-pixel rule as a sensitivity set. The frozen phase-4 study stays untouched.
- NDVI only; the NDMI floor does not apply to this target.

### 4.2 Sentinel-1 features (new)

Statistical API, collection `sentinel-1-grd`, one request per block × orbit direction × month (both directions are requested):

```text
dataFilter: acquisitionMode=IW, polarization=DV, resolution=HIGH, orbitDirection=<ASCENDING | DESCENDING, separate requests>
processing: backCoeff=GAMMA0_TERRAIN, orthorectify=true, demInstance=COPERNICUS_30, speckleFilter=NONE
evalscript output: VV, VH (linear), localIncidenceAngle, dataMask; exclude shadowMask=1
aggregation: P1D over 2020-10-01 → 2021-12-31   # 3-month lead-in so radar-history features exist in Jan 2021
statistic: mean (computed in LINEAR power by the API) + count
```

- **Convert to dB only after averaging:** `dB = 10·log10(mean_linear)`. Never average dB values. No speckle filter is needed because the block mean over ~36 pixels already does the smoothing.
- **Both orbit directions are used, requested separately** so each day's mosaic contains one geometry. Matching takes the nearest pass from either direction. History features (F1) only use the **same relative orbit (track)**; v1 used the same direction, which mixed descending tracks 3 and 105 in three tile-55 blocks (OBS-79, fixed in ml-dataset-v2, DEC-56), and `orbit_asc` is an F0 feature. (Revised 2026-09-25 from the single-orbit rule, based on the Krangkeng pilot's acquisition counts before any model fitting. Each direction is a single relative orbit: ascending 25 at 36.2°, descending 149 at 37.8°, with mean VH −18.1 vs −17.8 dB. A single orbit matched only 12 of 23 clear dates within ±3 days, both orbits match 18 of 23.) Relative orbit and product IDs come from the Catalog API.
- Krangkeng pilot (2026-09-25): 67 acquisitions from Oct 2020 to Dec 2021 (31 ascending, 36 descending). The Sentinel-2 extraction reproduced the frozen study exactly: 71 acquisitions, the same 23 clear dates, NDVI within 5 × 10⁻⁵, a 36-pixel block. Cost: ≈ 6.3 PU per block.
- Store the product ID, exact timestamp, `valid_frac` and mean incidence angle.

### 4.3 Matching (radar → target date)

For each target-quality S2 acquisition at time `t`:

1. Candidate S1 acquisitions satisfy `|t_s1 − t| ≤ 3 days` (HYP; sensitivity at ≤ 1 day).
2. Choose the smallest `|Δt|`; on ties choose the **earlier** one.
3. Store the signed `offset_days = t_s1 − t` (fractional days from timestamps).
4. No candidate → row kept with `match_status = unmatched`, excluded from ML scoring and counted in the inventory.

---

## 5. Features

All radar features are past-only relative to the matched S1 acquisition and come from the same orbit direction.

| Set | Features | Purpose |
|---|---|---|
| **F0 radar-now** | `vv_db`, `vh_db`, `vh_minus_vv_db` (the log ratio), `inc_angle`, `orbit_asc` | Same-date relationship (the Mohite-style baseline) |
| **F1 radar-history** | `vh_db_prev1`, `vh_db_prev2` (previous two acquisitions), `dvh_1 = vh_db − vh_db_prev1`, `vh_db_min_60d` (the flooding/transplanting signature), `days_since_vh_min_60d` | Separates growth from ripening, where the same backscatter can mean different NDVI |
| **F2 calendar** | `doy_sin`, `doy_cos` | Seasonal timing |

**Feature-set comparisons (fixed in advance):** F0 · F0+F1 (primary) · F0+F1+F2 · F2-only (calendar baseline). If F0+F1+F2 does not beat F2-only, the radar is not adding information, and the paper must say so.

---

## 6. Splits (frozen before any model is fitted)

### 6.1 Spatial evaluation (primary)

- **Outer loop:** leave-one-tile-out (3 folds). Every test prediction comes from a model that never saw that tile.
- **Inner loop (tuning only):** `GroupKFold(n_splits=3)` over the `window` groups of the two training tiles (8–10 windows depending on the fold).
- The shared 2021 calendar means the tiles overlap in time. The claim is "transfer to unseen **places** within the same year", not unseen seasons or years.

### 6.2 Split file

`splits-v1.csv`: `block_id, tile, window, role`. Folds are derived from these columns by the harness: the outer fold is `tile`, and inner folds come from `GroupKFold` over `window`. (The earlier plan listed explicit `outer_fold, inner_fold` columns; the implemented file does not carry them. External review 2026-09-28.) Written once and hashed (SHA-256 recorded in the run manifest). Any change creates `splits-v2` with a written reason.

---

## 7. Models

### 7.1 Baselines

| ID | Method | Inputs |
|---|---|---|
| B1 | Persistence | Last target-quality NDVI before the hidden window |
| B2 | Linear interpolation (retrospective) | Nearest retained NDVI before and after the hidden window |
| B3 | Calendar-only RF | F2 |
| B4 | Linear regression | F0 |

### 7.2 ML models (trained by the team, DEC-57)

Both are trained with identical rows, features, splits and scoring rows. Same tuning ceiling: **≤ 30 configurations each**, chosen by inner-CV MAE. The reference harness realizes 18 (RF) and 12 (XGBoost) configurations, so the realized searches are not equal.

| Model | Search space (starting point; the reviewer may adjust within the budget and must report the final grid) |
|---|---|
| Random Forest (`sklearn.ensemble.RandomForestRegressor`) | `n_estimators=500`; `max_depth ∈ {None, 8, 16}`; `min_samples_leaf ∈ {1, 5, 10}`; `max_features ∈ {"sqrt", 0.5, 1.0}` |
| XGBoost (`xgboost.XGBRegressor`) | `learning_rate ∈ {0.03, 0.1}`; `max_depth ∈ {3, 5, 7}`; `min_child_weight ∈ {1, 5}`; `subsample=0.8`; `colsample_bytree=0.8`; `n_estimators ≤ 2000` with early stopping on the **inner validation fold only** |

Rules:
- Fit any scaling or feature transform inside each training fold. Tree models need no scaling, so ideally there is none.
- Planned `random_state=42`. The reference harness tunes with seed 0 and refits the chosen configuration with seeds 0–4, averaging them. The completed runs keep that protocol (external review F5).
- Choose the final configuration per outer fold from inner CV. The outer test tile is scored **once**.
- Record library versions (`sklearn`, `xgboost`, `numpy`, `python`) in the manifest.
- Compute is not a constraint: 42 blocks × about 15 matched clear dates is roughly 600 rows, which trains in seconds.

---

## 8. Evaluation

### 8.1 Metrics

MAE (primary), RMSE, MAPE, mean signed error (bias), R² (supporting only). All are computed on out-of-fold test predictions.

MAPE was requested by the reviewer (2026-09-26). It divides by the true NDVI, which is near zero or negative on flooded paddy. The Krangkeng pilot has two such targets, −0.33 and −0.28, which would make MAPE meaningless. So MAPE is computed only on rows with reference NDVI ≥ 0.2 (HYP), and the table reports how many rows were excluded. MAE stays the headline metric.

### 8.2 Breakdowns (each with n)

Per tile · per season (RiceAtlas Java wet/dry windows) · per NDVI tercile · per `|offset_days|` (≤ 1 vs 1–3) · per feature set.

### 8.3 Gap experiment (the paper's main figure)

For every test-fold block `b` and target-quality date `t`, and each nominal gap `L ∈ {10, 20, 30, 60}` days:

1. Hide all optical observations of `b` inside `[t − L/2, t + L/2]`.
2. B1 uses the last retained observation before the window. B2 uses the nearest retained observations on both sides. If either side is missing, that baseline is **unavailable** for this event and is counted.
3. The radar models use their existing out-of-fold prediction at `t`. They take no optical input, so hiding changes nothing and no retraining is needed.
4. Record the **effective gap** = distance between the bracketing retained observations (≥ L).
5. Score at `t` only.

Plot MAE against effective-gap bin for B1, B2, RF and XGBoost, with 95 % CIs and n under each bin. Headline quantity: the **crossover bin**, the first bin whose paired per-event difference (radar minus B2) has a 95 % CI entirely below zero (§8.4). It is exploratory, with pointwise intervals not adjusted across bins. If no crossover exists, that is the finding.

Compare methods only on the common subset where all methods are available. Report availability separately.

Implementation (`research/scripts/evaluate_ml.py`, 2026-09-26):
- L also includes 0, which hides the target date only (natural gaps). This gives the short-gap regime and the §12 method table. (HYP)
- Effective-gap bins start at 0, 10, 20, 30, 45, 60 and 90 days. (HYP)
- A (block, date) pair counts once per bin, at its smallest L.
- The crossover uses the §8.4 paired difference: it is the smallest bin where the 95 % CI of the per-event |error| minus B2's |error| lies entirely below 0.
- Radar predictions average the 5 seeds.
- B3 is the `rf F2` run in the team's official predictions (DEC-57).

### 8.4 Uncertainty and comparisons

- CIs: **cluster bootstrap over blocks** within the test tile (2,000 resamples), pooled across folds.
- RF vs XGBoost vs B2: paired per-event absolute-error differences with the same block bootstrap. Report the difference and its CI, not only the "winner".
- Pixels and dates are not independent replicates, so never report pixel-level n as the sample size.

---

## 9. Leakage controls (runnable: assertions in `research/ml-handoff/example_train.py` and `research/scripts/evaluate_ml.py`, plus `tests/s1-extraction.test.mjs`, `research/tests/test_ml_evaluation.py` and `research/tests/test_run_binding.py`)

Assertions that must pass before any number is reported:

1. No `block_id` appears in both the train and test sets of any outer fold; no `window` appears in both inner-train and inner-val.
2. The Krangkeng showcase block is absent from every training row.
3. Every radar history feature's source timestamp ≤ the matched S1 timestamp.
4. No optical-derived column exists in the ML feature matrix (allow-list of feature names).
5. Gap experiment: B1/B2 inputs contain no observation inside the hidden window.
6. `splits-v1.csv` hash matches the manifest.
7. Every test-fold prediction row maps to exactly one outer fold, and no row is predicted by a model that saw its tile.

---

## 10. Threats to validity (these go in the paper)

| ID | Threat | Handling |
|---|---|---|
| T1 | **Clear-sky / dry-season bias**: training targets exist only on clear dates, but the gaps are in the wet season | Season breakdown (§8.2); state that accuracy inside real cloudy intervals is unmeasured |
| T2 | **Map circularity**: Open-SEA-Rice-10 used S1 VH + S2 NDVI time series, so the chosen blocks have textbook rice signatures | State that results apply to map-confident contiguous rice, not fragmented or mixed smallholder plots |
| T3 | Only 3 test regions | Per-tile results shown; wide CIs expected; 4th tile optional (§3) |
| T4 | One year (2021; reportedly La Niña — unverified) | Claim is within-year spatial transfer only |
| T5 | S1A-only 12-day revisit, ±3-day matching offset | Offset sensitivity (§4.3, §8.2) |
| T6 | Small-block radar noise (~36 pixels) | Linear averaging; report per-block radar `valid_frac`; F1 smooths across dates |
| T7 | The NDVI reference has its own error (SCL misclassification, mixed edge pixels) | `target-v1` stricter rule plus the 9-pixel sensitivity set |
| T8 | **Novelty**: close prior rice work (Brinkhoff 2025, EVID-108) may already report error against gap length or spatially independent tests | Claim the result only "in this setting" (§12). Read its full text before final submission, if obtainable, and adjust the framing to "does this hold for Indonesian smallholder blocks?" if it overlaps |

---

## 11. Handoff contract

### 11.1 Handoff package (historical: developer → reviewer, 27 Sep)

Current version: `research/private/ml-dataset/ml-dataset-v2/` (plus a `.zip`; v1 is retained for audit), built by `research/scripts/make-ml-handoff.py` from templates in `research/ml-handoff/`. It contains `README.md` (the reviewer-facing version of this spec), `example_train.py`, `check_predictions.py`, and:

| File | Content |
|---|---|
| `blocks.geojson` | `block_id, tile, window, selection_order`, geometry (EPSG:4326) |
| `data/ml_table.csv` | ML-ready rows only (target-v1 pass and matched): ids, `tile, window, role`, S2 and S1 datetimes and products, `ndvi`, `offset_days`, all F0/F1/F2 columns |
| `data/showcase_apply.csv` | Krangkeng: features at every 2021 S1 pass (no target), predicted by the tile-42 fold for display in Matani |
| `data/matched.csv` | Every S2 acquisition (inventory, including rejected and unmatched rows) |
| `splits-v1.csv` | §6.2 |
| `features.json` | The allow-list of feature columns per feature set |
| `MANIFEST.json` | SHA-256 of every file, extraction settings (§4), code commit |

### 11.2 Returned by any training run (team or reviewer replication)

| File | Content |
|---|---|
| `predictions.csv` | `row_id, table (ml_table/showcase_apply), model (rf/xgb), feature_set, outer_fold, seed, y_pred` for **every test row** and every showcase apply row |
| `configs.json` | Final hyperparameters per model × feature set × outer fold, the full search grid, inner-CV scores |
| `env.txt` | Library versions, plus SHA-256 of the four training data files and of `predictions.csv`, checked by `research/scripts/check_run_binding.py` |

Per-row predictions are required, not just summary metrics. The gap experiment, bootstrap CIs and figures are computed from them.

---

## 12. Paper outputs

| Output | Source |
|---|---|
| Map of tiles, windows and blocks | `blocks.geojson` |
| Inventory table (acquisitions → target-quality → matched, per tile) | Extraction logs |
| Method comparison table (B1–B4, RF, XGBoost × feature sets; MAE/RMSE/MAPE/bias/R² with CIs) | §8.1, §8.4 |
| **Error vs effective gap figure** (the headline) | §8.3 |
| Krangkeng 2021 time series: observed NDVI, radar estimates, the 65-day gap marked "error unknown" | Final model applied to the held-out showcase block |

Contribution wording to substantiate: *an evaluation, over mapped-rice blocks in three Java regencies, of when Sentinel-1 NDVI estimates outperform temporal interpolation as optical gaps lengthen.* This is not a new algorithm and not the first SAR→NDVI model (cite §2.4: EVID-097–108).

Why the setting matters. Each point is a reason the question is open here, not a result:
- **Block size**: ≈ 0.36 ha blocks average only ~36 pixels, so radar speckle may dominate (T6).
- **Tropical monsoon**: optical gaps are longest when the crop changes fastest (T1).
- **Paddy flooding**: standing water changes backscatter sharply, so models trained elsewhere may not transfer.
- **Unseen-region testing**: leave-one-tile-out scoring (§6), where many prior studies test near their training data.

Paper sentence (draft): *Prior studies show that Sentinel-1 can estimate NDVI and fill optical gaps, including for rice [refs]. We evaluate this for smallholder rice blocks in Java, scoring on regions unseen in training, and report the gap length beyond which radar estimates outperform interpolation in this setting.*

---

## 13. Build order

| Day | Step | Done when |
|---|---|---|
| 25–26 Sep | Pilot: S1 statistics for the Krangkeng block, matched against its 23 dates | Values in plausible ranges (VH ≈ −25 to −12 dB), one plot of VH vs NDVI through 2021 |
| 26 Sep | Select 42 + 1 blocks (§3); extract S2 + S1 (§4); build the handoff folder; leakage assertions pass | §9 green; inventory counts known → **go/no-go** |
| 27 Sep | Handoff to the reviewer; the developer runs B1–B4 | Baseline predictions saved |
| 28 Sep | Reviewer returns predictions; gap experiment + CIs; **freeze results** | All §12 outputs generated from saved files |
| 29–30 Sep | Paper rewrite, review, venue checks | — |

Go/no-go (end of 26 Sep): the rest of the plan runs only if at least 30 blocks with at least 10 matched target-quality dates each exist across all 3 tiles (HYP). Otherwise the existing manuscript is the fallback.
