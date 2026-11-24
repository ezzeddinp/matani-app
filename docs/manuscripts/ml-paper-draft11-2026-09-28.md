# When Does Sentinel-1 Outperform Temporal Interpolation for Rice NDVI? A Region-Held-Out Evaluation over Mapped Rice Blocks in Java

**Updated:** 2026-09-28
**Status:** Draft 11 for AGERS 2026 (the Matani + ML version of DEC-60; draft 10 was reviewed CLEAN by GPT-6 Astra in round 11, and draft 11 adds that round's two Nits (DOCX metadata, N29; replica empty-input case, N30) and states the Fig. 4 radar pass time in UTC), revised against `paper-best-practice.md`; the build verifies 77 selected table rows and quoted values against the evaluation files; the remaining numbers were checked manually. Every number comes from `research/private/ml-dataset/evaluation-team-v2-final/` and `docs/manuscripts/ml-paper-numbers.json`, computed from the team's official training run on ml-dataset-v2 (`team-run-v2-final/predictions.csv`, trained 2026-09-28, with data and prediction hashes in its `env.txt`; DEC-56, DEC-57, OBS-80, OBS-83). This is the primary result. Any later run by the reviewer is a replication check through `rebuild-ml-paper.sh`. The authors and affiliations follow `research/Thesis Matani.docx` (2026-09-26); Muhammad Wildan is the supervisor. Advisor, author and venue review are pending. Bracketed provenance tags are removed when rendering.

**Authors:** Paulus Biliardo Putrakedua; Mohammad Ezzeddin Pratama; Jerry Nathanael Sugito; Muhammad Wildan — School of Information Systems, Bina Nusantara University, Tangerang, Indonesia — paulus.kedua@binus.ac.id; mohammad.pratama006@binus.ac.id; jerry.sugito@binus.ac.id; muhammad.wildan@binus.edu

## Abstract

Cloud cover frequently interrupts Sentinel-2 observation of rice fields. For one mapped-rice block in Indramayu, Indonesia, only 23 dates in 2021 gave a usable NDVI value, and the longest interval between them was 65 days. This study tested whether Sentinel-1 backscatter can estimate block-mean NDVI, and how long an optical gap must be before such estimates beat temporal interpolation. Forty-three 0.36 ha blocks were sampled from the Open-SEA-Rice-10 map in three 2° regions of northern Java, giving 792 clear-sky Sentinel-2 observations with a radar pass within three days. Random Forest and XGBoost models were trained on current and earlier radar features, tested on regions left out of training, and compared with persistence, linear interpolation, linear regression and a calendar-only model. At naturally occurring gaps, interpolation (MAE 0.060) was more accurate than either radar model (0.138). When observations were removed to lengthen the gaps, radar error stayed between 0.12 and 0.14, while interpolation error rose from 0.044 to 0.210. In the pooled masking experiment, 60–90 days was the first effective-gap bin in which radar was more accurate than interpolation (paired difference −0.042, 95% CI −0.059 to −0.026). At 60–90 days this held in two of the three regions, and at 90 days or more in all three. No difference between the two learners was detected, and both pulled estimates towards mid-range values. Matani, a prototype field-monitoring application, applies this result by showing radar estimates only within optical gaps of at least 60 days, each with the model's held-out error.

**Index Terms:** Sentinel-1, Sentinel-2, NDVI, Rice Monitoring, Gap Filling, Random Forest, XGBoost, Spatial Cross-Validation

## I. Introduction

Indonesia harvested about 10.21 million hectares of paddy in 2023 [1], and both optical and radar satellite data have been used to map rice [2]. At field level, the Normalized Difference Vegetation Index (NDVI) from the Sentinel-2 red and near-infrared bands at 10 m [3] is a common measure of canopy development. Optical observations need a clear view of the ground, which clouds often prevent. [EVID-067; EVID-068; EVID-070]

Matani is a mobile application that shows a dated NDVI series for a saved rice field, displaying a value only when enough valid pixels pass its quality rule. For one mapped-rice block in Krangkeng, Indramayu, 23 of 71 Sentinel-2 acquisitions in 2021 passed that rule. The longest interval between qualifying observations was 65 days, and the year began with a 75-day absence. These gaps combine absent and quality-rejected acquisitions, so they do not necessarily indicate continuous cloud cover. [OBS-69; OBS-70]

Sentinel-1 radar sees through cloud, and its cross-polarized (VH) backscatter is more sensitive to rice growth than the co-polarized (VV) signal [4]. Earlier studies regressed NDVI on Sentinel-1 backscatter [5], [6] or combined radar with optical time series to fill cloudy periods [7]–[10]. For leaf area index, radar fusion has been reported to help most over long gaps [11]. For NDVI, none of the studies reviewed here reports how the error compares with interpolation as the optical gap grows, which an application needs to decide when an estimate should fill a gap. A targeted search found no such analysis for Indonesian smallholder rice. [EVID-113; EVID-097; EVID-099; EVID-102; EVID-104; EVID-107; OBS-76]

This study addresses three questions for small mapped-rice blocks in Java:

1) How accurately does radar-based regression estimate NDVI in regions not used for training?
2) How does that accuracy compare with persistence and interpolation as the optical gap lengthens?
3) How can a field-monitoring application use this evaluation to decide when, and how, to show an estimate?

