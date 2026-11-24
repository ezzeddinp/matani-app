# External review of the Matani ML paper

**Updated:** 2026-09-28
**Scope:** Tasks A–C in [external-review-prompt.md](external-review-prompt.md).
**Status:** Non-canonical review of the current manuscript and reference-harness evaluation. Findings below cite repository locations; numerical audit observations are scoped to the files inspected on 2026-09-28. Recommendations are not implemented or approved decisions. Newly suggested literature needs evidence-register entries before adoption into the manuscript.

## 1. Verdict

**ML:** The split, tuning and baseline logic is largely sound, but radar history mixes relative orbits in three blocks.

**Paper:** Potentially submittable after substantive corrections; the numerical results reproduce, but several interpretations exceed the evidence.

**Top risk:** Presenting the pooled 60–90-day result as a reliable 60-day operational threshold.

## 2. Findings

Locations are relative to the repository root. Line numbers refer to the reviewed snapshot.

| ID | Severity | Area | Location | Problem | Verified evidence | Fix |
|---|---|---|---|---|---|---|
| F1 | Major | A | `research/lib/cdse-s1.mjs:181` | Same direction does not guarantee the same viewing geometry. F1 mixes relative tracks. | Three tile-55 blocks contain descending tracks **3 and 105**. In **28 ML rows**, at least one previous-two feature comes from another track. Row 654 uses current incidence **34.55°**, with previous passes around **48.04°**. | Construct history by block **and relative orbit** in a new feature/dataset version. Preserve the original run and report the correction. Accuracy impact remains **unverified** until the complete frozen-fold rerun. |
| F2 | Major | A | `research/scripts/evaluate_ml.py:75`; Methods III-G | The CIs condition on these tiles and fitted models; they do not quantify transfer uncertainty across regions. Resampling blocks also separates neighbouring blocks from their shared windows. | At 60–90 days, RF−B2 is **−0.0597, −0.0597 and −0.0036** across tiles. Tile 55’s block-bootstrap CI is **[−0.0337, 0.0353]**. | State the conditional interpretation explicitly; report per-tile gap results and a window-cluster sensitivity. Three tiles cannot support precise population-level regional uncertainty. |
| F3 | Major | C | Abstract; Discussion V-A/V-C; Conclusion | A binned retrospective comparison becomes an exact threshold and application recommendation. | The reported −0.042 pools gaps from **60 to 85 days**. It does not locate a continuous crossover. Also, **383/792** matched radar passes occur after the optical target timestamp. | Say “the first qualifying bin was 60–90 days.” Remove the proposed universal 60-day display trigger. Distinguish retrospective pairing from information available at the target time. |
| F4 | Minor | A | `research/scripts/evaluate_ml.py:250` | The first significant bin is selected using pointwise intervals across six bins. | No multiplicity adjustment is implemented. A six-bin Bonferroni percentile sensitivity still gives approximately **[−0.064, −0.020]** for primary RF at 60–90 days. | Label the crossover exploratory, or report simultaneous inference for a declared comparison family. The sensitivity supports the sign, not an exact threshold. |
| F5 | Minor | A | `research/ml-handoff/example_train.py:38`; spec §7; handoff §5.3 | The implementation and frozen contract differ on search effort and tuning seed. | RF searches **18** configurations; XGB **12**. Both satisfy the ≤30 ceiling, but realized effort differs. Inner tuning uses **seed 0**, whereas the spec states 42. Final seeds 0–4 are correct. | Document the actual protocol and resolve the equal-budget wording. Do not change configurations now merely to improve observed test performance. |
| F6 | Minor | C | `docs/manuscripts/ml-paper.md:66`; Methods III-F/G | Several method descriptions are not executable specifications. | The 60-day minimum includes the current pass: **193 rows** have age zero. B1/B2 use nearest eligible neighbours, not “every reference.” Per-bin deduplication retains the **smallest L**, which the paper omits. | Describe history as “at or before”; identify the nearest retained observations; state the smallest-L rule and half-open bin boundaries. |
| F7 | Minor | A | `research/scripts/evaluate_ml.py:226` | Smallest-L deduplication defines a particular sampling distribution within each bin. It is not neutral to the plotted error magnitude. | **379/2,207** event/bin combinations have alternative brackets. Keeping largest L instead changes B2 MAE at 60–90 days from **0.1789 to 0.1912**. | Disclose the estimand and retain a predefined sensitivity. This does **not** create unequal method subsets or demonstrate outcome-driven selection. |
| F8 | Minor | C | Methods III-F; Table II | MAPE’s denominator count is missing. | All pooled methods exclude **44/700** references; MAPE uses **656** rows. The spec explicitly requires exclusion counts. | Add the count. Restricting MAPE to NDVI ≥0.2 is defensible as a secondary, conditional metric; it does not describe low-NDVI performance. |
| F9 | Minor | C | Abstract; Results IV-B; Discussion V-A | Nonsignificance is described as equality or absence of benefit. | RF−XGB is **0.0001**, CI **[−0.0020, 0.0021]**. Calendar addition has an interval spanning zero. No equivalence margin is specified. | Use “no detectable difference” and “no clear improvement.” “The ranking held” should specify the baseline ordering; the detailed learner ordering changes between tiles. |
| F10 | Minor | C | Introduction; Methods III-C; Results IV-A/D; Discussion V-B | Physical interpretations are stated as confirmed observations. Some claims exceed their provenance entries. | The cited EVID-067/068/070 entries do not support the monsoon/early-growth timing claim. No field-stage labels establish “pre-transplanting flooding” or the ability to identify seasonal position. | Remove unsupported timing and phenology claims. Describe negative NDVI as **consistent with flooding**, not verified flooding. |
| F11 | Minor | C | Discussion V-A; Abstract; Conclusion | Repetition and emphatic wording fail the local editorial rules. | V-A repeats learner similarity, history gain, calendar comparison and crossover already reported in IV. “Needs exactly that” and “added nothing” are unnecessarily absolute. | Keep results in IV; retain interpretation in V. Preserve only the essential abstract/conclusion recap required by the checklist. |
| F12 | Minor | C | Related Work | Coverage is reasonable for rice, but omits relevant earlier fusion and gap-length evidence. | Scarpa et al. address NDVI reconstruction with causal/noncausal Sentinel fusion; Pipia et al. explicitly compare short and long optical gaps for LAI. Sources below. | Add a brief distinction between NDVI/rice evidence and related biophysical-variable gap filling. Keep novelty specific to this evaluation setting. |

