# GPT-6 Astra review, round 12 (not CLEAN, draft 12)

**Date:** 2026-09-29 · **Model:** GPT-6 Astra, high reasoning, read-only · Scope: our integration of the reviewer's pipeline (DEC-61), not his ML process. The review text below is verbatim.

## 1. Verdict

**Revision required — five Minor findings and three Nits remain; no Blocker or Major finding was verified.**  
Tables I–III and the CI outputs reproduce, but several statements overstate the evidence or misdescribe its scope. The collaborator’s modelling choices were treated as given.

Read-only verification: all **66 manifest hashes** match; **724 numeric fields**, all CI outputs and **85 number-gate checks** reproduce; all **9 display tests** pass. The **52/20/24/8** counts and eight dates, **3 January–20 February**, are correct. All pages of both renders were inspected. No repository files were changed.

## 2. Findings

| ID | Status | Severity (Blocker/Major/Minor/Nit) | Location | Evidence | Fix |
|---|---|---|---|---|---|
| N31 | New; equivalence-wording regression | Minor | [Abstract](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:10), V-A:159, Conclusion:175 | “The two learners did not differ,” “made no difference” and “matched interpolation” assert more than failure to detect a difference. RF−XGB is **−0.000761**, CI **[−0.002661, 0.001145]**; radar−interpolation beyond 60 days is **−0.009529**, CI **[−0.083164, 0.066468]**. Likewise, superiority “once” approximately 19 days old comes from the fitted line: both observed LOCF bins spanning **11–30 days** have CIs containing zero. | Use “no difference was detected.” Describe **19 days** as the fitted crossover and distinguish it from the observed advantage beyond **30 days**. Keep **79 days [58, 152]** explicitly exploratory; its upper limit exceeds the observed 100-day maximum. |
| N32 | New | Minor | [Indonesian display copy](/Users/billy/codeOS/projects/matani-app/app/detail-lahan-page.tsx:373); Fig. 4 | “Pada celah yang lebih pendek, nilai terukur di sekitarnya lebih akurat” says surrounding measured values are more accurate throughout shorter gaps. The evidence establishes interpolation’s advantage only through **60 days**, not every gap below 80; LOCF’s **11–20-day** CI includes zero. Before-first-observation carry-back was not evaluated, yet **all eight displayed estimates** occupy that case. | Remove the blanket accuracy claim. State that these are provisional display cutoffs, with the leading-gap application based on symmetry. Update Fig. 4 accordingly. |
| N33 | New | Minor | [III-F](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:76), [V-C](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:171); [chart renderer](/Users/billy/codeOS/projects/matani-app/app/detail-lahan-page.tsx:258) | The paper presents persistence/interpolation as what the application otherwise shows. The implemented chart draws dated measurement circles and eligible estimate diamonds; it does **not** draw interpolated or carried-over gap values. Fig. 4 confirms this distinction. | Describe persistence and interpolation as **evaluated alternative baselines** that inform estimate eligibility. Do not imply they are implemented gap-filling displays. No app feature addition is necessary. |
| N34 | New | Minor | [IV-D](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:139); [number gate](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/build-ml-paper.py:474) | Bias **+0.190 “below 0.2”** actually belongs to **0 ≤ NDVI < 0.2**, with **47 rows**. Including the eight negative references gives **55 rows** and bias **+0.246958**. The gate currently reproduces the incorrect bin label. | Say **“from 0 to below 0.2”** and update the gate’s expected wording. Retain the separate negative-reference result. |
| N35 | New | Minor | [III-G](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:80); `prepareExperiments.ipynb`, cell 5; `12SplitStrategyComparison.ipynb`, cell 0 | “Seeds capture model randomness only” is correct for the primary experiment, but not the adjacent split comparison. Random and window-grouped assignments change with **split seeds 0–4**, which also seed RF; tile-grouped evaluation uses **seed 0 only**. The reported comparison therefore averages **five, five and one** runs respectively. | Restrict the model-randomness statement to the primary experiment. State the split comparison’s repetition counts and that its seeds vary both partitions and models. |
| N36 | New | Nit | [III-E](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:72); [number gate](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/build-ml-paper.py:454) | “At most 0.001” is not literally true: XGB F0+F1 has seed-MAE SD **0.0010269638768**. Formatting the maximum to three decimals makes the gate accept this false bound. | Use **“approximately 0.001 at most”** or **“below 0.0011”**, with corresponding gate wording. |
| N37 | New | Nit | Fig. 2, page 4 in both renders; [figure script](/Users/billy/codeOS/projects/matani-app/research/scripts/make-ml-paper-figures.py:86) | Panel label **“(a)” overlaps the vertical “Radar − baseline MAE” title** in the figure and both PDF renders. Numerical marks remain readable. | Move the panel label away from the y-axis title and regenerate the figure. |
| N38 | New | Nit | [IV-B](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:102), Table II; [V-B](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:165) | R1/R3 repetition remains: IV-B repeats Table II’s RF **MAE/RMSE/R²** triplet; V-B repeats the **0.007** split difference already reported in IV-D. | Let tables retain the descriptive metrics; retain paired-difference inference in the prose. Discuss split optimism without repeating its number. |