Random Forest [12] and XGBoost [13] were selected as established, lightweight learners and evaluated with a leave-one-region-out design. The contributions of this study are threefold:

1) A region-held-out evaluation of Sentinel-1 estimation of block-mean NDVI over mapped rice in three regions of Java.
2) A gap-masking comparison with persistence and interpolation that identifies the first effective-gap bin in which radar estimates were more accurate than interpolation in the pooled data.
3) Matani, a prototype field-monitoring application that uses this result to decide when to show a radar estimate: only within a long optical gap, with the model's held-out error, and kept separate from measurements.

Effects on farm decisions are outside the scope of this study. [DEC-54; DEC-55]

## II. Related Work

Mohite et al. estimated cloud-free NDVI from Sentinel-1 VV/VH backscatter with linear, support-vector and random-forest regression, including paddy rice in Punjab and Haryana, India. Random forest gave R² 0.79 and RMSE 0.08 for rice [5]. Roßberg and Schmitt trained a globally applicable deep network on the time-paired SEN12TP dataset and note that it neglects temporal characteristics because it predicts from a single date [6]. [EVID-097; EVID-098; EVID-099; EVID-100]

Other studies combine radar with optical history. Scarpa et al. estimated NDVI from Sentinel-1 and Sentinel-2 sequences with a CNN over Burkina Faso, comparing causal and non-causal fusion schemes [10]. Pipia et al. fused the Sentinel-1 radar vegetation index with Sentinel-2 leaf area index using multi-output Gaussian processes and found the largest gain over long gaps [11]. Tsardanidis et al. used a CNN–RNN for Lithuanian grassland and outperformed linear, Akima and quadratic interpolation [7]. Chen et al. evaluated the bidirectional recurrent BRIOS model under random gaps and two fixed continuous gap periods per site [8]. Chen et al. also combined Sentinel-1, Sentinel-2 and environmental data in an ensemble framework [9], and Chu et al. reconstructed MODIS NDVI in cloud-prone mainland Southeast Asia by tensor completion [14]. The closest rice study, by Brinkhoff, estimated Sentinel-2 vegetation indices for rice from Sentinel-1 and field dates, testing on a later season than training. Day of season alone outperformed SAR for the red-edge chlorophyll index, and fusing both with field dates performed best [15]. In Indonesia, Thorp and Drajat mapped paddy production stages across West Java with Sentinel data [16], which is a classification task. [EVID-102; EVID-104; EVID-105; EVID-107; EVID-106; EVID-108; EVID-101]

Neighbouring fields and shared dates produce correlated samples. Random cross-validation on such data can underestimate prediction error, so blocked designs are recommended [17]. [EVID-114]

## III. Data and Methods

### A. Study area and sampling

Blocks were sampled from the 2021 Open-SEA-Rice-10 rice cropping-intensity map [18], [19] in three 2° tiles of northern Java (Fig. 1). A block was a non-overlapping 6 × 6-cell square of 0.36 ha in which all 36 cells were mapped as rice. Of nine fixed windows per tile, the 14 windows with at least five eligible blocks each contributed three evenly spaced blocks, giving 42 pool blocks. The Krangkeng block described in Section I was added as a showcase block and excluded from training and tuning. The selection rule was fixed before any satellite value was extracted, and no block was removed afterwards. [EVID-060; EVID-061; DEC-54; CODE: research/scripts/select-ml-blocks.mjs]

