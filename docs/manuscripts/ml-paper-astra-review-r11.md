# GPT-6 Astra review, round 11 (CLEAN, draft 10)

**Date:** 2026-09-28 · **Model:** GPT-6 Astra, high reasoning, read-only. The review text below is verbatim.

## 1. Verdict

CLEAN — no Blocker, Major or Minor finding remains. All seven round-10 findings are resolved; two new Nits remain below.  
The evidence supports the reported ML evaluation and a local web demonstration, without establishing phone usability, operational accuracy or decision-support benefit. No substantive regression from rounds 1–10 was found.

Verification completed without changing repository files:

- **N24:** the web coordinate fix is present; Fig. 4 shows the selected estimate panel. III-H correctly identifies pooled held-out MAE as an average error, not a prediction interval; V-C preserves the web-only limitation.
- **N25/N27:** all **7 focused tests pass**. Additional checks confirm the 59/60-day boundary for bracketed and one-sided gaps. Importer and display precedence use UTC calendar days.
- **N26:** all **142 local index-stat rows** match the snapshot’s valid counts and means; no sample-count mismatch remains.
- **F3/N21/N28:** the bin-level contribution wording, draft-10 status and provenance markers are corrected. The acknowledgment includes Fig. 4’s application code; OBS-87 records the update.
- **Reproducibility:** all **34 manifest hashes match**; working MD/DOCX/PDF equal their frozen copies. The read-only number gate passes **77 checks**; six evaluation files reproduce byte-for-byte in memory, and **576 supplementary numerical fields** reproduce.
- **Display:** Python and TypeScript reproduce **52/20/20/12**, split **3/9**, with **23 measured points**. The selected estimate is **0.256429…**, stored MAE **0.138**, descending orbit, version `team-run-v2-final`. Its acquisition is **13 December 22:25:48 UTC**, displayed as **14 December in WIB**.
- **Rendering:** all twelve pages across both supplied renders were inspected. Fig. 4’s panel is small but readable at column width; no clipping, broken tables or detached captions were found. The changed prose introduces no substantive R1/R7/R11/R15/R16 violation.

## 2. Findings

| ID | Status | Severity (Blocker/Major/Minor/Nit) | Location | Evidence | Fix |
|---|---|---|---|---|---|
| N29 | New | Nit | [DOCX](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.docx), `docProps/core.xml`; DOCX-render PDF metadata | Both retain the previous title, “Evaluating Satellite Observation Delivery for Rice Field Monitoring with Matani.” The visible manuscript title is correct. [The builder](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/build-ml-paper.py:112) inherits the template’s document properties. | Set the DOCX title property to the current manuscript title and regenerate the render. |
| N30 | New; frozen results unaffected | Nit | [Python replica](/Users/billy/codeOS/projects/matani-app/research/scripts/make-ml-paper-figures.py:268) | With an empty observation list injected in memory, `app_display` raises `IndexError`; TypeScript correctly returns no estimates. The replica matches the frozen Krangkeng data and calendar-day convention, but does not reproduce N25’s empty-input behavior. | Handle empty observations consistently, or explicitly state and assert this fixed-dataset helper’s nonempty-observation precondition. |

## 3. Author-only remaining actions

- Confirm authorship, advisor/co-author approval, actual AI contributions and the claimed human revision and verification. These remain **unverified**. The revised acknowledgment identifies tools, affected sections and code, consistent with the disclosure structure in [IEEE’s policy](https://open.ieee.org/author-guidelines-for-artificial-intelligence-ai-generated-text/).
- Confirm historical decision timing and the related delivery-policy manuscript’s unpublished/unsubmitted status; both remain **unverified** from artifacts alone.
- Confirm AGERS-specific template, page limit, anonymity and deadline time zone. Inspect the final submission file in Microsoft Word; Word-specific pagination remains **unverified** despite the inspected LibreOffice render.
- Decide the data/code release policy while retaining the current prototype and no-user-evaluation boundaries.



## Resolution of the remaining nits (2026-09-28, draft 11)

| ID | Action taken |
|---|---|
| N29 | `build-ml-paper.py` sets the DOCX title to the manuscript title and clears the template's subject, keywords and last-modified-by (a third-party name). Created/modified are set to the build time. Both PDF renders now carry the correct title. |
| N30 | `app_display` returns a gap of 0, so no estimate is shown, when there is no qualifying observation, as the TypeScript rule does. On the frozen data it still gives 52/20/20/12 and 3/9, identical to `ml-paper-numbers.json`. |
| — | IV-E: Astra noted that the selected estimate's radar pass was at 22:25:48 UTC on 13 December and the panel shows it in local time as 14 December. The sentence now says "the radar pass at 22:26 UTC that day (shown in local time as 14 December)", which is consistent with the paper's UTC-day rules. |

Checks: 77/77 number gate. Both renders are 6 pages, with the correct PDF title metadata. Frozen as `ml-paper-draft11-*` with `ml-paper-draft11-manifest.json`; the predictions, handoff and evaluation hashes are unchanged.
