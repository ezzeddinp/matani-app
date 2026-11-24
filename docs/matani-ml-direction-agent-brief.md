# Matani: Machine-Learning Direction and AGERS 2026 Feasibility

> **Purpose:** A self-contained research and execution handoff for other AI agents and the thesis team.
> **Prepared:** 25 September 2026, Asia/Jakarta.
> **Updated:** 25 September 2026, incorporating model-comparison, study-period, and app-demonstration clarifications.
> **Evidence checked:** 25 September 2026 unless explicitly described as an existing manuscript result.
> **Status:** Research recommendation and feasibility assessment. No ML model has been trained or validated. No change to the approved research protocol, application, or manuscript has been implemented through this assessment.
> **Submission target:** AGERS 2026 full-paper deadline, listed by the organizer as 1 October 2026.

**Repository role:** Imported research-planning handoff, not a canonical protocol amendment. Existing project rules, evidence register, and approved decisions take precedence. Proposed methods and thresholds are unvalidated hypotheses; the dated access checks are scoped observations. External source notes retained here must be registered under the project's EVID requirements before adoption into canonical research documents. Adding this file does not record approval of the ML pivot.

## 1. Executive recommendation

Pursue **lightweight Sentinel-1 radar-based estimation of missing NDVI**, evaluated over multiple mapped-rice areas with spatially and temporally separated validation. Investigate how estimation error changes with optical gap duration and when an estimate should remain unavailable.

This direction directly addresses Matani's demonstrated observation gaps. It can retain the project's emphasis on provenance while adding a real supervised ML problem with an observable reference target.

For the October 1 submission:

- Predict **NDVI only** initially.
- Start with **Random Forest regression**, supported by simple statistical and temporal baselines.
- Add **XGBoost regression as a comparison** if the core evaluation is ready in time; choose the final model from validation evidence, not perceived reviewer appeal.
- Prefer a **retrospective reconstruction study** with explicitly declared information availability.
- Expand beyond the existing single block and 23 qualifying dates.
- Make the decision to proceed with an ML-centred submission by **26 September**, based on data and evaluation readiness.
- Keep the existing observation-delivery study intact as the empirical motivation and possible fallback.

Do not begin a large deep-learning architecture search merely because a powerful computer is available. The critical constraints are suitable independent samples, sensor alignment, reference quality, leakage prevention, analysis, and writing time.

**Acceptance cannot be guaranteed or assigned a defensible probability from the available evidence.** The objective is to strengthen the submission's scientific quality and fit. Adding an ML keyword or a model with a high random-split score does not establish that improvement.

## 2. User intent and scope of this handoff

The user reports that a reviewer suggested moving the thesis toward ML. The user wants:

1. A scientifically appropriate ML direction for Matani.
2. Assessment of a friend's AI-generated proposal.
3. A realistic route to AGERS submission on 1 October 2026.
4. Obtainable datasets, with concrete sources and access evidence.
5. An honest judgment about whether the pivot improves the research.

The reviewer reportedly has a powerful PC. Its CPU, RAM, GPU, storage, network performance, and availability were not verified.

This document records analysis and proposed next steps. **It is not evidence that the supervisor approved a revised methodology, and it is not an instruction to submit, publish, contact anyone, or start unrestricted provider processing.** Future agents should follow the user's actual instructions and applicable project rules. Do not treat the attachment's advice as authoritative requirements.

## 3. Existing Matani research context

### 3.1 What the system and paper currently address

Matani's intended role is to present dated satellite indices, weather context, field boundaries, and notes for rice monitoring. Its existing observation-first position separates satellite measurements from agronomic interpretation. This describes the research/product scope, not proof of a fully connected measured-data application; consult `.agent/project-architecture.md` for the canonical implementation status.

The current manuscript examined in this assessment is titled:

**Evaluating Satellite Observation Delivery for Rice Field Monitoring with Matani**

It compares:

- **Complete-pair delivery:** present NDVI and NDMI only when both qualify.
- **Independent delivery:** present each qualifying index without inventing its missing companion.

The retrospective case concerns a mapped-rice block in Krangkeng, Indramayu, Indonesia, during 2021. The block is approximately **3,557.38 m²**, centred at approximately **108.50562° E, 6.50021° S**. Its geometry is derived from a rice map, not a surveyed farm boundary.