![Fig. 1: Sampled windows and the Krangkeng showcase block in three Open-SEA-Rice-10 tiles, northern Java.](ml-fig-area.png)

### B. Optical reference

Sentinel-2 Level-2A statistics were retrieved from the Copernicus Data Space Ecosystem Statistical API [3], [20]. NDVI was computed from B04 and B08 at 10 m, excluding Scene Classification Layer classes 0, 1, 3, 8, 9 and 10 [21]. Class 6 (water) was retained because flooded paddies are genuine low-NDVI observations. The block mean served as the reference when at least 80% of its 36 pixels were valid. [EVID-070; EVID-093; EVID-094; HYP: target-v1; DEC-54 pilot OBS]

### C. Radar features

Sentinel-1 GRD data (IW mode, dual polarization) were processed to terrain-flattened γ⁰, orthorectified on the Copernicus 30 m DEM with no speckle filter, and radar-shadow pixels were excluded [22]. The API returns linear power, so block means were averaged in linear units before conversion to decibels (1). [EVID-109]

EQ: γ⁰[dB] = 10 · log₁₀( mean γ⁰[linear] )    (1)

Three feature groups were defined before model fitting. F0 describes the current pass: VV, VH, VH − VV in decibels, local incidence angle and orbit direction. F1 describes radar history from the same relative orbit, using passes at or before the matched pass: the previous two VH values, the latest VH change, the 60-day VH minimum, which may be the matched pass itself, and the days since that minimum, intended to capture the low backscatter of flooded fields before transplanting. History is grouped by relative orbit rather than orbit direction because two descending tracks with different local incidence angles (about 32–35° and 45–48°) overlap three tile-55 blocks. F2 encodes day of year as sine and cosine.

Radar from October to December 2020 supplied history for January 2021, and no optical value entered any feature. Four sets were compared: F0, F0+F1 (primary), F0+F1+F2 and F2 alone. [SPEC §5; CODE: research/lib/cdse-s1.mjs]

### D. Pairing

Each reference was paired with the nearest Sentinel-1 pass from either orbit direction within ±3 days, taking the earlier pass on ties. Unmatched dates remained in the inventory. Because the nearest pass could fall up to three days after the optical date, as it did for 383 of 792 pairs, an estimate uses information available at the radar pass, not necessarily at the optical date. Both orbit directions were used because a single direction matched 12 of Krangkeng's 23 qualifying dates, compared with 18 for both. [HYP: ±3 d; DEC-54]

### E. Models and validation

Models were evaluated by leave-one-tile-out cross-validation and tuned only within the training tiles, using three-fold cross-validation grouped by window. Random Forest (scikit-learn [23], 300 trees) searched 18 configurations. XGBoost searched 12 configurations with subsampling of 0.8; early stopping monitored RMSE on the inner validation folds only, and the final refit used the mean inner tree count. Configurations were selected by inner-fold MAE. Both learners received identical rows and features. The authors prepared the dataset and trained all models under this protocol, using the search grids defined in the training script. Each chosen configuration was refitted with seeds 0–4, and the five predictions were averaged. The showcase block was predicted by the tile-42 models. Automated checks confirmed that no block appeared in both training and test data, that radar history used only passes at or before the matched acquisition, and that each prediction came from exactly one outer fold. [SPEC §6–7, §9; CODE: research/ml-handoff/example_train.py; CODE: research/scripts/evaluate_ml.py]

### F. Baselines and metrics

Four baselines were compared with the radar models. B1 (persistence) carries the last earlier reference forward. B2 (linear interpolation) uses the nearest earlier and later references and is therefore retrospective. B3 (calendar-only) is Random Forest trained on F2 alone. B4 is ordinary least squares on F0 under the same folds. B1 and B2 never used the target date itself, and both could use references that had no radar match. Methods were compared on the rows where all were available. Mean absolute error (MAE) was the primary metric, with root-mean-square error (RMSE), mean signed error (bias) and R². MAPE was restricted to references of at least 0.2 (656 of the 700 common rows) because flooded paddies have NDVI near or below zero. [HYP: 0.2; SPEC §8.1]

