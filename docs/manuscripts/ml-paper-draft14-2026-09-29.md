# When to Show Sentinel-1 NDVI Estimates in Rice Monitoring: Gap-Length Crossovers against Persistence and Interpolation in Java

**Updated:** 2026-09-29
**Status:** Draft 14 for AGERS 2026: draft 13 (reviewer's 12-ablation pipeline, DEC-61/OBS-89, with block-bootstrap intervals; Matani's two display rules, DEC-62), which GPT-6 Astra reviewed CLEAN in round 13, plus that round's three Nits (N39 leading-gap terminology, N40 in-gap seed-spread scope, and supporting-text wording), the acknowledged collaborator's name, a neutral model version in Fig. 4, and a pass removing repeated explanations and unnatural phrasing (2026-09-29). Supersedes drafts 1–11 (team-run-v2-final and the gap-masking experiment, kept on disk for audit). The build verifies selected table rows and quoted values against `docs/manuscripts/ml-paper-numbers.json`. Bracketed provenance tags are removed when rendering.

**Authors:** Paulus Biliardo Putrakedua; Mohammad Ezzeddin Pratama; Jerry Nathanael Sugito; Muhammad Wildan — School of Information Systems, Bina Nusantara University, Tangerang, Indonesia — paulus.kedua@binus.ac.id; mohammad.pratama006@binus.ac.id; jerry.sugito@binus.ac.id; muhammad.wildan@binus.edu

## Abstract

Cloud cover frequently interrupts Sentinel-2 observation of rice fields. For one mapped-rice block in Indramayu, Indonesia, only 23 dates in 2021 gave a usable NDVI value, and the longest interval between them was 65 days. This study tested whether Sentinel-1 backscatter can estimate block-mean NDVI, and from what optical-gap length such estimates beat two simple alternatives: the last observation carried forward (persistence) and linear interpolation. Forty-three 0.36 ha blocks were sampled from the Open-SEA-Rice-10 map in three 2° regions of northern Java, giving 792 clear-sky Sentinel-2 observations with a radar pass within three days. Random Forest and XGBoost were trained on four feature sets with five seeds and tested on regions left out of training. With current and earlier radar features, Random Forest reached MAE 0.143 (95% CI 0.132 to 0.153) and R² 0.32. No difference between the two learners was detected, and radar history reduced error by 0.015. At naturally occurring gaps, interpolation was more accurate than radar up to 60 days, and no difference was detected beyond that (exploratory linear crossover at 79 days, CI 58 to 152). Against persistence, the fitted crossover was at a gap age of about 19 days (CI 17 to 23), and beyond 30 days radar error was 0.150 lower. Matani, a prototype field-monitoring application, applies these results as two display rules, showing radar estimates in open gaps of at least 20 days and bracketed gaps of at least 80 days.

**Index Terms:** Sentinel-1, Sentinel-2, NDVI, Rice Monitoring, Gap Filling, Persistence, Random Forest, XGBoost, Spatial Cross-Validation

## I. Introduction

Indonesia harvested about 10.21 million hectares of paddy in 2023 [1], and both optical and radar satellite data have been used to map rice [2]. At field level, the Normalized Difference Vegetation Index (NDVI) from the Sentinel-2 red and near-infrared bands at 10 m [3] is a common measure of canopy development. Optical observations need a clear view of the ground, which clouds often prevent. [EVID-067; EVID-068; EVID-070]

Matani is a mobile application that shows a dated NDVI series for a saved rice field, displaying a value only when enough valid pixels pass its quality rule. For one mapped-rice block in Krangkeng, Indramayu, 23 of 71 Sentinel-2 acquisitions in 2021 passed that rule. The longest interval between qualifying observations was 65 days, and the year began with a 75-day absence. These gaps combine absent and quality-rejected acquisitions, so they do not necessarily indicate continuous cloud cover. [OBS-69; OBS-70]

