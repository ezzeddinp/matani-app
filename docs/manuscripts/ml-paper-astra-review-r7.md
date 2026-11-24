# GPT-6 Astra review, round 7 (draft 4)

**Date:** 2026-09-28 · **Model:** GPT-6 Astra, high reasoning, read-only · Reviews draft 4: reference-paper house style (R15), removal of review-trace wording (R16), the AI-use acknowledgment (DEC-58) and a full referee read.

**1. Verdict**

**Not CLEAN:** one new Minor disclosure issue remains, plus the nits below. No Blocker, Major or regression of an earlier scientific finding was found.
- All six evaluation files reproduced byte for byte; 569 numerical fields and 74 manuscript checks passed.
- Removing the bug history is honest, because the reported results use the corrected features.
- Removing the Mohite verification aside does not introduce an independence claim.
- All six PDF pages follow the listed reference conventions, with no visible clipping, overflow, orphaned captions or broken author block. The DOCX was inspected structurally; its native pagination remains **unverified**.

**2. Remaining findings**

| ID | Status | Severity | Location | Evidence | Fix |
|---|---|---|---|---|---|
| N17 | New | **Minor** | Acknowledgment | The disclosure identifies Claude and GPT and describes their activities, but does not identify the specific sections containing generated content. IEEE's current policy (https://journals.ieeeauthorcenter.ieee.org/become-an-ieee-journal-author/publishing-ethics/guidelines-and-policies/submission-and-peer-review-policies/) requires that identification and an explanation of the extent of use. The claims about actual assistance and human review remain **unverified**. | The authors should identify the affected sections, figures and code, mapped to the systems and assistance used. If drafting assistance covered the whole manuscript, say so explicitly after confirming it. |
| N18 | New | Nit | DOCX `word/styles.xml`; `build-ml-paper.py` author renderer | The DOCX `Author` style is **11 pt**, while `BodyText` inherits **10 pt**, and the author runs carry no size override. This contradicts R15's smaller author text; the PDF correctly uses 9 pt. It is a verified style mismatch, not proof of a broken author block. | Set the DOCX author size to match the convention, then inspect it in a native renderer. |
| N19 | New | Nit | III-C | Descending tracks 3 and 105 do cover exactly three tile-55 blocks. However, their mean local-incidence-angle pairs are **34.55°/48.04°, 31.55°/45.03° and 33.88°/47.43°**, so "near 35° and 48°" describes one block, not all three. The values come from the saved radar observations in `ml-dataset-v2/data/s1-observations.csv`. | Say "two descending tracks with different local incidence angles overlap three tile-55 blocks", or label 35°/48° explicitly as an example. The methodological rationale is sound. |
| N20 | Newly identified | Nit | IV-C, final sentence | "With no references hidden" describes L = 0, but the target reference is always hidden, as III-G and `evaluate_ml.py:54` correctly specify. The 700/774 count is correct. | Use "with only the target reference hidden" or "at L = 0". |
| N21 | New | Nit | Manuscript status; `paper-best-practice.md` date | The manuscript still labels itself **Draft 2**, and the rules still show **Updated: 2026-09-26** despite the 28 September R15/R16 additions. The working and frozen draft-4 MD, DOCX and PDF files match. The stale labels do not reach the rendered paper. | Correct the version label and the update date. |

**3. Author-only remaining actions**

- **Confirm chronology and responsibility.** III-E's authorship statement agrees with DEC-57 and the official run. The saved harness contains the stated grids, and all 24 configurations select the minimum inner-CV MAE. Nevertheless, "fixed in advance", particularly before inspecting outer-test results, remains **unverified** from snapshots and hashes. Keep it only with author confirmation and supporting records.
- **Approve the revised AI disclosure.** Confirm both systems' actual contributions, and the statement that the authors reviewed their outputs and checked the results. Repository review logs cannot establish every author's actions.
- **Inspect native DOCX pagination.** Its prose, italic affiliations, caption prefixes, three-rule tables and numbered lists are present. The supplied PDF is an HTML/Chrome render, so its clean layout does not establish the Word layout.
- **Confirm AGERS-specific submission rules:** page limit, paper size and template, anonymity and deadline time zone remain **unverified**. The adopted reference paper does not establish venue requirements.
- Obtain advisor and co-author approval, and settle the release policy. Keep the "tested but not deployed" qualification unless deployment and device checks are completed.

The review remained read-only. Independent checks covered 2,274 matched/apply rows and 3,032 radar conversions. 33 focused tests passed; one additional dry-run test was blocked by the sandbox's temporary-directory restriction, not by an observed application failure.

## Resolution (2026-09-28)

| ID | Action taken |
|---|---|
| N17 | The Acknowledgment now names the systems and maps them to specific content: Claude drafted and edited all sections (I–VI) and the captions, and wrote or revised the extraction, evaluation and figure code behind Tables I–III and Figs. 1–3; GPT and Claude models reviewed the method, code and results. The authors must still confirm it (DEC-58). |
| N18 | The DOCX author runs now carry a 9 pt size (`sz`/`szCs` = 18), matching R15 and the PDF. |
| N19 | III-C now reads "two descending tracks with different local incidence angles (about 32–35° and 45–48°)", which covers all three blocks. |
| N20 | IV-C now reads "with only the target reference hidden (L = 0)". |
| N21 | The manuscript status says Draft 5, and `paper-best-practice.md` is dated 2026-09-28. |
| III-E chronology | "with the search grids fixed in advance" became "using the search grids defined in the training script", which the saved harness can verify. |

**Completed afterwards:** the rebuild passed (74 checks), `npm run verify` passed, and the result was frozen as draft 5. Astra round 8 reviews it.