### G. Gap experiment and uncertainty

For each pool row and gap length L of 0, 10, 20, 30 or 60 days, all references within ±L/2 days of the target were hidden, and B1 and B2 were recomputed. L = 0 hides the target date only. The effective gap is the interval between the remaining bracketing references. Radar predictions did not change, because no radar feature uses optical data. Events were grouped into effective-gap bins of 10–20, 20–30, 30–45, 45–60, 60–90 and ≥90 days, each including its lower edge, and each block–date pair contributed once per bin, at its smallest L. Confidence intervals were 95% percentile intervals from 2,000 cluster-bootstrap resamples of blocks within tiles, and methods were compared by paired per-event differences in absolute error. The crossover bin, an exploratory summary, is the first bin whose paired-difference interval lies entirely below zero; the intervals are pointwise and not adjusted for the six bins. With only three tiles, the intervals are conditional on the sampled regions and fitted models and do not measure uncertainty across new regions, so per-tile results and a window-level bootstrap are also reported. [HYP: bins; SPEC §8.3–8.4]

### H. Application in Matani

Matani stores estimates in a separate table with their target date, radar acquisition, model, feature set, run identifiers, evaluation role and provenance, and shows them only on the NDVI chart, as hollow diamonds with a text legend. The prototype uses a 60-day cutoff, chosen because 60–90 days was the first effective-gap bin with a pooled radar advantage (Section IV-C). An estimate is shown only when the interval between the qualifying observations on either side of it is at least 60 days. Before the first or after the last observation, the interval to the nearest observation is used, and a field with no qualifying observation shows no estimate. A measurement within three days takes precedence, and both rules count whole UTC calendar days, as the import step does. Selecting an estimate opens a panel with its radar acquisition date, model version and the model's pooled held-out MAE, which is an average error rather than an interval for that value. Estimates are excluded from latest-value summaries, and automated tests cover the rule. [DEC-55; DEC-60; CODE: supabase/migrations/20260926000100_ndvi_estimates.sql; CODE: utils/estimate-timeline.ts; CODE: app/detail-lahan-page.tsx; CODE: tests/estimate-timeline.test.mjs]

## IV. Results

### A. Dataset

Table I summarizes the inventory. Of all block-acquisitions, 36.9% met the validity rule, and 68.9% of those were paired with a radar pass. Pool blocks contributed 12 to 26 rows each (774 in total), and the showcase block contributed 18. Passes were split evenly between orbit directions (395 ascending, 397 descending), and the median absolute offset was 1.2 days. November to April contributed 39% of rows. Reference NDVI ranged from −0.53, in late-December rows consistent with flooded paddies, to 0.997. [EVAL: ml-paper-numbers.json]

TABLE: TABLE I: Observation Inventory by Tile, 2021
| Tile | Blocks | Windows | S2 block-acquisitions | ≥80% valid | Radar-matched rows |
|---|---|---|---|---|---|
| 42 | 13 | 4 | 923 | 331 | 215 |
| 49 | 18 | 6 | 1,314 | 518 | 338 |
| 55 | 12 | 4 | 876 | 301 | 239 |
| Total | 43 | 14 | 3,113 | 1,150 | 792 |

### B. Accuracy at natural gaps

Interpolation was the most accurate method on the 700 rows where all methods were available (Table II). No difference between Random Forest and XGBoost was detected: with F0+F1, the paired difference was 0.0007 (CI −0.0016 to 0.0031). Radar history reduced Random Forest MAE by 0.015 relative to F0 (CI −0.023 to −0.008), whereas adding calendar terms produced no clear improvement once history was present (−0.001, with an interval spanning zero). Radar F0+F1 was 0.041 more accurate than the calendar-only model (CI −0.053 to −0.027), and with F0 alone Random Forest was 0.008 more accurate than linear regression (CI −0.013 to −0.002). Excluding two implausibly high references (0.978 and 0.997) changed every method's MAE by less than 0.0012. [EVAL: metrics.csv; EVAL: ml-paper-numbers.json paired_natural_gap]

