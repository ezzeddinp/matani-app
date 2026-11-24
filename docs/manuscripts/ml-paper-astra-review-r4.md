# GPT-6 Astra review, round 4

**Date:** 2026-09-28 · **Model:** GPT-6 Astra, high reasoning, read-only · Reviews the round-3 fixes and the final official run `team-run-v2-final`.

**1. Verdict**

**Not CLEAN.** No Blocker or Major remains; three Minor documentation/wording issues and one Nit remain below.  
The final run is correctly bound and its results reproduce. Self-training does not invalidate the evaluation, and no finding requires retraining.

**2. Verification and findings**

Review was read-only. Pre-existing staged, unstaged and untracked changes were preserved; no repository files were created, edited or deleted.

- **Run binding:** all saved dataset files match the handoff manifest, and the saved harness matches the current harness. The prediction SHA-256 is `2ceb7897b7248d9da2f3375c37689aa4a008ef398c555ee4664f3884a6fbecff`, matching `env.txt`, [OBS-83](/Users/billy/codeOS/projects/matani-app/.agent/evidence-register.md:534), the evaluation summary and numbers JSON.
- **Gate:** the actual checker accepts `team-run-v2-final`. It rejects earlier runs lacking required hashes, an in-memory substitution of v1 predictions beside final-v2 metadata, and an in-memory substitution of the v1 training-data hash. The shell’s `set -e` and ordering place rejection before evaluation. All four binding tests passed with filesystem operations redirected into memory.
- **Numerical reproduction:** all six evaluation files reproduced **byte-for-byte in memory**. Every numbers-JSON field reproduced within `1e-12`; all **71** numerical/table checks passed. Additional checks confirmed ungated claims, including **12–26 rows per pool block**, the persistence comparison, sampling counts, and Krangkeng’s **71 acquisitions / 23 qualifying dates**. No numerical mismatch was found.
- **Provenance:** the manuscript header, [DEC-57](/Users/billy/codeOS/projects/matani-app/.agent/context-dump.md:430), OBS-83 and [numbers JSON](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper-numbers.json:2) consistently identify the final team run and evaluation.
- **Other checks:** five evaluation tests and eight extraction tests passed. Independent checks confirmed matching and same-track, nonfuture history for **2,274 matched/apply rows**. All 23 references passed citation-presence and first-appearance-order checks; no section, table, figure or equation numbering error was found.