Sentinel-1 radar sees through cloud, and its cross-polarized (VH) backscatter is more sensitive to rice growth than the co-polarized (VV) signal [4]. Earlier studies regressed NDVI on Sentinel-1 backscatter [5], [6] or combined radar with optical time series to fill cloudy periods [7]–[10]. For leaf area index, radar fusion has been reported to help most over long gaps [11]. For NDVI, none of the studies reviewed here reports how the error compares with persistence and interpolation as the optical gap grows, which an application needs to decide when an estimate should fill a gap. A targeted search found no such analysis for Indonesian smallholder rice. [EVID-113; EVID-097; EVID-099; EVID-102; EVID-104; EVID-107; OBS-76]

This study addresses three questions for small mapped-rice blocks in Java:

1) How accurately does radar-based regression estimate NDVI in regions not used for training, and how much do the learner, the features and the validation design matter?
2) From what optical-gap length is a radar estimate more accurate than persistence or interpolation?
3) How can a field-monitoring application use these results to decide when, and how, to show an estimate?

Random Forest [12] and XGBoost [13] were selected as established, lightweight learners and evaluated with a leave-one-region-out design. The contributions are threefold:

1) A region-held-out evaluation of Sentinel-1 estimation of block-mean NDVI over mapped rice in three regions of Java, with learner, feature-set, seed, robustness and validation-design comparisons.
2) Natural-gap comparisons with persistence and interpolation that estimate, with confidence intervals, the gap length at which radar estimates become more accurate than each.
3) Matani, a prototype field-monitoring application that turns these crossovers into two display rules: a radar estimate is shown only within a long optical gap, with the model's held-out error, and kept separate from measurements.

Effects on farm decisions are outside the scope of this study. [DEC-54; DEC-55; DEC-61]

## II. Related Work

Mohite et al. estimated cloud-free NDVI from Sentinel-1 VV/VH backscatter with linear, support-vector and random-forest regression, including paddy rice in Punjab and Haryana, India. Random forest gave R² 0.79 and RMSE 0.08 for rice [5]. Roßberg and Schmitt trained a globally applicable deep network on the time-paired SEN12TP dataset and note that it neglects temporal characteristics because it predicts from a single date [6]. [EVID-097; EVID-098; EVID-099; EVID-100]

Other studies combine radar with optical history. Scarpa et al. estimated NDVI from Sentinel-1 and Sentinel-2 sequences with a CNN over Burkina Faso, comparing causal and non-causal fusion schemes [10]. Pipia et al. fused the Sentinel-1 radar vegetation index with Sentinel-2 leaf area index using multi-output Gaussian processes and found the largest gain over long gaps [11]. Tsardanidis et al. used a CNN–RNN for Lithuanian grassland and outperformed linear, Akima and quadratic interpolation [7]. Chen et al. evaluated the bidirectional recurrent BRIOS model under random gaps and two fixed continuous gap periods per site [8]. Chen et al. also combined Sentinel-1, Sentinel-2 and environmental data in an ensemble framework [9], and Chu et al. reconstructed MODIS NDVI in cloud-prone mainland Southeast Asia by tensor completion [14]. The closest rice study, by Brinkhoff, estimated Sentinel-2 vegetation indices for rice from Sentinel-1 and field dates, testing on a later season than training. Day of season alone outperformed SAR for the red-edge chlorophyll index, and fusing both with field dates performed best [15]. In Indonesia, Thorp and Drajat mapped paddy production stages across West Java with Sentinel data [16], which is a classification task. [EVID-102; EVID-104; EVID-105; EVID-107; EVID-106; EVID-108; EVID-101]

Neighbouring fields and shared dates produce correlated samples. Random cross-validation on such data can underestimate prediction error, so blocked designs are recommended [17]. [EVID-114]

## III. Data and Methods

### A. Study area and sampling

