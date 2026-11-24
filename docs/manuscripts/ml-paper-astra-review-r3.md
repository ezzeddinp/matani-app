# GPT-6 Astra review, round 3

**Date:** 2026-09-28 · **Model:** GPT-6 Astra, high reasoning, read-only · Reviews the fixes from round 2 (`ml-paper-astra-review-v2.md`), DEC-57 and the team training run.

**1. Verdict**

**Not CLEAN.** The team-run results reproduce, but N3 remains a Major provenance weakness for accepting incoming runs. Minor disclosure, numerical-wording and working-document inconsistencies also remain.
No Blocker was found. Self-training does not itself invalidate the evaluation, and these findings do not require another model-training run.

**2. Verification and findings**

The review was read-only; pre-existing staged, unstaged and untracked work was preserved.

- **Dataset:** all four hashes in `team-run-v2/env.txt` match both the `ml-dataset-v2` manifest and the actual files in both folders. The saved training script exactly matches the current harness.
- **Evaluation:** all six `evaluation-team-v2` files reproduced **byte-for-byte in memory**. Every field in `ml-paper-numbers.json` reproduced. All **70 numerical/table checks**, five evaluation tests and eight extraction tests passed. Nevertheless, one numerical bound outside those checks is inaccurate—N5 below.
- **Provenance:** the predictions hash is `d99aabeadbd904677b855123c34107da3b540cdfe8d78b9eea55989215beb196`, matching OBS-82 and the evaluation summary. The manuscript header and numbers JSON identify the correct team run; DEC-57 still identifies the old run.
- **Hash gate:** executing its actual Python block read-only accepted `team-run-v2` and `reference-run-v2`, and rejected `sanity-run` against v2. An **in-memory substitution of v1 predictions beside the team’s v2 metadata passed both the prediction checker and hash gate**. No file was changed.
- **Numbering/citations:** all 23 references pass citation-presence and first-appearance-order checks; no section, table or figure numbering error was found.