Self-training changes responsibility, not fold independence. The harness confines tuning to training tiles; all 24 saved configurations select their grid’s minimum inner-CV MAE. The relevant risk is adapting choices to outer-test results, as explained in the [scikit-learn nested-CV documentation](https://scikit-learn.org/stable/auto_examples/model_selection/plot_nested_cross_validation_iris.html). The claimed chronology that settings preceded all test inspection remains **unverified**. Contrary to the prompt’s premise, the current Methods paragraph—and existing DOCX—now disclose shared data-preparation and training responsibility.

Severity below describes the **remaining issue**; “—” means none.

| ID | Status | Severity | Location | Evidence | Fix |
|---|---|---|---|---|---|
| F7 | Resolved | — | [Paper IV-C](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:116) | Explicitly says “post-hoc sensitivity analysis.” Recomputed smallest-/largest-L interpolation MAE: **0.178879 / 0.191244**, both **n=475**. | None. |
| F11 | Resolved | — | [Paper V-A](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:142) | Discussion now refers to IV-C for regional/calendar results and concentrates on interpretation. Earlier conversational wording and persistence repetition remain removed. | None. No new material R1/R11 finding. |
| N2 | **Partial** | **Minor** | [Spec §8.3](/Users/billy/codeOS/projects/matani-app/docs/matani-ml-technical-spec.md:210) | Main provenance paths and roles are corrected, but the active implementation description still says **“B3 is the reviewer’s `rf F2` run.”** B3 actually comes from the final team predictions. No active superseded-run path was found in the four requested working documents. | Attribute B3 to the team’s official `rf F2` run; retain reviewer attribution only in explicitly historical text. |
| N3 | Resolved | — | [Binding checker](/Users/billy/codeOS/projects/matani-app/research/scripts/check_run_binding.py:19); [rebuild gate](/Users/billy/codeOS/projects/matani-app/research/scripts/rebuild-ml-paper.sh:12) | All five hashes are required. Valid final run accepted; substituted predictions and mismatched dataset hash rejected read-only. The distributed v2 ZIP also contains the current harness. | None. This establishes artifact consistency, not independent proof of training chronology. |
| N4 | Resolved | — | [Paper III-E](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:66) | Explicitly states that the same research team prepared the dataset and trained the models. The sentence survives parsing and appears in the existing DOCX. | None. |
| N5 | Resolved | — | [Paper IV-B](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:96); [sensitivity calculation](/Users/billy/codeOS/projects/matani-app/research/scripts/make-ml-paper-figures.py:205) | Across all 11 evaluated methods, maximum absolute MAE change is **0.001144759890316**, for `rf F2`. Thus **“less than 0.0012”** is correct and now gated. | None. |
| N6 | Resolved | — | [Spec §1](/Users/billy/codeOS/projects/matani-app/docs/matani-ml-technical-spec.md:19); [§8.3](/Users/billy/codeOS/projects/matani-app/docs/matani-ml-technical-spec.md:200) | Correctly distinguishes radar-time availability, prediction invariance versus changing bin errors, and exploratory crossover based on paired-difference intervals. | None. |
| N7 | Resolved | — | [Handoff §10](/Users/billy/codeOS/projects/matani-app/research/ml-handoff/README.md:242) | Negative NDVI is described as **consistent with** flooding; field state and crop stage are explicitly unverified. | None. |
| F1 | Resolved; no regression | — | [History implementation](/Users/billy/codeOS/projects/matani-app/research/lib/cdse-s1.mjs:182) | Same-track grouping remains implemented. Independent history/matching checks passed. v1→v2 changes remain confined to five F1 columns in **28 ML rows / three blocks**. | None. |
| F2 | Resolved; no regression | — | [Paper III-G](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:74); [regional analysis](/Users/billy/codeOS/projects/matani-app/research/scripts/make-ml-paper-figures.py:178) | Per-tile and window-bootstrap results reproduce. Intervals explicitly condition on sampled regions and fitted models. | None. |
| F3, F4 | Resolved; no regression | — | [Paper III-D](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:62), [III-G](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:74), [V-C](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:154) | **383/792** positive radar offsets confirmed. Crossover remains exploratory and pointwise; the display rule requires prospective testing. | None. |
| F5, F6 | Resolved; no regression | — | [Spec §7.2](/Users/billy/codeOS/projects/matani-app/docs/matani-ml-technical-spec.md:162); [paper III-E/F](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:66) | Seed 0, 18/12 realized searches and the shared ceiling remain distinguished. “At or before” and explicit B1/B2 wording agree with implementation. | None. |
| F8, F9 | Resolved; no regression | — | [Paper III-F](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:70), [IV-C](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:116) | MAPE uses **656/700** rows. RF−persistence at 30–45 days remains **+0.006134**, CI **[−0.006533, +0.018167]**; the paper claims no detected difference, not equivalence. | None. |
| F10, N1 | Resolved; no regression | — | [Paper IV-D](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:132), [III-G](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:74) | “March NDVI peak” remains; crop-stage identification is unestablished. Unchanged predictions are separated from observed bin-level error behavior. | None. |
| F12 | Resolved; no regression | — | [Related Work](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:34) | Scarpa’s NDVI/causal–noncausal description remains supported by the [author record](https://www.iris.unina.it/handle/11588/705453). Pipia’s target remains correctly identified as LAI, supported by the [author manuscript](https://arxiv.org/abs/2012.02998). | None. |
| **N8 — new** | **Unresolved** | **Minor** | [Paper V-B](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:148) | “They **understate both the lowest and the highest NDVI**” contradicts the results. Low-tercile bias is **+0.140486**; high-tercile bias is **−0.164640**. Low NDVI is overestimated. This violates R7. | Say “They overestimate low NDVI and underestimate high NDVI,” or describe compression of the NDVI range. |
| **N9 — new** | **Unresolved** | **Nit** | [Paper header](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:4); [review instructions](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper-review.md:26); [build verifier](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/build-ml-paper.py:395) | Documentation claims exhaustive numerical checking and still says **70** checks. Actual count is **71**. An in-memory mutation from “12 to 26 rows” to “12 to 99 rows” still passes all 71 checks. The actual manuscript count is correct. | Describe **71 selected numerical/table checks plus manual verification**, and update the count. |
| **N10 — new** | **Unresolved** | **Minor** | [Spec dataset description](/Users/billy/codeOS/projects/matani-app/docs/matani-ml-technical-spec.md:36), [sampling rule](/Users/billy/codeOS/projects/matani-app/docs/matani-ml-technical-spec.md:75); [selector](/Users/billy/codeOS/projects/matani-app/research/scripts/select-ml-blocks.mjs:62) | Spec gives rice codes **−1/−2/−3**. The selector accepts **1/2/3**, and all stored `class_values` in `blocks-v1.geojson` are positive **1, 2, 3**. Implementing the written rule would select different/no blocks. | Correct the spec’s class codes to **1/2/3**. The implemented selection needs no change. |

**3. Author-only remaining actions**

- Obtain advisor/coauthor approval of scope, claims, authorship and responsibility disclosure; confirm the asserted pre-test freezing chronology, currently **unverified**.
- Confirm AGERS-specific page limit, template, anonymity and deadline time zone—**unverified** here.
- Inspect the final DOCX in Word or another native renderer; XML checks do not establish layout fidelity.
- Decide the release policy and keep the data/code availability statement accurate.


## Resolution (2026-09-28)

| ID | Action taken |
|---|---|
| N8 | Discussion V-B now says "they overestimate low NDVI and underestimate high NDVI", matching the tercile biases (+0.140 and −0.165). The build derives the sentence from those biases' signs, so it fails if they change (mutation-tested). |
| N9 | The header and review note now say "73 selected table rows and quoted values", with the remaining numbers checked manually. "12 to 26 rows" is now gated, and the "12 to 99" mutation is caught. |
| N10 | Spec §2.1 and §3 now give rice values 1/2/3 as implemented in `select-ml-blocks.mjs`. The selection is unchanged. |
| N2 | Spec §8.3 attributes B3 to the team's official `rf F2` run. |