Blocks were sampled from the 2021 Open-SEA-Rice-10 rice cropping-intensity map [18], [19] in three 2° tiles of northern Java (Fig. 1). A block was a non-overlapping 6 × 6-cell square of 0.36 ha in which all 36 cells were mapped as rice. Of nine fixed windows per tile, the 14 windows with at least five eligible blocks each contributed three evenly spaced blocks, giving 42 pool blocks. The Krangkeng block described in Section I was added as a showcase block and excluded from training and tuning. The selection rule was fixed before any satellite value was extracted, and no block was removed afterwards. [EVID-060; EVID-061; DEC-54; CODE: research/scripts/select-ml-blocks.mjs]

![Fig. 1: Sampled windows and the Krangkeng showcase block in three Open-SEA-Rice-10 tiles, northern Java.](ml-fig-area.png)

### B. Optical reference

Sentinel-2 Level-2A statistics were retrieved from the Copernicus Data Space Ecosystem Statistical API [3], [20]. NDVI was computed from B04 and B08 at 10 m, excluding Scene Classification Layer classes 0, 1, 3, 8, 9 and 10 [21]. Class 6 (water) was retained because flooded paddies are genuine low-NDVI observations. The block mean served as the reference when at least 80% of its 36 pixels were valid, and such dates are called qualifying observations. [EVID-070; EVID-093; EVID-094; HYP: target-v1; DEC-54 pilot OBS]

### C. Radar features

Sentinel-1 GRD data (IW mode, dual polarization) were processed to terrain-flattened γ⁰, orthorectified on the Copernicus 30 m DEM with no speckle filter, and radar-shadow pixels were excluded [22]. The API returns linear power, so block means were averaged in linear units before conversion to decibels (1). [EVID-109]

EQ: γ⁰[dB] = 10 · log₁₀( mean γ⁰[linear] )    (1)

Three feature groups were defined before model fitting. F0 describes the current pass: VV, VH, VH − VV in decibels, local incidence angle and orbit direction. F1 describes radar history from the same relative orbit, using passes at or before the matched pass: the previous two VH values, the latest VH change, the 60-day VH minimum, which may be the matched pass itself, and the days since that minimum, intended to capture the low backscatter of flooded fields before transplanting. History is grouped by relative orbit because two descending tracks with different incidence angles (about 32–35° and 45–48°) overlap three tile-55 blocks. F2 encodes day of year as sine and cosine.

Radar from October to December 2020 supplied history for January 2021, and no optical value entered any feature. Four sets were compared: F0, F0+F1 (primary), F0+F1+F2 and F2 alone, the last serving as a calendar-only reference. [SPEC §5; CODE: research/lib/cdse-s1.mjs]

### D. Pairing

Each reference was paired with the nearest Sentinel-1 pass from either orbit direction within ±3 days, taking the earlier pass on ties. Unmatched dates remained in the inventory. Because the nearest pass could fall up to three days after the optical date, as it did for 383 of 792 pairs, an estimate uses information available at the radar pass, not necessarily at the optical date. Both orbit directions were used because a single direction matched 12 of Krangkeng's 23 qualifying dates, compared with 18 for both. [HYP: ±3 d; DEC-54]

### E. Models and validation

Each tile was held out in turn, and models were trained on the pool blocks of the other two tiles. Hyperparameters were tuned only within the training tiles, by three-fold cross-validation grouped by window, and selected by inner-fold MAE. Random Forest (RF; scikit-learn [23], 300 trees) searched 18 configurations of depth, leaf size and features per split. XGBoost (XGB) searched 12 configurations of learning rate, depth and minimum child weight with subsampling of 0.8; early stopping monitored the inner validation folds, and the final model used the mean inner tree count. Both learners received identical rows under all four feature sets, and each chosen configuration was refitted with five seeds (0–4). The showcase block was predicted by the tile-42 models. Metrics were computed per seed and averaged over the five seeds, and across seeds the standard deviation of MAE was below 0.0011. The authors re-executed the experiment pipeline (Acknowledgment), which reproduced the Random Forest MAE to within 0.0002. [DEC-61; OBS-89; CODE: research/pipelines/primary/01RfVsXgbLeaveOneTileOut.ipynb]