TABLE: TABLE II: Test Accuracy at Natural Gaps, Pooled over Held-Out Tiles (700 Rows, 42 Blocks)
| Method | MAE [95% CI] | RMSE | Bias | R² | MAPE (%) |
|---|---|---|---|---|---|
| B1 Persistence | 0.109 [0.097, 0.121] | 0.166 | +0.003 | 0.36 | 23.0 |
| B2 Linear interpolation | 0.060 [0.052, 0.067] | 0.093 | −0.001 | 0.80 | 12.0 |
| B3 Calendar only (RF, F2) | 0.179 [0.163, 0.195] | 0.218 | −0.005 | −0.10 | 36.1 |
| B4 Linear regression (F0) | 0.161 [0.148, 0.174] | 0.196 | −0.008 | 0.11 | 32.7 |
| RF, F0 | 0.153 [0.142, 0.165] | 0.186 | −0.007 | 0.20 | 32.6 |
| RF, F0+F1 | 0.138 [0.128, 0.148] | 0.170 | −0.005 | 0.33 | 29.4 |
| RF, F0+F1+F2 | 0.138 [0.127, 0.148] | 0.170 | −0.004 | 0.33 | 29.3 |
| XGBoost, F0 | 0.152 [0.140, 0.163] | 0.185 | −0.008 | 0.21 | 32.3 |
| XGBoost, F0+F1 | 0.138 [0.127, 0.148] | 0.169 | −0.004 | 0.34 | 29.4 |
| XGBoost, F0+F1+F2 | 0.138 [0.127, 0.150] | 0.169 | −0.005 | 0.34 | 29.4 |

Interpolation was the most accurate method in every held-out tile. Random Forest with F0+F1 reached MAE 0.138, 0.131 and 0.148 on tiles 42, 49 and 55, compared with 0.076, 0.055 and 0.053 for interpolation. Radar error depended strongly on the NDVI level. Random Forest overestimated the lowest reference tercile (NDVI < 0.37) by +0.140 on average and underestimated the highest (NDVI ≥ 0.59) by −0.165, while its MAE in the middle tercile was 0.090, similar to the calendar-only model's 0.078. Error did not increase with pairing offset: MAE was 0.142 for offsets up to one day and 0.135 for offsets of one to three days. [EVAL: metrics.csv]

### C. Error as the optical gap lengthens

Interpolation was significantly more accurate in every bin up to and including 45–60 days (Fig. 2, Table III). In the 60–90-day bin, both radar learners were more accurate in the pooled data, and a window-level bootstrap gave a similar interval for Random Forest (−0.063 to −0.023). By tile, the 60–90-day advantage appeared in tiles 42 and 49 (−0.060 each) but not in tile 55 (−0.004, CI −0.034 to +0.034). At 90 days or more, radar was more accurate in all three tiles. Linear regression and the calendar-only model also beat interpolation at long gaps, by 0.021 at 60–90 days and 0.039 at 90 days or more respectively, but radar F0+F1 remained 0.03–0.05 more accurate than the calendar-only model in every bin. At 30–45 days no difference between persistence and radar was detected, and persistence was less accurate beyond that. In a post-hoc sensitivity analysis, keeping each block–date at its largest rather than smallest L would raise interpolation MAE at 60–90 days from 0.179 to 0.191, so the rule used is the conservative one for radar. Interpolation was available for 700 of 774 pool rows with only the target reference hidden (L = 0), and for 577 with 60 days hidden. [EVAL: gap_summary.csv; EVAL: gap_availability.csv]

![Fig. 2: Test MAE by effective optical gap for each method, pooled over held-out tiles.](ml-fig-gap.png)

TABLE: TABLE III: Paired Absolute-Error Difference between Radar and Interpolation by Effective Gap
| Gap (days) | Events | B2 MAE | RF MAE | RF − B2 [95% CI] | XGB − B2 [95% CI] |
|---|---|---|---|---|---|
| 10–20 | 334 | 0.044 | 0.134 | +0.090 [0.076, 0.103] | +0.088 [0.075, 0.100] |
| 20–30 | 382 | 0.054 | 0.133 | +0.080 [0.068, 0.091] | +0.077 [0.065, 0.088] |
| 30–45 | 486 | 0.074 | 0.138 | +0.064 [0.055, 0.073] | +0.064 [0.055, 0.072] |
| 45–60 | 359 | 0.117 | 0.133 | +0.016 [0.004, 0.029] | +0.016 [0.005, 0.028] |
| 60–90 | 475 | 0.179 | 0.136 | −0.042 [−0.059, −0.026] | −0.042 [−0.058, −0.026] |
| ≥ 90 | 171 | 0.210 | 0.121 | −0.089 [−0.113, −0.065] | −0.089 [−0.112, −0.067] |

