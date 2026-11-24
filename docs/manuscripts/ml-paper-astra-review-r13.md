# GPT-6 Astra review, round 13 (CLEAN, draft 13)

**Date:** 2026-09-29 · **Model:** GPT-6 Astra, high reasoning, read-only · Scope: our integration of the reviewer's pipeline (DEC-61), not his ML process. The review text below is verbatim.

**1. Verdict**

CLEAN — no Blocker, Major or Minor finding remains; three Nits are listed below.  
N31–N38 are resolved in the manuscript, app copy and figures; supporting-text residue remains. Tables I–III reproduce, and all 13 pages across both PDF renders show no remaining layout defect.  
Read-only verification passed: 66 hashes, 83 number checks, 724 numerical fields, all CI outputs, 3,255 independent metric checks and 9 display tests. Both display implementations reproduce **52/20/24/8**, with eight estimates dated **3 January–20 February**. No repository files were changed.

**2. Findings**

| ID | Status | Severity (Blocker/Major/Minor/Nit) | Location | Evidence | Fix |
|---|---|---|---|---|---|
| N31/N33 | Partially resolved: supporting text remains stale | Nit | [DEC-62](/Users/billy/codeOS/projects/matani-app/.agent/context-dump.md:434); [display-rule comments](/Users/billy/codeOS/projects/matani-app/utils/estimate-timeline.ts:70) | DEC-62 still says the October–December gap “keeps interpolation.” Comments say users otherwise see interpolation/persistence and that radar “matched” interpolation from about 80 days. The renderer draws neither baseline, and the corrected paper appropriately reports no detected difference and provisional cutoffs. | Align the active decision record and comments with the corrected manuscript: these baselines inform estimate eligibility; the chart leaves this gap without estimates. |
| N39 | New | Nit | [III-H](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:84); [V-C](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:171) | “Before the first and after the last observation, where only persistence is possible” conflicts with III-F’s definition of persistence as **last observation carried forward**. Before the first observation, there is no previous value; carrying the first value backward is a different operation. The symmetry assumption and lack of separate evaluation are already disclosed, so this is a terminology issue. | Reserve LOCF for the trailing case; describe the leading case as an unevaluated symmetric extension or backward carry. |
| N40 | New; printed value unaffected | Nit | [IV-E](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:145); [figure calculation](/Users/billy/codeOS/projects/matani-app/research/scripts/make-ml-paper-figures.py:159) | The gap paragraph reports seed spread alongside its ten estimates, but `seed_range_mean` averages all **52** showcase passes: **0.01626317**. The ten in-gap passes average **0.01620974**. Both round to **0.016**, masking the calculation-scope mismatch. | Calculate the spread over the ten in-gap passes, or explicitly identify the 52-pass scope; make the number gate follow that scope. |

**3. Author-only remaining actions**

- Replace **REVIEWER-NAME** and confirm acknowledgment wording and contributor attribution with those concerned.
- Confirm actual AI contributions and human verification; these historical facts remain **unverified**. The disclosure identifies systems, sections, figures and code in the structure required by [IEEE’s policy](https://open.ieee.org/author-guidelines-for-artificial-intelligence-ai-generated-text/).
- Confirm co-author approval, submission exclusivity and AGERS-specific submission requirements. Microsoft Word pagination remains **unverified**; the inspected LibreOffice submission render has six pages.
- Confirm the intended data/code release policy. The current non-public-archive statement is explicit.

## Resolution of the remaining nits (2026-09-29, draft 14)

| ID | Action taken |
|---|---|
| N31/N33 residue | DEC-62 and the `utils/estimate-timeline.ts` comments now describe provisional cutoffs from fitted crossovers, state that the chart draws no baseline, say "no difference detected" beyond 60 days, and say "the chart shows no estimate" for the October–December gap. |
| N39 | III-H: persistence applies after the last observation; before the first observation the 20-day cutoff is "a symmetric extension that was not evaluated separately". V-C matches. |
| N40 | `seed_range_mean` is now computed over the 10 in-gap passes that IV-E discusses (0.0162, still printed as 0.016); `seed_range_in_gap_n` records the scope. |

Checks: 83/83 number gate. DOCX render 6 pages; Chrome review copy 7. Open XML SDK: 0 errors. `npm run verify` exit 0 (65 + 46 + 18 tests). Frozen as `ml-paper-draft14-*`.