### F. Baselines and optical gaps

Radar was compared with two simple baselines. Persistence carries the most recent qualifying observation before the target forward (last observation carried forward, LOCF). Linear interpolation uses the nearest qualifying observations before and after the target and is therefore retrospective. Both used qualifying observations whether or not they had a radar match, and never the target date itself. For each target, the gap age is the number of days since the previous observation, and the bracketing gap is the interval between the previous and next observations. Persistence was available for 754 of the 792 rows and interpolation for 716. Radar was compared with persistence in bins of gap age (≤5, 6–10, 11–20, 21–30 and >30 days) and with interpolation in bins of bracketing gap (≤10, 11–20, 21–30, 31–45, 46–60 and >60 days). The crossover was estimated by fitting a least-squares line to the per-row difference in absolute error, radar minus baseline, against gap length and taking the length at which the line reaches zero, for each seed, averaged over seeds. These gaps occur naturally, so long gaps are few. [DEC-61; CODE: research/pipelines/operational/07GapLengthCrossover.ipynb]

### G. Metrics, robustness and uncertainty

Mean absolute error (MAE) was the primary metric, with root-mean-square error (RMSE), mean signed error (bias) and R². Robustness was examined by held-out region, by reference NDVI range, by the absolute and signed radar–optical offset, and by excluding 14 flagged rows: 2 references above 0.95, 8 below 0 and 4 with VV above −3 dB. The negative references are plausible for flooded paddies (Section III-B), so flagging them tests sensitivity rather than removing errors. The pool rows were also evaluated with Random Forest (F0+F1, fixed hyperparameters) under five-fold random and five-fold window-grouped splits, each repeated with five seeds that vary both the partition and the model, and under a three-fold tile-grouped split run once. In the primary experiment, seeds capture model randomness only, so 95% confidence intervals were added as percentile intervals from 2,000 cluster-bootstrap resamples of blocks within tiles, applied to per-row errors averaged over seeds. Methods were compared by paired per-row differences, and the crossover lines were refitted on each resample. With only three tiles, the intervals are conditional on the sampled regions and do not measure uncertainty across new regions. [SPEC §8.4; OBS-89; CODE: research/scripts/reviewer_ci.py]

### H. Application in Matani

Matani stores estimates with their model, run and provenance in a separate table and shows them only on the NDVI chart, as hollow diamonds with a text legend. The prototype uses two cutoffs, rounded from the crossovers in Section IV-C. Inside a gap bracketed by qualifying observations, where interpolation is possible, an estimate is shown only when the interval is at least 80 days. After the last observation, where persistence is the alternative, an estimate is shown when that observation is at least 20 days away. Before the first observation, the same 20-day cutoff is applied by symmetry; this case was not evaluated. A field with no qualifying observation shows no estimate. A measurement within three days takes precedence, and both rules count whole UTC calendar days, as the import step does. Selecting an estimate opens a panel with its radar acquisition date, model version and the model's pooled held-out MAE, which is an average error rather than an interval for that value. Estimates are excluded from latest-value summaries, and automated tests cover the rules. [DEC-55; DEC-62; CODE: supabase/migrations/20260926000100_ndvi_estimates.sql; CODE: utils/estimate-timeline.ts; CODE: app/detail-lahan-page.tsx; CODE: tests/estimate-timeline.test.mjs]

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

### B. Accuracy in held-out regions

Table II lists the pooled test accuracy of both learners and all four feature sets. With F0+F1, no difference between Random Forest and XGBoost was detected: the paired difference was −0.0008 (CI −0.0027 to 0.0011). Radar history reduced MAE by 0.015 for Random Forest (CI −0.022 to −0.009) and 0.014 for XGBoost. Adding calendar terms to F0+F1 did not help, changing MAE by −0.0008 for Random Forest (CI −0.0026 to 0.0009) and +0.0032 for XGBoost (CI 0.0008 to 0.0058). The calendar-only model had negative R² and was 0.041 less accurate than Random Forest with F0+F1 (CI 0.030 to 0.052). Bias was within ±0.005 for every configuration. [EVAL: ml-paper-numbers.json reviewer.pooled; EVAL: reviewer-pipeline-ci/ci.json]