### D. Krangkeng showcase block

On the 16 showcase rows where interpolation was available, Random Forest with F0+F1 reached MAE 0.193, compared with 0.056 for interpolation. Its MAE on all 18 paired dates was 0.216. The model missed the March NDVI peak (0.85 and 0.89) and the two negative December references (−0.33 and −0.28), which are consistent with flooding and which it estimated at 0.25 and 0.28 (Fig. 3).

No optical observation qualified in the shaded interval of Fig. 3, so the estimates there cannot be checked. Within this interval, the ten estimates ranged from 0.26 to 0.57 and changed by up to 0.26 within eight days. The spread across the five seeds averaged 0.016, so these changes do not arise from seed variation. [EVAL: metrics.csv; EVAL: ml-paper-numbers.json krangkeng]

![Fig. 3: Sentinel-2 NDVI observations and Random Forest (F0+F1) radar estimates for the Krangkeng showcase block, 2021.](ml-fig-krangkeng.png)

### E. Application in Matani

Fig. 4 shows the Krangkeng block in Matani on a local deployment loaded with the 2021 Sentinel-2 measurements and the Random Forest (F0+F1) estimates. Of the 52 radar passes in 2021, 20 fell within three days of a qualifying observation and 20 lay in optical gaps shorter than 60 days, so the chart shows 12 estimates: 3 before the first observation in March and 9 in the October–December interval. The panel below the chart is open for the estimate of 13 December, which comes from the radar pass at 22:26 UTC that day (shown in local time as 14 December) and carries the pooled held-out MAE, rounded to 0.14. Measurements and estimates keep separate symbols and legend entries, and estimates are not counted as observations. [OBS-87; DEC-60]

![Fig. 4: Matani NDVI chart for the Krangkeng block in 2021 (Indonesian interface), with Sentinel-2 measurements as circles, radar estimates as dashed diamonds and the detail panel of the selected 13 December estimate.](ml-fig-app.png)

## V. Discussion

### A. When radar helps

Interpolation does well at short gaps because it uses the block's own observations on both sides of the target, and rice NDVI changes gradually over a few weeks. The radar models apply a relationship learned in other regions, and their error was similar across gap bins while interpolation error rose with the gap. Where the two crossed varied by region (Section IV-C), so the 60–90-day bin is the first bin in which radar was better on average in these blocks, not a fixed threshold. It also assumes that an observation after the target is available. In live monitoring the comparison would be with persistence, and a real-time threshold was not tested.

Radar history was the only feature group that consistently reduced error, which fits the note by Roßberg and Schmitt [6] that single-date prediction ignores temporal information. The contrast with Brinkhoff's result (Section II) may reflect inputs: that study knew each field's sowing, ponding and panicle-initiation dates [15], while the calendar features here are day of year only. Because a calendar alone also beat interpolation at long gaps, radar's consistent advantage over the calendar model (Section IV-C) is the stronger evidence that it adds information.

### B. Error structure and limits

An MAE near 0.14 is large for rice NDVI, and the range compression reported in Section IV-B affects the flooded and full-canopy extremes most. The evaluation did not establish whether the estimates identify crop stage, and they cannot stand in for a clear observation. Mohite et al. reported an RMSE of 0.08 for rice with random forest [5], compared with 0.170 here. Their split design, block size and region differ, so the two results cannot be compared directly, and random splitting can underestimate error on spatially structured data [17].

The principal limitation is that NDVI references exist only on clear days, mostly in the dry season, so the error inside cloudy periods is unknown. The blocks were also chosen from a map built partly from Sentinel-1 VH and Sentinel-2 NDVI [18], which favours contiguous, clearly identified rice, and the study covers three regions in one year. The NDVI reference has its own errors from scene classification and edge pixels, and the 80% validity rule, the ±3-day window and the gap bins were set without calibration. [SPEC §10 T1–T7]

### C. Implications for Matani