### Verification and explicit no-findings

Audit observations, 2026-09-28:

- Reconstructed matching and all feature values for **all 792 rows**, exactly. Verified linear-power-to-dB conversion for **3,032 radar observations**. `VH−VV` in dB correctly represents the logarithm of the power ratio; provider documentation confirms linear input units. [CDSE documentation](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S1GRD.html)
- All handoff hashes matched. No outer-tile/block/window overlap, inner-window overlap, showcase training, optical feature input, or test-statistic normalization/imputation was found.
- XGBoost early stopping sees only inner validation data. Final fitting disables early stopping and uses the integer-truncated mean inner tree count. Configuration selection uses MAE; the unmodified XGBoost default stopping metric is RMSE. The paper should name both. Code: `research/ml-handoff/example_train.py:52–74`. [XGBoost parameters](https://xgboost.readthedocs.io/en/latest/parameter.html)
- B1/B2 exclude the target and hidden-window boundaries; B4 is fitted separately per outer fold. Comparisons use common event subsets. Code: `research/scripts/evaluate_ml.py:52–65`, `164–187`, `213–254`.
- The split CSV contains `block_id,tile,window,role`, rather than the explicit outer/inner fold columns specified in §6.2. Current group-derived splits are consistent, but the contract should describe that representation. Code: `research/scripts/make-ml-handoff.py:80`; `research/ml-handoff/example_train.py:63–80`.
- **12 focused tests passed:** 5 evaluation tests and 7 extraction tests. The requested rebuild ran in an isolated copy: **all six evaluation files were byte-identical**, and the build passed **65 numerical checks**, producing PDF and DOCX.
- Existing staged and unstaged work remained unchanged. Temporary evaluation directories and the isolated copy were deleted. No models were refitted.

Commands used for the focused checks:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest research/tests/test_ml_evaluation.py
node --test tests/s1-extraction.test.mjs
```

The successful rebuild command, executed from the isolated copy with temporary dependency-cache locations, was:

```sh
sh research/scripts/rebuild-ml-paper.sh \
  research/private/ml-dataset/sanity-run/predictions.csv \
  evaluation-external-review-3
```

The SHA-256 of the reproduced `metrics.csv` was:

```text
890309c80a6c6e3f1b13f939c84dfb1cf4728a9845b27ad45b8ead42883aad12
```

The window-cluster sensitivity retained the pooled 60–90-day RF result: **−0.0422 [−0.0629, −0.0226]**. It resampled the 14 windows within their tiles using the existing bootstrap mechanism, 2,000 resamples and seed 20260926. This is useful robustness evidence, not a remedy for having only three regional test units.

The six-bin Bonferroni sensitivity used the existing block-bootstrap draws with percentile bounds at `100 × 0.05 / 12` and `100 × (1 − 0.05 / 12)`, for the primary RF-versus-interpolation comparison. It was a diagnostic sensitivity, not a new confirmatory analysis or a correction across all model comparisons.

### Checklist C1–C17

| Result | Items |
|---|---|
| Yes | **C1** author layout; **C3** introduction scope/contribution; **C4** literature positioning; **C5** concise design choices; **C7** methods compression; **C9** decision rule stated; **C11** captions; **C14** principal limitation; **C16** conclusion structure; **C17** references cited |
| No | **C2** abstract overclaim; **C6** exact mechanisms; **C8** repeated numbers; **C10** table/text duplication; **C12** discussion restates results; **C13** recommendation exceeds evidence; **C15** absolute/conversational wording |

The rendered **five-page A4 PDF** is legible, with no visible clipping or overlapping content. Its length and technical scope are reasonable for a conference draft. AGERS-specific format compliance remains **unverified**, as already recorded in the existing review; the official page confirms the **1 October 2026** deadline. Checked 2026-09-28. [AGERS 2026](https://r10.ieee.org/indonesia-grsaes/agers-2026/)

### Related-work additions

These are review candidates checked on 2026-09-28, not additions to the canonical evidence register:

- **Scarpa et al. (2018), “A CNN-Based Fusion Method for Feature Extraction from Sentinel Data.”** DOI **10.3390/rs10020236**. Directly relevant NDVI reconstruction with causal and noncausal fusion; not a rice-specific regional-transfer benchmark. [Author institutional record](https://www.iris.unina.it/handle/11588/705453)
- **Pipia et al. (2019), “Fusing optical and SAR time series for LAI gap filling with multioutput Gaussian processes.”** DOI **10.1016/j.rse.2019.111452**. Relevant precedent for differing radar benefit across short/long gaps, but the target is LAI, not rice NDVI. [Author manuscript](https://arxiv.org/abs/2012.02998)

## 3. Ranked improvements for Task B

Hours are estimates. Expected benefits are hypotheses unless supported by the diagnostics above.

| Rank | Improvement | Expected effect / value | Validity risk | Version requirement | Feasible by 1 October? |
|---|---|---|---|---|---|
| 1 | Per-tile gap report, window-bootstrap sensitivity and conditional-CI wording; **1–3 h** | Strengthens the central claim; exposes weak tile-55 advantage. | Low if reported descriptively without model selection. | New evaluation output only. | **Yes** |
| 2 | Correct crossover, equivalence and MAPE wording; **1–2 h** | Removes unsupported conclusions without changing results. | Low. | No dataset/split change. | **Yes** |
| 3 | Correct relative-orbit history; **4–8 h** | Removes a verified geometry inconsistency. Accuracy improvement is unverified. | Choosing between original/corrected runs by test MAE would invalidate the correction. | **New feature/dataset version**; preserve spatial assignments and rerun all models. | **Likely**, if frozen immediately |
| 4 | Multiplicity and deduplication sensitivities; **2–4 h** | Tests stability of the headline against analysis choices. | Post-hoc sensitivities must be labelled; do not select the most favourable rule. | New evaluation version only. | **Yes** |
| 5 | ≤1-day matching refit; **4–8 h** | Separates temporal alignment from the existing offset-stratum comparison. | Fewer rows and changed sample composition complicate comparisons. | **New dataset version**; retain spatial groups. | **Possible** |
| 6 | Causal temporal smoothing; **6–12 h** | May reduce jumps; may also flatten real transitions. | Smoothing settings require inner-fold selection; bidirectional smoothing changes the information setting. | New model/postprocessing version; dataset version if inputs change. | **Technically possible; defer** |
| 7 | Calibrated prediction intervals; **8–16 h** | Adds individual-estimate uncertainty; five-seed spread is insufficient. | Calibration on outer predictions would leak test information into the method. | New training/calibration protocol; split version if partitions change. | **Tight; defer** |
| 8 | Per-orbit models; **8–16 h** | May handle geometry-specific relationships. | Small samples and tracks absent from training regions can make this worse. | **New dataset/training version** for orbit-specific row partitions. | **Defer** |
| 9 | Radar + last-optical-value/age hybrid; **12–24 h** | Potentially strong practical baseline for operational monitoring. | Optical features must be regenerated after masking; otherwise hidden observations leak. | **New feature/dataset version** and gap-aware protocol. | **Defer** |

## 4. Suggested replacement sentences

- **Abstract/conclusion:** “In the pooled masking experiment, 60–90 days was the first effective-gap bin in which radar estimates had lower MAE than retrospective interpolation.”
- **Abstract:** “These results support further evaluation of radar estimates for long retrospective gaps in the sampled blocks.”
- **Methods III-C:** “History features used acquisitions at or before the matched radar pass; the 60-day minimum included that pass.”
- **Methods III-F:** “For natural-gap evaluation, persistence used the nearest earlier qualifying observation, and interpolation used the nearest qualifying observations before and after the target date.”
- **Methods III-F:** “MAPE was computed for the 656 of 700 common-subset references with NDVI ≥0.2.”
- **Methods III-G:** “Each block–date pair contributed once per effective-gap bin, retaining the event with the smallest nominal masking length.”
- **Methods III-G:** “The intervals were conditional on the three sampled tiles and fitted models and did not quantify uncertainty across new regions.”
- **Results IV-B:** “No difference between the two learners was detected; the paired MAE difference was 0.0001 (95% CI −0.0020 to 0.0021).”
- **Results IV-B:** “Adding calendar terms produced no clear improvement once radar history was included.”
- **Results IV-D:** “The model missed the March NDVI peak and the two negative December references, whose values were consistent with flooding.”
- **Discussion V-B:** “The evaluation did not establish whether the estimates identify crop stage.”
- **Discussion V-C:** “The retrospective crossover does not establish a threshold for displaying estimates during an ongoing optical gap.”

## 5. Independent cross-check (2026-09-28)

Each numbered claim was re-derived from the repository files, without using the reviewer's scripts.

| ID | Result | Re-derived evidence |
|---|---|---|
| F1 | **Confirmed.** | `research/lib/cdse-s1.mjs:181` filters history by `orbit_direction` only. Three tile-55 blocks mix descending tracks 3 (mean incidence 38.5°, n = 612 block-passes) and 105 (46.8°, n = 111). 28 pool rows, all in tile 55, have a previous-pass feature from the other track. Row 654 has a current incidence of 34.55° and previous passes at 48.04° and 48.05°. The 60-day minimum mixes tracks for the same blocks. Spec §4.2's statement "each direction is a single relative orbit" held for Krangkeng only. |
| F2 | **Confirmed.** | RF − B2 at 60–90 days by tile: 42 −0.0597 [−0.082, −0.035]; 49 −0.0597 [−0.087, −0.031]; 55 −0.0036 [−0.034, +0.035]. The pooled crossover does not hold in tile 55, the same tile F1 affects; any link between the two is unverified. |
| F3 | **Confirmed.** | The 60–90-day bin contains effective gaps of 60–85 days. 383 of 792 matched radar passes fall after the optical timestamp. |
| F4 | Agreed. | There is no multiplicity adjustment; the reviewer's Bonferroni sensitivity was not re-run. |
| F5 | **Confirmed.** | `example_train.py:67` tunes with `seed=0`, while spec §7.2 says `random_state=42`. The configuration counts are 18 (RF) and 12 (XGBoost). The paper states those counts correctly. |
| F6 | **Confirmed.** | 193 rows have `days_since_vh_min_60d = 0`, and the smallest-L rule is not described in the paper. |
| F7 | **Confirmed, with a direction.** | B2 MAE at 60–90 days is 0.1789 when each event keeps its smallest L and 0.1912 when it keeps its largest (n = 475 either way). The rule in use is the conservative one: it makes interpolation look better, not radar. |
| F8–F11 | Agreed. | These are editorial and match the checklist. |
| F12 | **Metadata confirmed** through Crossref. | Scarpa et al., Remote Sensing 10:236 (2018); Pipia et al., RSE 235:111452 (2019). Content claims still need EVID entries. |

Severity agreed. F1 is a genuine feature bug: it follows neither the spec's intent ("same geometry") nor README §5.5, which says to fix a real bug and rerun everything. F2 changes how the headline must be reported.