TABLE: TABLE II: Test Accuracy on Held-Out Tiles, 792 Rows, Mean of Five Seeds
| Model | Features | MAE [95% CI] | RMSE | Bias | R² |
|---|---|---|---|---|---|
| RF | F0 | 0.158 [0.146, 0.170] | 0.193 | −0.002 | 0.21 |
| RF | F0+F1 | 0.143 [0.132, 0.153] | 0.178 | −0.001 | 0.32 |
| RF | F0+F1+F2 | 0.142 [0.130, 0.153] | 0.178 | 0.000 | 0.33 |
| RF | F2 | 0.184 [0.168, 0.199] | 0.225 | −0.004 | −0.08 |
| XGB | F0 | 0.158 [0.146, 0.170] | 0.193 | −0.002 | 0.21 |
| XGB | F0+F1 | 0.144 [0.132, 0.154] | 0.180 | 0.000 | 0.31 |
| XGB | F0+F1+F2 | 0.147 [0.135, 0.158] | 0.184 | −0.002 | 0.28 |
| XGB | F2 | 0.180 [0.164, 0.195] | 0.220 | −0.002 | −0.03 |

### C. Radar versus persistence and interpolation

Over all natural gaps, interpolation (MAE 0.060 on 716 rows) and persistence (0.109 on 754 rows) were more accurate than Random Forest (0.140 and 0.142 on the same rows). Fig. 2 and Table III show how this changes with gap length. Interpolation was more accurate in every bracketing-gap bin up to 46–60 days, where the difference was still 0.048 (CI 0.007 to 0.092). Beyond 60 days no difference was detected (−0.010, CI −0.083 to 0.066, 29 rows). The fitted crossover with interpolation was 79 days for Random Forest (CI 58 to 152) and 83 days for XGBoost (CI 60 to 176), inside the observed range of 10–100 days, but its interval extends beyond that range. Against persistence, radar was less accurate at gap ages up to 10 days, no difference was detected at 11–30 days, and beyond 30 days radar was 0.150 more accurate (CI 0.096 to 0.195, 45 rows). The fitted crossover with persistence was 19 days for both learners (Random Forest CI 17 to 23). XGBoost followed Random Forest in every bin (Fig. 2). [EVAL: reviewer-pipeline-ci/ci.json gap_bins, crossover]

![Fig. 2: Radar minus baseline absolute error by natural optical-gap length, with block-bootstrap 95% intervals, against (a) linear interpolation and (b) persistence.](ml-fig-gap.png)

TABLE: TABLE III: Radar (Random Forest, F0+F1) minus Baseline Absolute Error by Natural Gap Length
| Base | Gap (days) | Rows | Base MAE | Radar MAE | Diff. [95% CI] |
|---|---|---|---|---|---|
| LOCF | ≤5 | 321 | 0.067 | 0.140 | +0.073 [0.059, 0.087] |
| LOCF | 6–10 | 208 | 0.097 | 0.136 | +0.039 [0.021, 0.056] |
| LOCF | 11–20 | 126 | 0.134 | 0.141 | +0.008 [−0.015, 0.028] |
| LOCF | 21–30 | 54 | 0.184 | 0.162 | −0.022 [−0.064, 0.018] |
| LOCF | >30 | 45 | 0.310 | 0.160 | −0.150 [−0.195, −0.096] |
| Interp. | ≤10 | 133 | 0.041 | 0.133 | +0.092 [0.076, 0.108] |
| Interp. | 11–20 | 320 | 0.046 | 0.135 | +0.090 [0.077, 0.103] |
| Interp. | 21–30 | 111 | 0.062 | 0.150 | +0.088 [0.068, 0.110] |
| Interp. | 31–45 | 93 | 0.079 | 0.137 | +0.058 [0.037, 0.079] |
| Interp. | 46–60 | 30 | 0.132 | 0.180 | +0.048 [0.007, 0.092] |
| Interp. | >60 | 29 | 0.155 | 0.146 | −0.010 [−0.083, 0.066] |