The [six-page LibreOffice render](/Users/billy/codeOS/projects/matani-app/output/pdf/matani-ml-paper-draft12-2026-09-29-docx-render.pdf) and [seven-page Chrome review copy](/Users/billy/codeOS/projects/matani-app/output/pdf/matani-ml-paper.pdf) otherwise show no clipped tables or detached captions. Provenance tags are stripped, document titles are correct, and the empty-observation behavior remains fixed. The local-web, prototype and no-phone/no-user-evaluation boundaries remain explicit.

## 3. Author-only remaining actions

- Replace **REVIEWER-NAME** and obtain approval for the acknowledgment and contributor attribution. The placeholder is not counted as a defect.
- Confirm actual AI contributions and human verification. The acknowledgment identifies systems, sections, figures and code in the structure required by [IEEE’s disclosure policy](https://open.ieee.org/author-guidelines-for-artificial-intelligence-ai-generated-text/); the historical claims remain **unverified**.
- Confirm authors’ approval, submission exclusivity and AGERS-specific submission requirements. Inspect the final DOCX in Microsoft Word; Word-specific pagination remains **unverified**.
- Confirm the intended data/code release policy. The present non-public-archive statement is explicit.

## Resolution (2026-09-29, draft 13)

Each finding was checked against the code, notebooks and data before it was fixed, and all eight were confirmed.

| ID | Action taken |
|---|---|
| N31 | "Did not differ / made no difference / matched" became "no difference was detected". The 19 days is described as the fitted crossover with persistence, and radar as clearly more accurate beyond 30 days. The 79-day crossover is called exploratory, with an interval that extends beyond the observed range. Changed in the abstract, IV-C, V-A and the conclusion. |
| N32 | The Indonesian panel note drops the blanket accuracy claim. It now says the cutoffs are provisional, taken from the comparison with the nearest measured values, and that the gap before the first observation was not tested on its own. V-C states that all eight Fig. 4 estimates fall in that case. Fig. 4 recaptured. |
| N33 | III-F: the baselines are "the simple alternatives to a radar estimate". III-H names where interpolation or persistence is possible. V-C: "Matani draws neither baseline; the rules decide only whether an estimate is shown." The abstract says "two simple alternatives". |
| N34 | IV-D and the gate now say "+0.190 from 0 to 0.2"; the negative references are still reported separately. |
| N35 | III-G states that the random and window-grouped splits were each repeated with five seeds that vary both partition and model, and that the tile split ran once. The model-randomness statement is limited to the primary experiment. |
| N36 | "below 0.0011" (the maximum is 0.00103), and the gate rounds the bound up. |
| N37 | Fig. 2 panel labels are drawn as left-aligned axis titles, clear of the y-axis label. |
| N38 | IV-B no longer repeats Table II's MAE/RMSE/R², and V-B points to Section IV-D instead of repeating 0.007. The two matching gate checks were removed. |

Checks: 83/83 number gate. The DOCX render is 6 pages and the Chrome review copy 7. Open XML SDK: 0 errors. Display tests 9/9. `tsc` clean. Frozen as `ml-paper-draft13-*`; the reviewer-pipeline hashes are unchanged.
