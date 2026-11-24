You are an independent senior reviewer: a remote-sensing ML methodologist and a strict IEEE conference referee. Review a draft paper and the machine-learning pipeline behind it. Work read-only. Do not edit files, refit models into the existing evaluation folders, or change any split.

## Context
- The paper is for AGERS 2026 (IEEE, full paper due 1 October 2026, about 3 days away).
- The question: can Sentinel-1 radar estimate Sentinel-2 NDVI for small mapped-rice blocks in Java, and at what optical-gap length does it beat temporal interpolation?
- Design:
  - 42 pool blocks and 1 showcase block (Krangkeng), 792 radar–optical pairs, year 2021.
  - Leave-one-tile-out testing over 3 tiles, with tuning by GroupKFold on windows inside the training tiles.
  - Random Forest and XGBoost with feature sets F0 (current pass), F0+F1 (adds radar history; the primary set), F0+F1+F2 (adds calendar) and F2 (calendar only).
  - Baselines: persistence, linear interpolation, linear regression, calendar-only.
  - A gap-masking experiment with cluster-bootstrap CIs.
- Current results come from the reference training harness. The reviewer's own prediction run is pending and will be swapped in with `research/scripts/rebuild-ml-paper.sh`.

## Read first, in this order (all paths are relative to the repo root)
1. `AGENTS.md`: repo rules, including the provenance tags (EVID/OBS/DEC/HYP/CODE) and honesty constraints.
2. `docs/manuscripts/ml-paper.md`: the paper source. `output/pdf/matani-ml-paper.pdf` is the rendered version.
3. `docs/matani-ml-technical-spec.md`: the frozen method. §6 covers splits, §8 evaluation, §9 leakage controls and §10 known threats.
4. `research/ml-handoff/README.md`: the rules given to the model trainer (§5 is binding).
5. `docs/manuscripts/paper-best-practice.md`: the editorial rules and checklist (§3) that the paper must pass.
6. `docs/manuscripts/ml-paper-review.md`: open items and "deliberately not done". Do not re-report these as new findings.
7. `.agent/evidence-register.md` §9–10: source claims EVID-097–116 and OBS-76–78. Cited claims must stay within each entry's "permitted wording".

## Code to audit
- Extraction and features: `research/lib/cdse-s1.mjs`, `research/scripts/run-s1-extraction.mjs`, `research/scripts/select-ml-blocks.mjs`, `research/scripts/make-ml-handoff.py`, and `tests/s1-extraction.test.mjs`.
- Training: `research/ml-handoff/example_train.py`.
- Evaluation: `research/scripts/evaluate_ml.py` and `research/tests/test_ml_evaluation.py`.
- Figures and quoted numbers: `research/scripts/make-ml-paper-figures.py` and `docs/manuscripts/build-ml-paper.py`.
- Data, which is not in git: `research/private/ml-dataset/`, containing `ml-dataset-v1/`, `sanity-run/` (predictions and configs) and `evaluation-v1/`.

## Task A: Is the ML implemented correctly?
Verify against the spec, or show a concrete counterexample:
- **Leakage.** Check that no test-tile block or window reaches training or tuning, and that the showcase block never trains. Check that F1 history uses only earlier passes of the same orbit. Check that no optical-derived value is a feature, and that no normalization or imputation uses test statistics.
- **Tuning.** Inner GroupKFold must use windows from the training tiles only. XGBoost early stopping must use the inner validation fold only, and its final refit uses the mean inner tree count. Check that both learners get equal budgets and that the seeds are handled correctly.
- **Radar physics.** Averaging must happen in linear power before dB conversion. Check that `vh_minus_vv_db` is a log ratio, and that the incidence-angle, orbit and ±3-day matching rules (ties go to the earlier pass) are applied as documented.
- **Baselines.** B1 and B2 must never use the target date or observations inside the hidden window. B4 must be fitted fold-wise. All methods must be scored on the same common subset.
- **Statistics.**
  - Is the block bootstrap within tiles appropriate with only 3 tiles?
  - Does counting each event once per bin, at its smallest L, bias the per-bin comparisons?
  - The crossover rule scans 6 bins without multiplicity correction. Is that acceptable?
  - Is the MAPE restriction to references ≥ 0.2 appropriate?
  - The CIs ignore tile-to-tile variance. Should the paper say so?
- **Reproducibility.** Can a stranger reproduce `evaluation-v1` from the handoff files? Run `sh research/scripts/rebuild-ml-paper.sh research/private/ml-dataset/sanity-run/predictions.csv <new-dir-name>`. It should reproduce `evaluation-v1/metrics.csv` byte for byte and the build should pass. Delete your new directory afterwards.

## Task B: What would improve the model or the evidence before 1 October?
Rank the improvements by (value to the paper's claims) ÷ (hours). Examples:
- temporal smoothing of estimates
- quantile or ensemble uncertainty
- per-orbit models
- a hybrid radar-plus-last-optical-age model
- a ≤ 1-day matching sensitivity check
- a tile-level variance report

For each improvement, give:
- the expected effect
- the risk to validity
- whether it needs a new dataset or split version (anything that changes features, rows or splits is a new version, never an edit)
- whether it is feasible by 1 October

Never propose tuning on test results.

## Task C: Does the paper hold up?
- Check that every claim is supported by the tables, figures or cited evidence. Flag any overclaim, especially "first", generalization beyond 2021 or beyond mapped blocks, and statements about farmer benefit or deployment.
- Check that the method text matches the code exactly (best-practice rule R7). Name every mismatch.
- Run checklist C1–C17 in `paper-best-practice.md`. Pay particular attention to repetition (R1), explanations repeated across sections (the R11 loop check) and machine-sounding wording (R11).
- Assess whether the related work is fair and complete for SAR-to-NDVI and rice gap filling. Name missing key papers with a DOI.
- Judge whether the ~5-page A4 draft suits an IEEE AGERS paper.

## Output format (Markdown, concise)
1. **Verdict:** 3 lines covering whether the ML is sound, whether the paper is submittable with fixes, and the top risk.
2. **Findings table:** ID | Severity (Blocker / Major / Minor) | Area (A, B or C) | Location (file:line or paper section) | Problem | Evidence (code quote, number or command output) | Fix.
3. **Ranked improvements for Task B**, as a table.
4. **Suggested replacement sentences** for the paper, only where wording is wrong. Keep the existing impersonal, concise style.

Give only findings you have verified. Mark anything uncertain as "unverified" and say what check would settle it. Do not repeat the limitations already stated in the paper's Discussion B or in `ml-paper-review.md`.