Self-training changes responsibility, not the statistical independence of the folds. The harness restricts tuning to training tiles and selects configurations by inner-CV MAE; all 24 saved configurations select their grid’s minimum. The relevant validity risk is adapting decisions to test results, consistent with [scikit-learn’s explanation of nested evaluation](https://scikit-learn.org/stable/auto_examples/model_selection/plot_nested_cross_validation_iris.html). The claimed chronology that settings preceded all test inspection remains **unverified** from current snapshots. The paper should disclose shared data-preparation/training responsibility without implying independent replication.

Severity below describes the **remaining issue**; “—” means none for the resolved item.

| ID | Status | Severity | Location | Evidence | Fix |
|---|---|---|---|---|---|
| F3 | Resolved | — | [Paper III-D](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:62), V-C:154 | III-D explicitly distinguishes information available at the radar pass from the optical date. Independently confirmed **383/792** positive offsets. V-C presents the display rule as requiring prospective testing. | None for the manuscript. See N6 for contradictory spec wording. |
| F4 | Resolved | — | [Paper III-G](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:74) | Calls the crossover an “exploratory summary,” states that intervals are pointwise and unadjusted, and conditions inference on sampled regions and fitted models. | None. |
| F5 | Resolved | — | [Spec §7.2](/Users/billy/codeOS/projects/matani-app/docs/matani-ml-technical-spec.md:162); [handoff §5.3](/Users/billy/codeOS/projects/matani-app/research/ml-handoff/README.md:119); [harness](/Users/billy/codeOS/projects/matani-app/research/ml-handoff/example_train.py:68) | Seed **0**, realized searches of **18 RF / 12 XGB**, and the common ≤30 ceiling are now distinguished. Saved configurations confirm those grid sizes. | None for the reported seed/budget discrepancy. |
| F6 | Resolved | — | [Paper III-E/F](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:66) | Uses “at or before the matched acquisition”; explicitly names B1 and B2. These descriptions agree with the history builder and baseline code. | None. |
| F7 | Partial | Minor | [Paper IV-C](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:116); [sensitivity function](/Users/billy/codeOS/projects/matani-app/research/scripts/make-ml-paper-figures.py:205) | Sensitivity is reported and reproduced: smallest-L B2 MAE **0.178879**, largest-L **0.191244**, both **n=475**. The code calls it post-hoc, but the paper does not explicitly disclose that qualification requested in round 2. | Introduce it as a **post-hoc sensitivity analysis**. |
| F9 | Resolved | — | [Paper IV-C](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:116) | “No difference … was detected” replaces equivalence wording and appears once. Recomputed RF−B1 at 30–45 days: **+0.006134**, CI **[−0.006533, +0.018167]**. | None. |
| F10 | Resolved | — | [Paper IV-D](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:132), V-B:148 | “March NDVI peak” replaces the season label; crop-stage identification is explicitly unestablished. | None for the paper. See N7 for the handoff’s stronger claim. |
| F11 | Partial | Nit | [Paper IV-C](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:116), V-A:142–144 | “Eventually loses” and the repeated persistence result are removed. R1 repetition remains: the tile-55 result and radar’s advantage over calendar in every bin are stated in Results and restated in Discussion. | Keep those findings in Results; retain only their interpretation in Discussion. |
| N1 | Resolved | — | [Paper III-G](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:74), V-A:142 | Prediction invariance under optical masking is separated from the observed similarity of errors across bins. | None for the manuscript. See N6. |
| N2 | Partial | Minor | [DEC-57](/Users/billy/codeOS/projects/matani-app/.agent/context-dump.md:430); [review instructions](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper-review.md:26); [spec](/Users/billy/codeOS/projects/matani-app/docs/matani-ml-technical-spec.md:4) | Header/JSON/OBS-82 agree on `team-run-v2`, but DEC-57 still says the primary result is `reference-run-v2`. Review instructions retain the old reference/evaluation pair. The spec still says nothing is trained, labels §7.2 and B3 as reviewer work, and directs §11 to v1. The handoff title still says v1. | Align active instructions and DEC-57 with OBS-82; explicitly label retained historical comparisons. Update document dates. Historical mentions such as the reviewer’s MAPE request need not be removed. |
| N3 | Partial | **Major— incoming runs** | [Hash gate](/Users/billy/codeOS/projects/matani-app/research/scripts/rebuild-ml-paper.sh:19); [harness metadata](/Users/billy/codeOS/projects/matani-app/research/ml-handoff/example_train.py:105); [OBS-81](/Users/billy/codeOS/projects/matani-app/.agent/evidence-register.md:528) | Dataset-version checking works for intact folders. However, `env.txt` contains only input hashes; the gate never hashes predictions. Verified virtual substitution of v1 predictions with v2 metadata passes. Thus the requested input-to-prediction binding is incomplete. This does **not** invalidate the currently verified team artifact. | Record the prediction SHA-256 alongside the input hashes after training and verify it before evaluation. Retain the mismatch/substitution regression check; correct claims that N3 is fully closed. |
| N4 | Unresolved | Minor | [DEC-57 disclosure requirement](/Users/billy/codeOS/projects/matani-app/.agent/context-dump.md:438); [paper III-E](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:66); [renderer](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/build-ml-paper.py:32) | Trainer identity appears in the internal header, which the renderer discards. Neither parsed publication text nor the existing DOCX states that the team prepared the data and fitted the models. There is no false attribution to an external trainer, but DEC-57’s disclosure is absent. | Add one Methods sentence: “The same research team prepared the dataset and trained the models using the fixed evaluation protocol.” |
| N5 | Unresolved | Minor | [Paper IV-B](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:96); [numerical checks](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/build-ml-paper.py:333) | “Changed no MAE by more than 0.001” is not literally true. Removing the two high references changes B3 RF-F2 MAE from **0.179150750** to **0.178005990**, an absolute change of **0.001144760**. The 70-check gate does not check this bound. The substantive sensitivity conclusion remains unchanged. | Say “changed every MAE by less than 0.0012,” or explicitly qualify rounding. Check this bound across every reported method. |
| N6 | Unresolved | Minor | [Spec §1](/Users/billy/codeOS/projects/matani-app/docs/matani-ml-technical-spec.md:19), §8.3:200 | The working spec still calls radar features “operationally valid” without the radar-time qualification, claims radar-only inputs make **error** independent of gap length, and initially defines crossover using separate MAE intervals. These conflict with corrected manuscript wording and the spec’s later paired-difference definition. | Replace the obsolete definitions with the implemented information-time, prediction-invariance and paired-difference descriptions. |
| N7 | Unresolved | Minor | [Handoff §10](/Users/billy/codeOS/projects/matani-app/research/ml-handoff/README.md:242); [paper limitations](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:148) | The handoff asserts that negative-NDVI rows “are flooded paddies at transplanting.” The evaluation establishes neither field state nor transplanting stage; these remain **unverified**, as the paper’s limitation acknowledges. | Use “consistent with flooding; field state and crop stage were not verified.” |

**3. Author-only remaining actions**

- Obtain advisor/coauthor approval of the scope, claims, authorship and responsibility disclosure.
- Confirm AGERS-specific page limit, template, anonymity and deadline time zone—**unverified** here.
- Open and inspect the final DOCX in Word or another native renderer; XML inspection does not establish layout fidelity.
- Decide the data/code release policy and retain an accurate availability statement.


## Resolution (2026-09-28)

| ID | Action taken |
|---|---|
| N3 | `example_train.py` also hashes `predictions.csv`. The new `research/scripts/check_run_binding.py` requires all five hashes and is tested in `research/tests/test_run_binding.py` (4 cases, including substituted predictions). The official run was re-trained as `team-run-v2-final` and passes. `team-run-v2` and `sanity-run` are rejected. OBS-81's input-only binding is corrected in OBS-83. |
| N5 | "changed every method's MAE by less than 0.0012", computed across all 11 reported methods (worst case: calendar-only, 0.00114) and gated by the build. |
| N4 | Methods III-E states that the same research team prepared the dataset and trained the models under the fixed protocol, with hashes linking predictions to training data. |
| F7 | Introduced as "a post-hoc sensitivity analysis". |
| F11 | Discussion V-A refers to Section IV-C instead of restating the tile-55 and calendar results. |
| N2 | DEC-57, `ml-paper-review.md` and the spec (status line, §7 headings, §11) now point to `team-run-v2-final`, `evaluation-team-v2-final` and ml-dataset-v2. The handoff README title uses the dataset version. |
| N6 | Spec §1 states the radar-time information setting and prediction invariance (not error invariance). §8.3 uses the paired-difference crossover definition, labelled exploratory. |
| N7 | The handoff README now says "consistent with flooded paddies; field state and crop stage were not verified". |