### D. Robustness

The held-out tiles gave Random Forest MAE 0.149, 0.134 and 0.149 for tiles 42, 49 and 55, with R² from 0.26 to 0.39. Error depended on the reference NDVI. Random Forest was most accurate between 0.4 and 0.6 (MAE 0.085, bias −0.010), overestimated low references, with bias +0.113 at 0.2–0.4 and +0.190 from 0 to 0.2, and underestimated high ones, with −0.145 at 0.6–0.8 and −0.228 at 0.8 or more. The 8 negative references were overestimated by 0.58. Error did not grow with the radar–optical offset: by direction, MAE was 0.129–0.157 for offsets under one day and 0.123–0.149 for two to three days. Excluding the flagged rows reduced Random Forest MAE from 0.143 to 0.139, most of the difference coming from the negative references. A five-fold random split of the pool rows gave MAE 0.132 and R² 0.42, compared with 0.140 and 0.34 for window-grouped folds and 0.139 and 0.35 for tile-grouped folds, so random splitting was optimistic by about 0.007. [EVAL: ml-paper-numbers.json reviewer.region, ndvi_range, offset, flagged, split]

### E. Krangkeng showcase block

On the 16 showcase dates where interpolation was available, Random Forest with F0+F1 reached MAE 0.193, compared with 0.056 for interpolation, and on the 17 dates with an earlier observation, persistence reached 0.121. Its MAE on all 18 paired dates was 0.216. The model missed the March NDVI peak (0.85 and 0.89) and the two negative December references (−0.33 and −0.28), which it estimated at 0.25 and 0.28 (Fig. 3).

No optical observation qualified in the shaded interval of Fig. 3, so its estimates cannot be checked. There, the ten estimates ranged from 0.26 to 0.57 and changed by up to 0.26 within eight days, while the spread across seeds averaged 0.016. [EVAL: ml-paper-numbers.json krangkeng, reviewer.showcase]

![Fig. 3: Sentinel-2 NDVI observations and Random Forest (F0+F1) radar estimates for the Krangkeng showcase block, 2021.](ml-fig-krangkeng.png)

### F. Application in Matani

Fig. 4 shows the Krangkeng block in Matani on a local deployment loaded with the 2021 Sentinel-2 measurements and the Random Forest (F0+F1) estimates. Of the 52 radar passes in 2021, 20 fell within three days of a qualifying observation and 24 did not meet either display rule, so the chart shows 8 estimates, all between 3 January and 20 February, before the first observation on 17 March. The 65-day October–December gap is shorter than the 80-day cutoff, so no estimate is shown there, and no 2021 pass fell 20 days or more after the last observation. The panel below the chart is open for the estimate of 20 February, from the ascending radar pass that day, and shows the pooled held-out MAE rounded to 0.14. [OBS-87; OBS-89; DEC-62]

![Fig. 4: Matani NDVI chart for the Krangkeng block in 2021 (Indonesian interface), with Sentinel-2 measurements as circles, radar estimates as dashed diamonds and the detail panel of the selected 20 February estimate.](ml-fig-app.png)

## V. Discussion

### A. When radar helps

Interpolation does well because it uses the block's own observations on both sides of the target, and rice NDVI changes gradually over a few weeks. Radar applies a relationship learned in other regions, so its error stayed near 0.14 across gap lengths. Interpolation error reached that level only beyond 60 days, where few gaps occurred, which is why the 79-day crossover is exploratory rather than a threshold. Persistence degrades faster because a carried-over value ignores crop growth, and radar overtook it after about three weeks. That comparison is the one that matters in live monitoring, where no later observation exists yet, and it is also the more precise of the two.