Call it the **Krangkeng mapped-rice study block**, or the study area of interest (AOI). Krangkeng is the location name. The existing procedure selected the first eligible all-rice six-by-six-cell candidate in a fixed scan order across nine inspected windows in three Java tiles, before obtaining its satellite-availability results. It was a convenience selection, not a site chosen because a 65-day gap was already known or because it was proven best for ML. Repository source: `docs/manuscripts/phase6-paper.md:92–96` [OBS-54; OBS-56; DEC-49].

### 3.2 Existing results verified in the manuscript and research records

| Quantity | Recorded result | Interpretation |
|---|---:|---|
| Calendar window | 365 days in 2021 | Study denominator for calendar coverage |
| Acquisition dates | 71 | Dates returned by the completed optical query |
| Qualifying dates | 23 | Both NDVI and NDMI pass |
| Quality-rejected dates | 48 | Both indices fail the declared quality rule |
| Dates with only one qualifying index | 0 | Neither policy produces a singleton in this case |
| Calendar coverage | 6.30% | 23 / 365 |
| Conditional passing fraction | 32.39% | 23 / 71 acquisition dates |
| Maximum internal observation gap | 65 days | Between consecutive qualifying observations |
| Leading absence | 75 days | From the window start to the first qualifying observation |
| Policy coverage difference | 0 percentage points | A case-specific null result, not general equivalence |
| Original NDVI source-present cells | 36 | Geometric support before quality filtering |
| Buffered NDVI source-present cells | 16 | Nested geometry, not an independent field |

The 48 rejections should be described as **quality rejections**, rather than attributing every rejection exclusively to clouds without inspecting its cause.

The two geometry variants and two indices do not create independent field replicates. Similarly, 36 pixels multiplied by 23 dates do not establish 828 independent training examples.

### 3.3 Existing scientific boundary

The prior project decision identified as **DEC-24** establishes an observation-first, rice-only scope. Matani does not diagnose crop health from unvalidated index thresholds.

A future ML component can be proposed, but it must distinguish:

- Estimating a satellite-derived NDVI target.
- Identifying statistical deviations.
- Inferring an agronomic growth stage.
- Diagnosing disease, pests, nutrient deficiency, or crop damage.

These are different tasks with different reference requirements. Clear-sky Sentinel-2 NDVI is a usable **sensor-derived reference for NDVI estimation**. It is not ground truth for crop health or farmer benefit.

## 4. Conference fit, deadline, and acceptance considerations

The official organizer page checked on 25 September lists:

| Item | Listed information |
|---|---|
| Event | 2026 IEEE Asia-Pacific Conference on Geoscience, Electronics and Remote Sensing Technology, AGERS 2026 |
| Full-paper submission | 1 October 2026 |
| Acceptance notification | 10 November 2026 |
| Conference | 17–18 December 2026 |
| Location | Hotel Le Méridien, Jakarta, Indonesia |
| Submission portal | https://edas.info/N35685 |