Matani turns the evaluation into a display rule instead of showing every estimate, so short gaps keep their measured context and long gaps gain an estimate with a stated error. The 60-day threshold comes from a retrospective comparison; for an ongoing gap, the interval since the last observation is used, which the real-time comparison noted above should validate. The application is a prototype developed by the authors. It was demonstrated in a web build on a local deployment with the study's 2021 data, was not checked on a phone, and has not been released or evaluated with users. [DEC-55; DEC-60; CODE: tests/estimate-timeline.test.mjs; CODE: tests/import-ndvi-estimates.test.mjs; OBS-87]

## VI. Conclusion

This study evaluated Sentinel-1 estimation of block-mean NDVI for 43 mapped-rice blocks in three regions of northern Java during 2021, using 792 radar–optical pairs and testing on held-out regions. Random Forest and XGBoost reached an MAE of 0.138, whereas retrospective interpolation reached 0.060 at naturally occurring gaps. Radar was more accurate than interpolation only from the 60–90-day effective-gap bin onward, in two of three regions at 60–90 days and in all three at 90 days or more. Matani applies this finding as a display rule that shows radar estimates only within long optical gaps. The results rest on clear-sky references, so they do not show how accurate the estimates are during cloudy wet-season periods or for fragmented smallholder parcels. The next steps are testing in cloudy periods, other years and parcel types, temporal smoothing with calibrated uncertainty, and a real-time comparison with persistence.

## Acknowledgment

The authors used generative AI tools (Claude, Anthropic; GPT, OpenAI) to assist in drafting and editing the text of Sections I–VI, in developing the data-processing, evaluation and plotting code behind Tables I–III and Figs. 1–3 and the application code shown in Fig. 4, and in checking the analysis. All AI-assisted content was reviewed, revised and verified by the authors, who take full responsibility for the paper. [DEC-58: wording to be confirmed by all authors before submission]

## Data and Code Availability

The derived dataset, predictions, scripts and processing records are stored in the team's research archive and are not publicly deposited at this time. Sentinel-1 and Sentinel-2 data are available from the Copernicus programme, and Open-SEA-Rice-10 is available under CC-BY-4.0 [19].

## References

[1] BPS-Statistics Indonesia, “In 2023, paddy harvested area was approximately 10.21 million hectares with 53.98 million tons of dry unhusked paddy (GKG) production,” Mar. 1, 2024. https://www.bps.go.id/en/pressrelease/2024/03/01/2375/pada-2023--luas-panen-padi-mencapai- [EVID-067]

[2] R. Zhao, Y. Li, and M. Ma, “Mapping paddy rice with satellite remote sensing: A review,” Sustainability, vol. 13, no. 2, art. 503, 2021, doi: 10.3390/su13020503. [EVID-068]

[3] Copernicus Data Space Ecosystem, “Sentinel-2 L2A,” technical documentation, accessed Sep. 17, 2026. https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html [EVID-070]

[4] D. B. Nguyen, A. Gruber, and W. Wagner, “Mapping rice extent and cropping scheme in the Mekong Delta using Sentinel-1A data,” Remote Sensing Letters, vol. 7, no. 12, pp. 1209–1218, 2016, doi: 10.1080/2150704X.2016.1225172. [EVID-113]

[5] J. Mohite, S. Sawant, A. Pandit, and S. Pappula, “Investigating the performance of random forest and support vector regression for estimation of cloud-free NDVI using Sentinel-1 SAR data,” Int. Arch. Photogramm. Remote Sens. Spatial Inf. Sci., vol. XLIII-B3-2020, pp. 1379–1383, 2020, doi: 10.5194/isprs-archives-XLIII-B3-2020-1379-2020. [EVID-097]

[6] T. Roßberg and M. Schmitt, “A globally applicable method for NDVI estimation from Sentinel-1 SAR backscatter using a deep neural network and the SEN12TP dataset,” PFG – J. Photogramm. Remote Sens. Geoinf. Sci., vol. 91, pp. 171–188, 2023, doi: 10.1007/s41064-023-00238-y. [EVID-099]

[7] I. Tsardanidis, A. Koukos, V. Sitokonstantinou, T. Drivas, and C. Kontoes, “Cloud gap-filling with deep learning for improved grassland monitoring,” Computers and Electronics in Agriculture, vol. 230, art. 109732, 2025, doi: 10.1016/j.compag.2024.109732. [EVID-102]