Radar history was the only feature group that consistently reduced error, which fits the note by Roßberg and Schmitt [6] that single-date prediction ignores temporal information. Calendar terms added nothing once radar history was present, and a calendar alone predicted worse than the mean reference. The contrast with Brinkhoff's result (Section II) may reflect inputs: that study knew each field's sowing, ponding and panicle-initiation dates [15], while the calendar features here are day of year only.

### B. Error structure and limits

An MAE near 0.14 is large for rice NDVI, and the range compression reported in Section IV-D affects the flooded and full-canopy extremes most. The evaluation did not establish whether the estimates identify crop stage, and they cannot stand in for a clear observation. Mohite et al. reported an RMSE of 0.08 for rice with random forest [5], compared with 0.178 here. Their split design, block size and region differ, so the two results cannot be compared directly, and random splitting can underestimate error on spatially structured data [17], as it did here (Section IV-D).

The principal limitation is that NDVI references exist only on clear days, mostly in the dry season, so the error inside cloudy periods is unknown, and natural gaps longer than 60 days were few. The blocks were also chosen from a map built partly from Sentinel-1 VH and Sentinel-2 NDVI [18], which favours contiguous, clearly identified rice, and the study covers three regions in one year. The NDVI reference has its own errors from scene classification and edge pixels. The 80% validity rule, the ±3-day window and the gap bins were set without calibration, and the crossover assumes that the error difference changes linearly with gap length. [SPEC §10 T1–T7]

### C. Implications for Matani

Matani turns the evaluation into display rules instead of showing every estimate. The 80-day rule follows the comparison with interpolation, which is possible only between two observations, and the 20-day rule follows the comparison with persistence at the end of a series. The chart draws neither baseline; the rules only decide whether an estimate appears. Both cutoffs are provisional. All eight estimates in Fig. 4 fall before the first observation, the one case that was not evaluated. The application is a prototype developed by the authors. It was demonstrated in a web build on a local deployment with the study's 2021 data, was not checked on a phone, and has not been released or evaluated with users. [DEC-55; DEC-62; CODE: tests/estimate-timeline.test.mjs; CODE: tests/import-ndvi-estimates.test.mjs; OBS-87; OBS-89]

## VI. Conclusion

This study evaluated Sentinel-1 estimation of block-mean NDVI for 43 mapped-rice blocks in three regions of northern Java during 2021, using 792 radar–optical pairs, two learners, four feature sets and five seeds, and testing on held-out regions. Random Forest and XGBoost reached an MAE of about 0.14, radar history was the only feature group that helped, and no difference between the learners was detected. Radar overtook persistence after about three weeks and was clearly more accurate beyond 30 days. Interpolation remained more accurate up to 60 days, and the crossover near 80 days is uncertain. Matani applies these findings as two display rules. The results rest on clear-sky references, so they do not show how accurate the estimates are during cloudy wet-season periods or for fragmented smallholder parcels. The next steps are testing in cloudy periods, other years and parcel types, more long-gap cases to narrow the interpolation crossover, and temporal smoothing with calibrated uncertainty.

## Acknowledgment

The authors thank Daffa Farras Putra Tarigan for designing and implementing the machine-learning pipeline and the experiments reported in Sections III-E to IV-D. The authors used generative AI tools (Claude, Anthropic; GPT, OpenAI) to assist in drafting and editing the text of Sections I–VI, in developing the data-processing, uncertainty and plotting code behind Tables I–III and Figs. 1–3 and the application code shown in Fig. 4, and in checking the analysis. All AI-assisted content was reviewed, revised and verified by the authors, who take full responsibility for the paper. [DEC-58; DEC-61: wording to be confirmed by all authors, and by the person thanked, before submission]

## Data and Code Availability

The derived dataset, the experiment pipeline, predictions, scripts and processing records are stored in the team's research archive and are not publicly deposited at this time. Sentinel-1 and Sentinel-2 data are available from the Copernicus programme, and Open-SEA-Rice-10 is available under CC-BY-4.0 [19].

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