Source: [Official AGERS 2026 page](https://r10.ieee.org/indonesia-grsaes/agers-2026/).

The event includes remote sensing, geospatial data mining, image analysis, and AI-related applications. Both the existing observation study and the proposed estimation study have topical relevance; the conference does not require an ML pivot simply to fall within scope.

The accessible information did **not** establish the current submission page limit, exact deadline timezone, or all portal requirements. The existing paper review record describes an eight-page draft; this does not prove AGERS compliance. Confirm the 2026 rules rather than importing a previous year's instructions.

The strongest ways to improve the paper are:

- A specific question supported by adequate evidence.
- Independent evaluation with transparent sampling and splitting.
- Comparisons that show whether radar and ML add value.
- Honest treatment of null results and failure cases.
- Reproducible processing and appropriately scoped conclusions.

No acceptance rate or reviewer preference was verified. Do not claim that ML guarantees acceptance, IEEE Xplore inclusion, or indexing.

## 5. Assessment of the friend's proposed directions

### 5.1 Sentinel-1 / Sentinel-2 gap filling — preferred, conditionally

**What is useful:** Radar is an alternative source of information when optical observations are obscured. Estimating NDVI connects directly to the existing availability problem and allows evaluation against held-out optical references.

**What needs correction:**

- The existing 23 dates are insufficient to justify a broad generalisation claim.
- Ordinary random k-fold validation can exploit spatial and temporal dependence.
- Sentinel-1 and Sentinel-2 are not automatically simultaneous or equivalent in spatial support.
- A modelled NDVI is an estimate, not a recovered optical measurement.
- A 65-day gap requires an appropriate long-gap evaluation; success on isolated missing dates does not establish this capability.
- Actual cloudy intervals generally lack the optical target needed to measure reconstruction error directly.

**Decision:** First choice if a processed multi-area dataset and defensible validation are ready promptly.

### 5.2 Unsupervised phenology / DTW — future research

Clustering can reveal groups of temporal patterns, but a cluster does not automatically correspond to transplanting, heading, or harvest. Dynamic Time Warping is a sequence-alignment method; using it alone does not establish a learned ML model.

Interpreting clusters as agricultural stages requires external validation or carefully limited claims. A generic rice-growth template does not establish actual stage dates for individual fields. Irregular planting schedules and long observation gaps make this harder.

**Decision:** Potentially useful later. Do not claim validated stage detection for the October submission without suitable independent reference data.

### 5.3 Spectral anomaly detection — poor main contribution under this deadline

Isolation Forest, One-Class SVM, or an autoencoder can produce unusualness scores without labelled diseases. However, being unusual does not establish agricultural harm or early-warning usefulness.

Potential causes include harvest, normal flooding, mixed pixels, clouds or shadows that escaped filtering, and measurement errors. Without reference events, warning precision, false-alarm rates, and lead time cannot be established.

Synthetic anomalies can test behaviour under the declared simulation, but they do not validate real pest, disease, or flood warnings.

**Decision:** Do not use an unvalidated anomaly detector as the principal ML claim merely because implementation is quick.

### 5.4 ML cloud/shadow masking — credible alternative with an accuracy benchmark

Comparing an existing scene-quality mask with a learned detector can connect to observation availability. Nevertheless, increasing the number of accepted dates is not itself evidence of improvement: the method may simply admit contaminated observations.

Evaluate against independent cloud/shadow labels, and distinguish cloud detection from shadow handling. Benchmark class definitions and resolutions must be made comparable.

The `s2cloudless` package documents ten required input bands; the existing NDVI/NDMI outputs are not sufficient inputs by themselves. Sentinel Hub's convenience CLP/CLM products are at 160 m, which is problematic for direct conclusions about the small Matani block.

Sources: [s2cloudless](https://github.com/sentinel-hub/sentinel2-cloud-detector), [Sentinel Hub cloud-mask documentation](https://docs.sentinel-hub.com/api/latest/user-guides/cloud-masks/).

**Decision:** A valid alternative if a benchmark and local data pipeline can be established quickly. Do not assume changing masks will remove genuinely opaque clouds or solve long optical absences.

## 6. Concrete dataset and access findings

### 6.1 Preferred primary data: local Sentinel-1 and Sentinel-2

Construct matched observations over multiple mapped-rice blocks using:

- [Sentinel-1 GRD in Earth Engine](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S1_GRD).
- [Harmonized Sentinel-2 L2A in Earth Engine](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED).
- [Copernicus Sentinel-1 processing documentation](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S1GRD.html).
- [Copernicus public catalogue documentation](https://documentation.dataspace.copernicus.eu/APIs/OData.html).

Earth Engine account/project readiness and actual export performance were not tested. Copernicus processing access and current allowance were not verified. Do not infer that a public catalogue query proves authenticated processing readiness.

Prefer small, area-limited extractions and tabular block summaries for the initial regression experiment. Do not start by downloading the entire global satellite archive.

### 6.2 Live Krangkeng radar catalogue result

The public catalogue was queried for:

- Collection: `SENTINEL-1`.
- Product-name filter: `IW_GRDH_1SDV`.
- Acquisition start: 2021-01-01 inclusive through 2022-01-01 exclusive.
- Footprint intersection with the study-centre point: `POINT(108.50562 -6.50021)`.

The complete response returned **104 online products**, with no continuation page. Excluding COG-format duplicates left **52 acquisitions on 52 UTC dates**, all Sentinel-1A. The date range was **3 January–29 December 2021**, and the maximum consecutive date interval was **12 days**.

Comparison with the 23 original-geometry NDVI passing dates gave:

| Maximum absolute calendar-day difference | Optical dates with a radar match |
|---|---:|
| 1 day | 11 / 23 |
| 3 days | 19 / 23 |
| 6 days | 23 / 23 |

These checks establish a promising acquisition inventory. They do **not** establish:

- Exact timestamp differences.
- A past-only operational match.
- Full-block footprint coverage.
- Consistent orbit direction or relative orbit.
- Adequate radar spatial support or quality.
- Successful imagery download, calibration, or extraction.
- Accurate NDVI prediction.

The 12-day radar interval must not be described as a validated 12-day NDVI monitoring service.

### 6.3 Open-SEA-Rice-10

- Record: https://zenodo.org/records/14627003
- Associated article: https://doi.org/10.1038/s41597-025-05722-1
- Contents: 2021 rice cropping-intensity maps at nominal 10 m pixel spacing across Southeast Asia.
- Practical role: selecting additional mapped-rice areas consistent with the existing study.
- Limitation: derived rice labels are not independent surveyed field boundaries, disease labels, or verified stage dates.

Keep the map's role as a sampling aid separate from the optical NDVI regression target. Do not present evaluation against a map used for sample selection as independent validation of rice classification.

### 6.4 SEN12TP

- Dataset and download inventory: https://zenodo.org/records/7342060
- Metadata: https://zenodo.org/records/7342060/files/sen12tp-metadata.json?download=1
- Author loader: https://github.com/oceanites/sen12tp
- Paper: https://doi.org/10.1007/s41064-023-00238-y
- Licence verified through the record API: **CC BY 4.0**.

The metadata contains **2,319 scenes from 1,236 regions**, with 2,095 training scenes and 224 test scenes. The dataset describes radar/optical pairing within 12 hours. The current file listing totals approximately **237.9 GB**, including a roughly 23 GB test ZIP. Plan from the file inventory rather than assuming the smaller descriptive size is the full download requirement.

**Actually checked:** The approximately 1.3 MB metadata file was downloaded. Its MD5 matched the published value: `ee86bf2caa4d8ec7d2bd67163a4396e7`.

A centroid screen within longitude 105–115° E and latitude 9–5° S identified **14 Java-area candidate scenes from 11 regions**. Five have a central sampling category of `Cropland`; all 14 belong to the official training split.

This bounding-box screen is not an administrative-boundary check. Cropland does not mean rice, and a centre label does not describe every image pixel. The imagery itself was not downloaded. These scenes are candidates for supplementary work, not a verified dense rice time series or an untouched local test set.

### 6.5 SEN12TS

- Source: https://source.coop/sen12ts/sen12ts/README.md
- Includes Sumatra among six regions.
- Contains 2020 radar/optical sequences, with up to 16 image triplets for a spatial extent.
- Full collection: approximately **1.69 TB**.
- Licence: **CC BY-NC 4.0**.

Potential use: geographically relevant supplementary temporal experiments. Sparse optical coverage remains a limitation. Review a selected subset before committing to transfer or preprocessing. The documentation was checked; image download and rice-specific suitability were not verified.

### 6.6 SEN12MS-CR-TS

- Dataset page: https://patricktum.github.io/cloud_removal/sen12mscrts/
- Code: https://github.com/PatrickTUM/SEN12MS-CR-TS
- Paper: https://arxiv.org/abs/2201.09613

This is a multimodal, multitemporal cloud-removal benchmark with radar/optical sequences and linked model resources. It is more appropriate for a longer reconstruction project than a rushed new deep-learning system. It is not inherently rice-specific. Check temporal correspondence of inputs and targets before interpreting reconstruction accuracy. Download and local execution were not tested.

### 6.7 CloudSEN12+

- Dataset card: https://huggingface.co/datasets/isp-uv-es/CloudSEN12Plus
- Original dataset paper: https://doi.org/10.1038/s41597-022-01878-2
- Model repository: https://huggingface.co/isp-uv-es/cloudsen12_models

This supplies expert cloud/shadow annotations and is the preferred reference resource if the project instead chooses masking evaluation. The CloudSEN12+ card specifies **CC0**; pretrained-model licences are separate and may be non-commercial.

Use independent evaluation splits and expert labels. A model-generated annotation is not an independent human reference, and a model already trained on a benchmark cannot be evaluated on its training portion as unseen data. The dataset card links updated distribution instructions; pin the exact version used.

## 7. Recommended experimental design

Everything in this section is a **proposal**, not an approved protocol or completed experiment.

### 7.1 Main research question

**How accurately can lightweight SAR-based models estimate NDVI over mapped rice areas, and how does performance change as optical observation gaps become longer?**

A supporting delivery question is whether a validation-derived withholding rule can reduce estimation error while retaining useful additional dates. Do not require this extension if the core regression evaluation is unfinished.

### 7.2 Sampling and unit of analysis

- Initially target approximately **30–60 non-overlapping mapped-rice blocks** across several separated geographic groups.
- Treat this as an acquisition target, not a formal minimum sample-size guarantee.
- Select blocks using a documented procedure before inspecting their final test performance.
- Use block-level observations for the first experiment where feasible; report the number of blocks, dates, geographic groups, and usable matched observations separately.
- Preserve the original Krangkeng block as a case study outside model selection.
- Do not use the original and buffered geometries as independent training/test sites.
- Do not silently exclude difficult blocks because their model results are poor.

Using 2021 keeps the rice-map year and existing case aligned. Adding other years is a possible later expansion; a 2021 map alone does not establish rice cultivation in every other year.

The map's reference year is 2021 and its development used 2020–2021 imagery [EVID-060; EVID-061; `docs/manuscripts/phase6-paper.md:92`]. This is a provenance reason for historical evaluation, not a claim that older imagery is more accurate. A 2023/2024 extension requires checking rice status, sensor availability, and usable references for that period. A later-year independent test could strengthen transfer evidence, but newer dates alone do not establish a stronger contribution. Confirm the chosen period with the reviewer before expanding acquisition.

### 7.3 Reference target

Estimate NDVI computed from quality-passing Sentinel-2 B08 and B04 observations using a declared, consistent aggregation rule.

The reference remains subject to cloud-mask errors, spatial mixing, resampling, and sensor uncertainty. Do not label it error-free agronomic ground truth.

Keep the original frozen dataset and results unchanged. Any new target-quality rule or sensitivity analysis belongs to a separately versioned extension.

### 7.4 Radar preparation and matching

Before training, establish:

1. Product and whole-block coverage.
2. Polarisation availability, orbit direction, relative orbit, and incidence geometry.
3. Backscatter coefficient, terrain correction, noise treatment, and optional speckle filtering.
4. Units: linear power and decibels are different representations. Do not divide dB values as if they were linear-power ratios.
5. A common spatial alignment and explicit aggregation footprint.
6. A maximum matching tolerance based on exact timestamps.
7. The treatment of multiple eligible radar acquisitions and unmatched dates.

An initial ±3-day retrospective tolerance is a candidate to test, not a validated constant. Report sensitivity to stricter matching where sample support permits. Do not broaden the tolerance simply to improve the apparent result.

Keep training and inference preprocessing consistent. A model trained on one backscatter representation should not be applied to another without a justified conversion and evaluation.

### 7.5 Minimal models and comparisons

| Method | Purpose |
|---|---|
| Persistence | Tests whether the last available optical value is already competitive |
| Linear interpolation | Strong, transparent comparator for retrospective reconstruction |
| Linear regression from radar features | Tests whether a simple radar relationship suffices |
| Random Forest regression | Primary nonlinear ML model |
| XGBoost regression, if time permits | Additional nonlinear comparison using the same inputs and evaluation |
| Seasonal-only baseline, if calendar features are used | Tests whether radar adds information beyond seasonal timing |

Candidate radar features include VV, VH, an appropriate ratio or difference, and acquisition geometry. Seasonal features may be included with the corresponding baseline. Lagged optical features may be explored only with strict masking and information-availability rules.

XGBoost is optional after the core evaluation works. For a fair comparison, use the same target, features, training/validation/test assignments, and scoring dates as Random Forest. Give both a bounded, documented tuning budget; use validation data for hyperparameters and any early stopping. Choose the model on validation results and evaluate the frozen choices once on the untouched test set. Report both methods, including a negligible difference or a Random Forest win. Neither name provides evidence of greater acceptance likelihood, and using either algorithm is not itself novelty.

Algorithm references: [Random Forest documentation](https://scikit-learn.org/stable/modules/ensemble.html#random-forests-and-other-randomized-tree-ensembles), [XGBoost documentation](https://xgboost.readthedocs.io/en/stable/tutorials/model.html).

LSTM, Bi-LSTM, transformers, GANs, and custom neural architectures are not necessary for the initial submission. Model complexity is not a substitute for sample independence.

### 7.6 Validation and leakage prevention

Use separated geographic groups and contiguous temporal holdouts. Specify whether each evaluation measures generalisation to unseen places, unseen periods, or both. Avoid implying that one split answers all three questions.

Essential controls:

- Never place correlated pixels from the same block/date into both training and test sets.
- Account for shared acquisition dates and neighbouring geography across blocks.
- Fit transformations, feature selection, and hyperparameters using training/validation data only.
- Freeze the final test set before comparing model configurations.
- Remove hidden optical targets from lag features, interpolation inputs, smoothed series, and any other derived feature.
- Avoid precomputing smoothing or filled time series across the complete dataset before splitting.
- Use date-based windows for irregular observations; a fixed row count does not necessarily represent a fixed gap duration.
- Report uncertainty at a meaningful block/group level rather than treating all pixels as independent replicates.

Methodological reference: [scikit-learn cross-validation guidance](https://scikit-learn.org/stable/modules/cross_validation.html). The guidance supports group-aware and time-aware evaluation; it does not prescribe a complete spatial-temporal design for this particular study.

### 7.7 Controlled gap experiments

Hide real clear-sky optical references in contiguous windows. Candidate durations are **10, 20, 30, and 60 days**, but only evaluate durations with sufficient reference support.

Distinguish two operations:

- Removing optical information across an interval.
- Scoring predictions only where a real, independently withheld optical reference exists.

Do not manufacture a daily reference curve and score against it as if it were observed. Never use an interpolation as both the target truth and the comparator being evaluated.

Report unsupported durations honestly. Performance on masked clear observations does not directly establish accuracy throughout actual persistently cloudy intervals. Seasonal selection differences between clear and cloudy conditions are a limitation.

A radar-only model does not use optical history at prediction time. Hiding a longer optical interval therefore does not inherently degrade its inputs; this experiment principally compares it with history-dependent baselines on the selected targets. If models are also retrained with fewer optical references, disclose that separate change in training information.

### 7.8 Retrospective versus operational evaluation

The recommended October study is explicitly **retrospective**. Later observations can be available to a declared reconstruction method, such as linear interpolation.

A real-time system has a different information constraint: inputs must be available at the prediction timestamp. Future optical observations, later radar acquisitions, and bidirectional temporal context cannot support an operational early-warning claim.

Record each method's allowed inputs. Do not interpret a retrospective advantage as proof of forecasting skill. If an operational experiment is added, report it separately with past-only matching and features.

### 7.9 Metrics and reporting

Primary regression metrics:

- Mean absolute error (MAE).
- Root mean squared error (RMSE).
- Mean signed error / bias.
- R² as a supporting metric, with attention to low-variance or small test groups.

Break results down by geographic group, gap duration, and available sample count. Inspect both high- and low-NDVI conditions without assigning unvalidated crop-health labels.

Availability outcomes must separate:

- Dates with measured, qualifying optical observations.
- Dates with eligible model estimates.
- Dates remaining unavailable.

For a withholding rule, select its criteria on validation data and then report retained coverage and error on the untouched test set. Raw disagreement between Random Forest trees is not automatically a calibrated confidence interval.

Do not count predicted values as new Sentinel-2 observations or claim that NDVI estimation creates a measured NDVI–NDMI pair.

## 8. Prior work and contribution positioning

The basic idea is established:

1. **Mohite et al., 2020:** Random Forest and support-vector regression for NDVI estimation from Sentinel-1, including rice. [Paper](https://isprs-archives.copernicus.org/articles/XLIII-B3-2020/1379/2020/).
2. **Roßberg and Schmitt, 2023:** A global SAR-to-NDVI deep-learning method and the SEN12TP dataset. [Paper](https://link.springer.com/article/10.1007/s41064-023-00238-y).

Consequently, neither using Random Forest nor predicting NDVI from radar should be presented as a new invention.

The proposed contribution is an **application-focused evaluation of reconstruction error, optical gap duration, and transparent delivery over small mapped-rice areas**, including failure cases and limits on display eligibility.

In plain language, the contribution is the new, defensible evidence the study supplies: whether radar estimates help in this setting, by how much compared with simple methods, and where they fail. Training a model and displaying a smooth chart are implementation steps; independently withheld references and fair comparisons substantiate the research finding.

This is a positioning hypothesis, not a verified first-ever novelty claim. The research conducted here was a targeted feasibility search, not a systematic literature review. Before finalising the introduction, compare the finished experiment with closely related work and describe the specific added evidence.

The existing zero-difference delivery result remains useful motivation: changing which existing indices are displayed did not create additional observation dates in this case. Radar-based estimation tests a different mechanism for supplying information, with explicit estimation error.

## 9. Proposed Matani integration semantics

No application changes have been implemented. If later authorised and validated, preserve three distinct states:

| State | Meaning | Required information |
|---|---|---|
| Observed | Quality-passing Sentinel-2-derived NDVI | Acquisition date, source, processing and quality provenance |
| Estimated | Model-derived NDVI | Target date, input acquisition dates, model version, processing provenance, evaluated uncertainty/eligibility information where available |
| Unavailable | No valid observation or acceptable estimate | Reason for unavailability |

An estimate must never silently overwrite a measurement. Its date must not be relabelled as a Sentinel-2 acquisition that did not occur. A chart should visually distinguish estimates from observations and retain the true temporal spacing.

For the first demonstration, import the exact saved study polygon as a research field, open its historical 2021 period if agreed, and show real saved model outputs beside the observed series. The developer does not need to redraw training fields by hand. Train and evaluate outside the app; a versioned historical-results snapshot is sufficient for this demonstration, provided it is labelled honestly. Tapping an estimate should expose its target date, actual radar date, model/run version, and provenance. A separately labelled held-out reference can demonstrate a prediction error; an actually cloudy date without a reference cannot. The app presents the evidence, while the saved experiment establishes accuracy. See the [submission roadmap](matani-ml-submission-roadmap.md), Phase 6, for implementation and checks.

Do not automatically feed unvalidated estimates into disease, pest, irrigation, or crop-damage advice. A successful reconstruction experiment validates the declared numerical task, not those downstream applications.

An offline experiment is sufficient to establish the research method if described honestly. A model running in the research environment is not proof of mobile deployment, usability, or benefit to farmers.

## 10. Schedule and decision gates

This schedule is anchored to **25 September 2026**. If read later, update it rather than treating elapsed milestones as completed.

| Date | Required outcome |
|---|---|
| 25 September | Confirm research framing; inspect a processed radar/optical sample; verify access and matching |
| 26 September | Obtain a usable multi-area table; freeze evaluation splits; run baselines and Random Forest; decide whether an ML-centred submission is viable |
| 27 September | Complete blocked evaluation, supported gap experiments, and essential feature comparison |
| 28 September | Inspect failures and freeze results; stop discretionary model exploration |
| 29 September | Rewrite the manuscript around actual findings, related work, and limitations |
| 30 September | Supervisor/team review, references, figures, current venue requirements, and submission checks |
| 1 October | Submission buffer |

### Proceed with the ML-centred paper when

- The data are processed and usable, not merely listed in a catalogue.
- There is meaningful spatial/temporal evaluation beyond the original single-block sample.
- Baselines and the primary model execute reproducibly under the frozen protocol.
- The results can be interpreted without unsupported agricultural claims.
- Enough time remains for scientific review and venue compliance.

### Retain the existing paper or defer the pivot when

- Only the original 23 dates remain available.
- Download, access, alignment, or radar preprocessing is still unresolved.
- Evaluation depends on random pixel splitting or contaminated features.
- Long-gap claims have no supported reference experiment.
- The manuscript cannot be reviewed adequately before submission.

The gate is about readiness and defensibility, **not obtaining a favourable score**. A well-supported finding that simple interpolation is competitive or radar fails in a particular setting can still be scientifically meaningful. Do not alter exclusions or test sets to manufacture a positive result.

Do not automatically switch to an unlabeled anomaly detector if the radar pilot fails. That substitutes an easier implementation for the missing scientific evidence.

## 11. Evidence status and unresolved questions

### Completed in this assessment

- Read the user's attached proposal.
- Inspected the current local manuscript and relevant research records.
- Checked the organizer's listed deadline and scope.
- Identified directly relevant prior methods and public dataset sources.
- Queried the public Sentinel-1 catalogue at the study centre.
- Compared radar catalogue dates with the existing 23 optical passing dates.
- Downloaded and checksum-verified SEN12TP metadata.
- Screened SEN12TP metadata for Java-area candidates.
- Saved access notes and CSV inventories.

### Not completed or not established

- Supervisor approval of the revised research question.
- Usable radar rasters for the Matani block.
- Actual multi-area training data.
- Exact timestamp pairing and orbit-consistency analysis.
- Imagery downloads for the large public benchmarks.
- Model training, tuning, or independent test results.
- Validated uncertainty or withholding thresholds.
- Successful filling of the real 65-day gap.
- Disease, phenology, yield, early-warning, or farmer-benefit validation.
- Application integration or deployment.
- Current AGERS page limit and deadline timezone.
- Acceptance probability or publication/indexing outcome.

### Highest-value next checks

1. Confirm whether the reviewer expects a trained model, a novel method, or simply a stronger computational evaluation; do not assume those are equivalent.
2. Obtain one aligned local radar/optical sample and inspect its values, footprint, units, and quality.
3. Count usable block/date pairs across the proposed expanded sample and inspect independence before finalising splits.
4. Verify provider access and export/processing constraints without exposing credentials.
5. Run a minimal baseline comparison before selecting a larger architecture.
6. Confirm 2026 submission requirements in the official portal.

## 12. Handoff files and local source locations

### User-facing files accompanying this brief

Copies of this brief and the [submission roadmap](matani-ml-submission-roadmap.md) are placed together in `matani-app/docs/`. Original deliverables and the supporting access artifacts remain in:

`/Users/billy/Documents/Codex/2026-09-25/new-chat/outputs/`

- `matani-ml-direction-agent-brief.md` — this document.
- `matani-ml-submission-roadmap.md` — execution phases, readiness gates, and app-demonstration checks.
- `dataset-access-notes.md` — dataset-access evidence and caveats.
- `krangkeng-2021-sentinel1-catalogue.csv` — 52 non-COG catalogue acquisitions.
- `krangkeng-2021-radar-optical-date-matches.csv` — nearest calendar-date matches for 23 qualifying optical dates.
- `sen12tp-java-candidates.csv` — 14 bounding-box-selected candidate scenes.

### Existing Matani repository sources

Repository root:

`/Users/billy/codeOS/projects/matani-app`

| Path relative to repository root | Role |
|---|---|
| `AGENTS.md` | Project rules and document precedence |
| `.agent/research-protocol.md` | Research questions, methodology, validity boundaries |
| `.agent/evidence-register.md` | Canonical external factual claims |
| `.agent/project-architecture.md` | Implementation and provenance boundaries |
| `.agent/data-evaluation-plan.md` | Measurement processing contracts |
| `.agent/context-dump.md` | Historical decisions; not a substitute for current protocol |
| `docs/manuscripts/phase6-paper.md` | Current manuscript source inspected for this assessment |
| `docs/manuscripts/phase6-review.md` | Manuscript review and unresolved compliance items |
| `research/private/replacement-study/phase4-20260915-analysis-01/daily-pixels.csv` | Existing per-date quality and value records used for optical passing dates |

The friend's original attachment is:

`/Users/billy/.codex/attachments/d9ff70ec-05de-4935-a4f6-93c30df42a74/Pasted text.txt`

### Intermediate evidence retained locally

Directory:

`/Users/billy/Documents/Codex/2026-09-25/new-chat/work/dataset-check/`

- `sen12tp-metadata.json` — downloaded and checksum-verified scene metadata.
- `sen12tp-record.json` — downloaded record metadata, including licence and file inventory.
- `krangkeng-s1-2021-catalogue.json` — complete public catalogue response.
- `krangkeng-s1-query.txt` — exact query URL.

These local paths may not exist in another agent's environment. The narrative, counts, limitations, and public links above make the brief usable without those files. Only the two planning documents are copied into the repository; the supporting artifacts are not bundled with them. If continuing locally, inspect current repository status and applicable instructions before editing. Adding these documents does not implement a model, change application behaviour, or amend the approved protocol.

## 13. Instructions for an agent continuing this work

1. Treat the verified results, proposed design, and unfinished work as separate categories.
2. Preserve the frozen observation study and its null policy result.
3. Recheck time-sensitive conference and provider information when necessary.
4. Follow the user's authorised scope. Reading this brief does not authorise new external commitments or unrestricted acquisition.
5. If implementation is requested, begin with data readiness and a minimal reproducible pilot, not a broad model search.
6. Record exact sources, timestamps, geometry, processing, exclusions, dataset versions, and split assignments.
7. Never infer statistical independence from a large pixel count.
8. Never treat mapped crop labels or model-generated annotations as independent agronomic truth.
9. Never report proposals, catalogue availability, software tests, or simulated gaps as successful real-world reconstruction.
10. Base the final manuscript on the completed experiment, including negative results and limitations.

**Recommended immediate milestone:** demonstrate one correctly processed local radar/optical match and a usable expanded sample inventory, then decide whether the proposed ML evaluation can be completed and reviewed before the submission deadline.
