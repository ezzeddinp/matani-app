# Matani ML Direction: Current State to AGERS Submission

Prepared: 25 September 2026, Asia/Jakarta.

Updated: 25 September 2026, incorporating the Random Forest/XGBoost comparison and repository handoff.

Status: Proposed execution roadmap. Tasks below are not completed unless explicitly listed as existing evidence. This plan does not record supervisor approval or authorise external submission.

Repository role: Imported planning document. The project's canonical protocol, evidence register, and existing decisions take precedence. Proposed procedures and thresholds remain unvalidated hypotheses; dated access findings are scoped observations. Register external source claims under the project's EVID requirements before adopting them into canonical research documents. Adding this roadmap does not change the approved scope or implement ML functionality.

Target: A reviewed full paper ready by 30 September, with 1 October as submission buffer. The official AGERS 2026 listing gives 1 October as the full-paper deadline. Exact cutoff time, timezone, page limit, and portal requirements remain to be confirmed. The organizer page was accessible through search during this check; a direct fetch returned HTTP 403.

Source: [AGERS 2026](https://r10.ieee.org/indonesia-grsaes/agers-2026/).

## 1. The intended finished result

A submission-ready study should establish how accurately a lightweight model can estimate NDVI from radar observations over the selected mapped-rice areas, compare it with simpler methods, describe its limits during optical gaps, and demonstrate the delivery of those results in Matani if that app functionality is claimed.

The research model is trained and evaluated outside the app. Matani presents its outputs for a saved study boundary and period. Training does not have to happen on the phone.

### Recommended scope

| Decision | Proposed default |
|---|---|
| Task | Estimate NDVI from Sentinel-1 radar inputs |
| Reference | Quality-passing Sentinel-2 NDVI withheld from model training/evaluation inputs as appropriate |
| Crop context | Mapped rice areas; not independently surveyed farmer parcels |
| Primary period | 2021, subject to reviewer agreement |
| Locations | Multiple mapped-rice blocks; retain original Krangkeng case separately |
| Primary model | Random Forest regression |
| Comparators | Radar linear regression, persistence, retrospective linear interpolation |
| Additional ML comparison | XGBoost regression if core data/evaluation work is ready in time |
| Information setting | Retrospective historical reconstruction |
| Application | Saved research field, historical chart, explicit observation/estimate distinction |
| Excluded for this deadline | Disease, pest, yield, verified phenology, farmer-benefit, nationwide or live early-warning claims |
| Optional after core work | A later-year test; validated uncertainty-based withholding |

### Candidate research questions

1. How accurately can radar-based regression estimate held-out NDVI over the sampled mapped-rice blocks?
2. How does its performance compare with temporal baselines under supported optical-gap durations?
3. Can Matani display the evaluated outputs with the correct field, dates, source information, and distinction between observation, estimate, and unavailability?

Question 3 is technical integration, not evidence that farmers benefit. Question 2 must be scoped to the available reference data. Do not promise validation of every point inside the real 65-day optical-observation gap, or describe that whole interval as continuously cloudy without acquisition-specific evidence.

## 2. Starting point

### Evidence already obtained in this conversation

- Existing manuscript and archived optical study for one Krangkeng block during 2021.
- 71 optical acquisition dates; 23 qualifying dates and 48 quality-rejected dates.
- Maximum internal qualifying-observation gap of 65 days; a separate 75-day leading absence.
- A frozen mapped-rice boundary and documented selection procedure.
- A public radar catalogue check listing 52 distinct 2021 acquisition dates at the study-centre point.
- Calendar-date matching: 19 of the 23 passing optical dates have a radar date within three days in either direction.
- Public benchmark sources identified; SEN12TP metadata downloaded and checksum-verified.

### Work still required

- Reviewer agreement on the changed scope and historical period.
- Processed, usable radar data and exact timestamp pairing.
- Additional mapped-rice blocks and a defensible split into development and evaluation groups.
- Training, baseline comparisons, gap experiments, and final test predictions.
- App changes for estimated NDVI and verification of the actual historical demonstration flow.
- Revised manuscript, author review, venue compliance, and submission preparation.

Catalogue availability is not a processed dataset. The earlier app explanations described proposed behaviour; they did not establish that historical ML charts already work in the application.

## 3. Critical path and responsibilities

**Scope and period → one processed pilot → expanded dataset → frozen evaluation → models and results → manuscript → final review.**

App work follows the data contract. A minimal integration can proceed alongside manuscript preparation once the research outputs are stable.

Suggested division of work, if the thesis team has capacity:

| Responsibility | Work |
|---|---|
| Research/data lead | Areas, imagery, quality, pairing, dataset and splits |
| ML/evaluation lead | Baselines, model fitting, leakage checks, metrics, reproducibility |
| App/writing lead | Historical result display, integration checks, figures, manuscript assembly |
| Thesis team and reviewer | Scientific scope, claims, author details, final review |

These are responsibility areas, not a requirement for additional personnel. AI agents can assist within assigned scope, but the authors must understand and verify the method and results.

## 4. Phase 0 — Agree on the exact paper

Suggested date: 25 September. Dependency: none.

### Actions

1. Present the narrow NDVI-estimation question to the reviewer.
2. Confirm whether an evaluated existing ML algorithm is sufficient, or whether the reviewer expects a new algorithm. The latter is a substantially different research commitment.
3. Confirm the historical study period. Default to 2021 because it matches the rice-map reference year and existing archive.
4. Clarify whether app integration is required for this conference paper, or can be described as a later system step if incomplete.
5. Check current AGERS requirements: page limit including references, template, review anonymity if applicable, submission metadata, exact deadline/timezone, and any required declarations.
6. Save the original manuscript and frozen results. Amend the research protocol separately when the new scope is accepted; do not rewrite the historical evidence.

### Deliverables

- A one-page scope note with research question, target, locations/period, intended comparisons, and excluded claims.
- An actual record of reviewer feedback, rather than an AI-inferred approval.
- Venue requirements checklist.

### Completion check

The team can explain what will be predicted, how correctness will be checked, and what the paper will not establish.

### 2023/2024 decision

Newer imagery exists in the satellite archives, but the selected blocks' rice status in those years and usable observations must be checked. A 2021 map does not establish unchanged cultivation in 2024. A later-year test can add evidence about temporal transfer; changing the year merely to appear recent is not itself a scientific contribution.

If the reviewer requires a later period, freeze that choice now and reassess the schedule after the pilot. Do not silently substitute a newer year into the 2021 analysis.

## 5. Phase 1 — Prove that one local sample can be processed

Suggested date: 25 September into early 26 September. Dependency: a candidate scope; this read-only/data-feasibility work can inform reviewer discussion.

### Actions

1. Load the exact Krangkeng research polygon. Do not redraw it by eye in the app.
2. Select a known qualifying optical acquisition from the existing archive.
3. Find a radar acquisition using exact timestamps and inspect its full footprint over the block.
4. Confirm radar mode, VV/VH availability, orbit direction, relative orbit, and incidence information.
5. Use a documented processing route with calibrated, georeferenced radar values. Record coefficient, units, terrain correction, noise handling, and filtering.
6. Extract red/NIR reflectance or use the verified optical source to reproduce NDVI; retain SCL and source-presence information.
7. Overlay the block on both sensors' data and inspect alignment, nodata, and value ranges.
8. Produce one traceable radar-feature/NDVI-reference record, with the time difference included.
9. Repeat for a few dates and, if accessible, one additional block to expose basic processing problems early.

### Deliverable

A small pilot package containing the polygon, source identifiers, processing settings, matched rows, and visual inspection evidence.

### Completion check

Another team member can reconstruct the sample from saved inputs/settings and understand every value. A successful request alone is insufficient.

### Stop condition

If full-block coverage, units, alignment, or usable pixel extraction cannot be established promptly, do not expand acquisition or start model fitting on uncertain data.

The reviewer PC helps after the data are correct. It cannot fix source ambiguity or create missing reference observations.

## 6. Phase 2 — Build the study dataset and explain missing observations

Suggested date: 26 September. Dependency: working pilot.

### 6.1 Select additional blocks

- Use a declared procedure to select approximately 30–60 non-overlapping mapped-rice blocks across several separated geographic groups.
- This is a practical target, not a guarantee of adequate statistical power or independence.
- Prefer enough groups to reserve development, validation, and untouched spatial evaluation areas; four or more groups is a useful acquisition target, subject to the actual data.
- Record block identifiers, geometry, area, group, map source/year, and selection order.
- Exclude the original Krangkeng block from model tuning if it is reserved as the demonstration case.
- Do not select sites based on favourable model scores or disguise one contiguous cluster as many independent locations.

### 6.2 Assemble the minimum data

For each block and relevant date, retain:

| Field | Why it is needed |
|---|---|
| Block ID and geographic group | Location tracking and evaluation grouping |
| Target optical acquisition timestamp | Identifies the reference/reconstruction date |
| Optical product ID | Traceability |
| NDVI reference, where valid | Evaluation target |
| Valid pixel count and fraction | Reference spatial support |
| Cloud, cirrus, shadow, nodata/defect information | Explains rejection rather than assuming cloud |
| Radar acquisition timestamp and product ID | Traceability and temporal mismatch |
| VV/VH features and units | Model inputs |
| Radar orbit/geometry and valid support | Processing consistency |
| Signed time difference | Makes before/after pairing visible |
| Processing version and exclusion reason | Reproducibility |

Use block summaries for the first experiment. Specify the aggregation operation. Radar summaries should use a consistent geometry, and optical targets must have sufficient representative support; a mean over a tiny clear corner may not represent the whole block. Declare reference-quality criteria before evaluating model performance. Preserve the original study's quality rules and version any new criteria separately.

### 6.3 Audit cloud-related absence

For each optical acquisition, examine SCL inside the polygon. Count cloud/cirrus and shadow separately from missing or defective pixels. Keep download/processing failures distinct.

Inspect a documented sample of clear, cloudy, and ambiguous acquisitions with imagery and mask overlays. Record uncertainty. The SCL classifications are algorithm outputs, not infallible atmospheric truth.

Days with no optical acquisition cannot be labelled cloudy from that absence. The existing 65-day gap must not be described as 65 continuously cloudy days.

### 6.4 Choose and freeze a matching rule

An initial retrospective maximum offset of three days is a candidate, not a proven optimum. Use exact timestamps, record signed offsets, and assess stricter matching where enough samples exist. Specify tie-breaking and the handling of multiple acquisitions.

Record unmatched targets rather than forcing a pairing. A radar date three days away is not a simultaneous optical measurement.

### Deliverables

- Frozen area inventory and geometries.
- Acquisition/quality inventory, including rejected and unmatched cases.
- Clean matched feature/reference table.
- Counts by block, geographic group, date, and season or month.
- Small cloud-attribution audit with example figures.

### Completion check

Usable data exist beyond the original single block, and the team can see whether there are enough independent areas and dates for the proposed evaluation. Raw pixel count alone does not satisfy this gate.

## 7. Phase 3 — Freeze the evaluation before searching for the best model

Suggested date: 26 September, before model comparison. Dependency: dataset inventory.

### Primary spatial evaluation

Reserve entire geographic groups for testing, with separate groups for training and validation. Determine group membership before inspecting model performance. Keep neighbouring blocks together where their dependence would undermine the split.

The primary claim is then performance on the selected held-out areas. If training and test areas share dates, disclose that this is not automatically a test of unseen seasons or years.

### Temporal stress evaluation

Define contiguous date windows to hide optical information. Where claiming an unseen-period evaluation, remove labels from those windows across all areas used for training, rather than leaving same-period labels available elsewhere without disclosure. Tune choices on separate development windows; freeze final windows before testing.

Candidate durations: 10, 20, 30, and 60 days. Use only durations supported by actual withheld clear-sky references. Record the number of evaluable windows and targets in each category.

### Information availability

- Persistence uses only the last retained optical value before a target date.
- Retrospective interpolation can use retained observations on both sides.
- Radar models use the declared matched radar inputs.
- If calendar features are included, compare against a calendar-only model.
- If lagged optical values are included, rebuild them after hiding targets and include their age.
- No hidden target may remain in smoothing, interpolation inputs, rolling statistics, or model fitting.

Do not discard difficult edge cases silently. If interpolation has no bracketing observations, mark it unavailable. Report performance on the common evaluable subset and each method's availability, rather than implying that unmatched sample sets are directly comparable.

### Deliverables

- Saved train/validation/test assignments and final gap-window list.
- Evaluation specification: target dates, eligible inputs, exclusions, comparisons, and metrics.
- A runnable check that groups are separated and masked target values do not enter training or derived features.

### Completion check

Another person can identify exactly what the model will and will not know for every final test target.

## 8. Phase 4 — Run the minimum useful model comparison

Suggested date: initial run by late 26 September; finish on 27 September. Dependency: frozen development/evaluation design.

### Baselines first

1. Last-observation persistence.
2. Linear interpolation for the retrospective setting.
3. Linear regression using radar inputs.

### Primary ML model

Random Forest regression with a small, documented feature set and bounded hyperparameter search. Candidate features are VV, VH, an appropriate ratio/difference, acquisition geometry, and optional seasonal information.

Do not divide decibel values as if they were linear powers. Record the representation used. Keep feature processing identical between fitting and prediction.

If seasonal features are included, add a seasonal-only comparison. If optical history is included, compare against radar-only or history-only features so the value of radar is visible.

### Additional ML comparison: XGBoost

Once the core pipeline works, fit XGBoost regression using the same features, references, spatial/temporal splits, and scoring dates as Random Forest. Give each a bounded, documented tuning budget. Use validation data for tuning and any early stopping; do not use final test results to select or repeatedly revise the model.

Select the model for the app using validation evidence, considering prediction error and practical complexity. Report both frozen models on the final test set, even if XGBoost adds little or Random Forest performs better. There is no verified AGERS preference for either algorithm. The contribution is the independently evaluated finding, not the model name. Defer this comparison if it would compromise data quality, essential baselines, or manuscript review.

### Freeze procedure

- Select the model, features, and hyperparameters using training/validation data only.
- Save the chosen model, configuration, software versions, random seeds, and dataset identifier.
- Evaluate the frozen model on the final test data.
- Preserve every final prediction and its reference value.

### Important interpretation of gap duration

A radar-only model does not consume optical history at prediction time. Removing a longer optical interval therefore does not inherently make its inputs worse. The gap experiment mainly tests how it compares with history-dependent baselines over the selected targets. If the model is refitted with fewer references, that is an additional change in training information and must be described separately.

### Deliverables

- Baseline predictions and primary-model predictions.
- Model artifact and exact run configuration.
- Initial metrics and failure inspection.

### Completion check

Results are reproducible, use the declared inputs, and include simple methods. No arbitrary R² target determines whether the experiment is valid.

## 9. Decision gate — End of 26 September

### Continue the October ML submission if

- Multi-area data have been processed and inspected.
- An independent evaluation design is frozen.
- Baselines and a first Random Forest run work.
- Remaining experiments are bounded and can finish with time for manuscript review.

### Narrow or defer if

- Only the original 23 optical dates remain available.
- Access, alignment, preprocessing, or reference quality remains unresolved.
- The proposed result relies on random pixel splitting or test-set tuning.
- The study cannot be reviewed before the deadline.

If data are adequate but ML performs poorly, continue the honest comparison if it answers a useful question. Readiness must not depend on manufacturing favourable accuracy.

Fallback: preserve the original manuscript as a candidate for review, or defer the ML paper. The existing paper still needs author and venue review; it is not automatically submission-ready. Do not replace a failed data pipeline with an unvalidated anomaly detector to retain an ML label.

## 10. Phase 5 — Finish analysis and freeze the evidence

Suggested dates: 27–28 September. Dependency: working comparisons.

### Actions

1. Calculate MAE, RMSE, mean signed error, and supporting R² on the same declared target sets.
2. Break down performance by geographic group and supported gap duration; report sample counts.
3. Report estimate availability separately from numerical accuracy.
4. Inspect representative good and poor predictions, including low-NDVI observations and large pairing offsets.
5. Test the essential sensitivity: stricter timestamp matching and/or the feature comparison needed to attribute benefit to radar.
6. Summarise variability by meaningful block/group units. Do not treat correlated pixels or overlapping windows as independent replicates.
7. Record where references are absent and no direct accuracy statement is possible.
8. Freeze final results by 28 September. After that, permit corrections to actual errors, not discretionary searching for a better-looking result.

### Minimum useful figures and tables

| Output | Purpose |
|---|---|
| Map of blocks and geographic split | Shows where the evidence comes from |
| Data inventory and exclusion table | Makes sample selection and losses transparent |
| Method comparison table | Shows whether ML adds value |
| Error versus supported gap duration, with counts | Shows conditions and limits |
| Held-out time-series example | Compares estimates with real withheld references |
| True missing-observation example | Demonstrates applicability while marking unknown error |

A scatter plot or additional app screenshot is optional if space permits. Do not fill the paper with redundant plots or generic app screens.

### Completion check

The team can write an evidence-based answer to each research question, including a negative or limited answer. Numerical claims can be traced to saved predictions and scripts.

## 11. Phase 6 — Add the minimum app demonstration

Suggested dates: 27–28 September after the output contract is stable. Dependency: source-linked research predictions. Can overlap writing preparation.

### What the user actually does

1. Opens a saved research field using the exact study polygon.
2. Opens the historical study period, initially 2021 if agreed.
3. Views observed NDVI and gaps.
4. Enables or views separately styled estimates for eligible target dates.
5. Taps an estimate to inspect its target date, radar input date, method/model version, and provenance.
6. For a controlled test example, views the separately identified held-out reference and difference.

Training fields do not need to be hand-drawn through the mobile app. Study geometry should come from the same saved files used in the experiment.

### Minimal implementation strategy

Inspect the existing field-detail screen, chart, data flow, and complete-pair behaviour before changing code. Reuse existing components and field identity handling.

For the conference demonstration, a versioned research-results snapshot is sufficient if the app honestly labels it as historical research output. This avoids making a live model-serving service a prerequisite for the paper. Use the existing supported data-delivery mechanism where possible.

A research snapshot contains real saved outputs and provenance; it must not be confused with synthetic demonstration values. It does not establish live service reliability.

### Output contract

- Field/block ID and geometry version.
- Target date/time.
- Numeric estimate or explicit unavailability.
- Radar source date/time and product identifiers.
- Model/run version.
- Processing provenance and eligibility reason.
- Evaluation role where appropriate: held-out prediction versus later full-data application.

For a bounded first implementation, reconstruct eligible missing optical acquisition dates with the declared radar pairing tolerance. Do not automatically invent daily observations. Display the target date and actual radar date separately.

If a final model is retrained on all available references after evaluation, its fitted values must not replace saved held-out predictions in accuracy plots. Keep those artifacts and roles separate.

### Display rules

- Observed values remain unchanged.
- Estimates have a text label and visually distinct marker/line treatment; colour alone is insufficient.
- Unavailable dates remain unavailable when input requirements fail.
- Estimated NDVI does not create a measured NDMI companion or a complete measured pair.
- Uncertainty numbers are shown only if a corresponding method was evaluated.
- No disease or treatment recommendation follows automatically from an estimate.

### Integration checks

- The selected polygon matches the research geometry.
- The displayed period and dates match the saved data, including timezone handling.
- Values and labels match the exported results.
- Zero values remain valid numbers and are not treated as missing.
- Empty/unavailable results do not silently become estimates.
- Selecting another field cannot display the previous field's predictions.
- Held-out references are revealed only as evaluation evidence, not used to generate the saved predictions.
- Run the demonstration on the platform claimed in the paper. A screenshot or web test alone does not prove native-device operation.

### Completion check

The app can replay the selected historical research result correctly. If it cannot, describe only the offline analysis and any actually completed UI work; do not claim a working integrated ML system.

## 12. Phase 7 — Rewrite the paper around the finished experiment

Suggested date: skeleton and related work on 25–27 September; final methods/results/discussion on 28–29 September.

### Actions

1. Rewrite the problem statement around optical unavailability and tested radar estimation.
2. Use existing 2021 availability findings as motivation, with the original case scope intact.
3. Cite direct prior SAR-to-NDVI work. Do not claim that applying Random Forest is itself a new algorithm.
4. Describe site/year selection, mapped-rice limitations, sampling, quality, temporal pairing, spatial support, splits, models, and metrics.
5. Replace generic feature descriptions with the actual experiment and its results.
6. Explain failure cases, pairing uncertainty, clear-sky evaluation bias, limited geography/year, and the unknown error in genuinely cloudy intervals.
7. Describe app integration at the level actually verified.
8. Write the abstract and conclusion after the results are frozen.
9. Preserve the full thesis manuscript separately; conference length and campus thesis structure are different requirements.

### Contribution wording to substantiate

The paper evaluates how lightweight radar-based NDVI estimates compare with simple temporal methods over the sampled mapped-rice areas, identifies conditions where they help or fail, and demonstrates transparent delivery of the evaluated outputs where integration is completed.

This is an intended empirical contribution. Rewrite it to match the actual findings. Do not promise improved crop health, farmer decisions, or universal monitoring cadence.

### Deliverables

- Editable conference manuscript and rendered PDF.
- Source-linked bibliography.
- Final tables and figures generated from frozen result artifacts.
- A data/code availability statement that accurately describes what is shareable and actually released.

## 13. Phase 8 — Review and prepare submission

Suggested date: 30 September. Dependency: complete manuscript and frozen evidence.

### Scientific review

- Reviewer and authors understand the research question and approve the final scope.
- Counts agree between abstract, methods, tables, and conclusion.
- Accuracy numbers are independently reproducible from the saved predictions.
- Test data were not used for tuning or hidden inside derived features.
- Claims about clouds are supported by acquisition-specific evidence.
- Historical simulation, real missing observations, and operational deployment are clearly distinguished.
- The study's geographic and temporal limits are explicit.

### Submission review

- Correct 2026 template and page limit, including references where required.
- Correct author order, affiliations, contact details, and portal metadata.
- Compliance with any anonymity, declarations, or formatting requirements actually specified by the venue.
- Legible figures/tables and a visually inspected final PDF.
- No internal decision IDs, local scratch paths, unresolved placeholders, or invented results in the public paper.
- Final approval from all authors and the reviewer as appropriate.

### Deliverables

Final source, final PDF, submission metadata, and an archived evidence package. A draft uploaded to a portal is not a confirmed submission; after an authorised submission, retain its receipt and verify the portal status.

## 14. Definition of submission-ready

- [ ] Scope and historical period agreed.
- [ ] Dataset sources, licences, selection, and processing recorded.
- [ ] Local imagery processed and inspected; not just catalogued.
- [ ] Independent evaluation and masks saved before model selection.
- [ ] Baselines and Random Forest evaluated fairly.
- [ ] Final predictions, references, metrics, and figures retained.
- [ ] Missing data, cloud attribution, and uncertainty described honestly.
- [ ] App claims match completed integration and platform checks.
- [ ] Methods, results, discussion, abstract, and conclusion agree.
- [ ] Closely related work cited and contribution accurately positioned.
- [ ] Current venue requirements confirmed and met.
- [ ] Authors have reviewed the final PDF and submission metadata.

Completing this list makes the work ready for submission; it does not establish conference acceptance.

## 15. Calendar summary

| Date | Research/data | Application | Writing/review |
|---|---|---|---|
| 25 Sep | Scope, access, one processed pilot | Inspect existing flow only | Reviewer alignment, venue rules, paper outline |
| 26 Sep | Expanded data, splits, first comparisons, readiness decision | Agree result fields and display behaviour | Draft data/methods from frozen choices |
| 27 Sep | Final comparisons and supported gap tests | Implement historical result display | Related work and preliminary tables |
| 28 Sep | Failure inspection and result freeze | Verify claimed demonstration | Final figures and results |
| 29 Sep | Reproducibility check | Fix actual integration defects only | Complete manuscript |
| 30 Sep | Resolve review questions | No discretionary additions | Author/reviewer review, PDF and portal checks |
| 1 Oct | Submission buffer | — | Authorised submission and receipt verification |

This is an aggressive schedule conditional on a working pilot and team availability. If read after 25 September, adjust the dates rather than treating missed tasks as completed. Do not assume the conference deadline will be extended.

## 16. What to defer first if time is short

Defer additional algorithms, a 2023/2024 extension, deep-learning architectures, live model serving, NDMI prediction, complex uncertainty modelling, and UI polish beyond clear accessible presentation.

Do not defer source/quality checks, leakage prevention, essential baselines, honest error reporting, author review, or venue compliance. Narrow the paper's claims if app integration is incomplete.

## 17. Existing handoff files and source references

Companion planning document, placed beside this roadmap in `matani-app/docs/`:

- [matani-ml-direction-agent-brief.md](matani-ml-direction-agent-brief.md) — comprehensive rationale and dataset assessment.

Supporting artifacts remain in `/Users/billy/Documents/Codex/2026-09-25/new-chat/outputs/`; they are not copied into the project with these two documents:

- `dataset-access-notes.md` — verified access checks and limitations.
- `krangkeng-2021-sentinel1-catalogue.csv` — public radar inventory.
- `krangkeng-2021-radar-optical-date-matches.csv` — approximate date matches.
- `sen12tp-java-candidates.csv` — supplementary benchmark candidates, not verified rice samples.

Project root: `/Users/billy/codeOS/projects/matani-app`. Read its current `AGENTS.md`, canonical research protocol, and working-tree status before authorised implementation. Adding these planning documents does not implement model/application changes, amend the protocol, or supersede approved research decisions.

Key sources:

- [AGERS 2026](https://r10.ieee.org/indonesia-grsaes/agers-2026/)
- [Open-SEA-Rice-10](https://zenodo.org/records/14627003)
- [Sentinel-1 processing](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S1GRD.html)
- [Sentinel-2 SCL categories](https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/scene-classification/)
- [Sentinel-2 harmonized archive](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED)
- [Cross-validation guidance](https://scikit-learn.org/stable/modules/cross_validation.html)
- [Random Forest documentation](https://scikit-learn.org/stable/modules/ensemble.html#random-forests-and-other-randomized-tree-ensembles)
- [XGBoost documentation](https://xgboost.readthedocs.io/en/stable/tutorials/model.html)
- [Mohite et al., 2020: SAR-to-NDVI regression including rice](https://isprs-archives.copernicus.org/articles/XLIII-B3-2020/1379/2020/)
- [Roßberg and Schmitt, 2023: SEN12TP and global SAR-to-NDVI estimation](https://link.springer.com/article/10.1007/s41064-023-00238-y)

**Immediate next deliverable:** an agreed one-page scope and a correctly processed local radar/optical pilot. These determine whether the rest of the October plan is executable.