[8] Y. Chen et al., “A new deep learning-based model for reconstructing high-quality NDVI time-series data in heavily cloudy areas: Fusion of Sentinel 1 and 2 data,” International Journal of Digital Earth, vol. 17, art. e2407941, 2024, doi: 10.1080/17538947.2024.2407941. [EVID-104]

[9] D. Chen et al., “Crop NDVI time series construction by fusing Sentinel-1, Sentinel-2, and environmental data with an ensemble-based framework,” Computers and Electronics in Agriculture, vol. 215, art. 108388, 2023, doi: 10.1016/j.compag.2023.108388. [EVID-107]

[10] G. Scarpa, M. Gargiulo, A. Mazza, and R. Gaetano, “A CNN-based fusion method for feature extraction from Sentinel data,” Remote Sensing, vol. 10, no. 2, art. 236, 2018, doi: 10.3390/rs10020236. [EVID-117]

[11] L. Pipia et al., “Fusing optical and SAR time series for LAI gap filling with multioutput Gaussian processes,” Remote Sensing of Environment, vol. 235, art. 111452, 2019, doi: 10.1016/j.rse.2019.111452. [EVID-118]

[12] L. Breiman, “Random forests,” Machine Learning, vol. 45, no. 1, pp. 5–32, 2001, doi: 10.1023/A:1010933404324. [EVID-110]

[13] T. Chen and C. Guestrin, “XGBoost: A scalable tree boosting system,” in Proc. 22nd ACM SIGKDD Int. Conf. Knowledge Discovery and Data Mining, 2016, pp. 785–794, doi: 10.1145/2939672.2939785. [EVID-111]

[14] D. Chu et al., “Long time-series NDVI reconstruction in cloud-prone regions via spatio-temporal tensor completion,” Remote Sensing of Environment, vol. 264, art. 112632, 2021, doi: 10.1016/j.rse.2021.112632. [EVID-106]

[15] J. Brinkhoff, “Improving real-time rice crop monitoring by fusing Sentinel-1, Sentinel-2 and field data,” in Proc. IEEE Int. Geoscience and Remote Sensing Symp. (IGARSS), 2025, pp. 1482–1486, doi: 10.1109/IGARSS55030.2025.11243072. [EVID-108]

[16] K. R. Thorp and D. Drajat, “Deep machine learning with Sentinel satellite data to map paddy rice production stages across West Java, Indonesia,” Remote Sensing of Environment, vol. 265, art. 112679, 2021, doi: 10.1016/j.rse.2021.112679. [EVID-101]

[17] D. R. Roberts et al., “Cross-validation strategies for data with temporal, spatial, hierarchical, or phylogenetic structure,” Ecography, vol. 40, no. 8, pp. 913–929, 2017, doi: 10.1111/ecog.02881. [EVID-114]

[18] F. I. Ginting et al., “High-resolution maps of rice cropping intensity across Southeast Asia,” Scientific Data, vol. 12, art. 1408, 2025, doi: 10.1038/s41597-025-05722-1. [EVID-061]

[19] F. I. Ginting et al., “Open-SEA-Rice-10: Open access high-resolution maps of rice harvested area and cropping intensity in Southeast Asia,” dataset, Zenodo, record 14627003, 2025, doi: 10.5281/zenodo.14627003. [EVID-060]

[20] Sentinel Hub, “Statistical API,” documentation, accessed Sep. 17, 2026. https://docs.sentinel-hub.com/api/latest/api/statistical/ [EVID-094]

[21] Sentinel Hub, “Sentinel-2 L2A Scene Classification Map,” Custom Scripts, accessed Sep. 17, 2026. https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/scene-classification/ [EVID-093]

[22] Copernicus Data Space Ecosystem, “Sentinel-1 GRD,” technical documentation, accessed Sep. 26, 2026. https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S1GRD.html [EVID-109]

[23] F. Pedregosa et al., “Scikit-learn: Machine learning in Python,” Journal of Machine Learning Research, vol. 12, pp. 2825–2830, 2011. https://jmlr.org/papers/v12/pedregosa11a.html [EVID-112]
