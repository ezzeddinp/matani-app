# GPT-6 Astra review, round 6 (CLEAN)

**Date:** 2026-09-28 · **Model:** GPT-6 Astra, high reasoning, read-only · Final verification after round 5.

**1. Verdict**

CLEAN — no Blocker, Major or Minor finding remains; only the nits below. No substantive earlier finding has regressed.  
Round-5 edits for N11, N12, N2 and N9 are verified; N11 now agrees with [Mohite’s Table 4](https://isprs-archives.copernicus.org/articles/XLIII-B3-2020/1379/2020/isprs-archives-XLIII-B3-2020-1379-2020.pdf).  
Read-only verification reproduced all six evaluation files byte-for-byte and 569 numeric fields within `1e-12`; 74 manuscript checks, 21 focused tests and independent history/matching checks on 2,274 rows passed. Pre-existing work was preserved.

**2. Remaining findings**

| ID | Status | Severity | Location | Evidence | Fix |
|---|---|---|---|---|---|
| N2 | Residual documentation issue | Nit | [Figure-generator usage](/Users/billy/codeOS/projects/matani-app/research/scripts/make-ml-paper-figures.py:3) | The evaluator’s requested correction is complete, but this executable example still selects `ml-dataset-v1`, `sanity-run` and `evaluation-v1`, writing into the working manuscript directory. | Update the example to the official v2 artifacts or explicitly label it historical. |
| N9 | Residual documentation issue | Nit | [Rebuild-script header](/Users/billy/codeOS/projects/matani-app/research/scripts/rebuild-ml-paper.sh:5) | Build docstrings correctly describe selected checks, but this header still promises “every table row and quoted number.” The actual checker covers 74 selected checks. | Use the same non-exhaustive wording here. |
| N13 | New | Nit | [Abstract](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:10), [IV-C](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:116), [Conclusion](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:158) | “Beyond 90 days” describes the **≥90-day** bin. Exactly **27 of its 171 events** have a 90-day gap. Methods and Table III correctly include the boundary. Independently excluding those events preserves the advantage in all three tiles. | Replace “beyond 90 days” with “at least 90 days”; align the wording-specific build checks. |
| N14 | New | Nit | [Introduction](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:18), [III-B](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:48) | Both passages state **71 acquisitions and 23 qualifying dates**. This is residual body-text repetition under R1, although the numbers are correct. | In III-B, say re-extraction reproduced the earlier acquisition inventory and qualifying dates, retaining the NDVI agreement tolerance. |
| N15 | New | Nit | [Technical spec §9](/Users/billy/codeOS/projects/matani-app/docs/matani-ml-technical-spec.md:220) | The heading points to runnable `research/tests/test_ml_splits.py`, which does not exist. Relevant checks instead reside in the harness, evaluator and extraction tests. | Link the actual check locations; no new test suite is required. |
| N16 | New | Nit | [Technical spec §2.4](/Users/billy/codeOS/projects/matani-app/docs/matani-ml-technical-spec.md:60) | Brinkhoff’s details remain labelled wholly “UNVERIFIED,” although the dated EVID-108 update records abstract verification and the manuscript uses those verified claims. Full-text coverage remains **unverified**. | Distinguish verified abstract claims from unresolved full-text details and link the EVID-108 update. |

**3. Author-only remaining actions**

- Obtain advisor/coauthor approval of scope, claims, authorship and responsibility disclosure. Pre-test freezing chronology remains **unverified** from file snapshots.
- Confirm AGERS-specific page limit, template/paper size, anonymity and deadline time zone; these remain **unverified**.
- Inspect the final DOCX in Word or another native renderer. Its prose matches the manuscript; layout fidelity remains **unverified**.
- Decide the data/code release policy and retain an accurate availability statement.
- Retain the current “tested but not deployed” app qualification unless production import and device verification are completed.
## Resolution of the remaining nits (2026-09-28)

| ID | Action taken |
|---|---|
| N13 | "beyond 90 days" became "at 90 days or more" in the abstract, IV-C and the conclusion, matching the ≥90-day bin. The build phrase was updated. |
| N14 | III-B now says the re-extraction reproduced "the earlier study's acquisition inventory and qualifying dates"; the 71/23 counts stay in the Introduction only. |
| N2 | The `make-ml-paper-figures.py` usage shows the official v2 artifacts. |
| N9 | The `rebuild-ml-paper.sh` header says "selected … (74 checks, not exhaustive)". |
| N15 | Spec §9 links the real check locations (harness and evaluator assertions, extraction, evaluation and binding tests). |
| N16 | Spec §2.4 separates the abstract-verified Brinkhoff claims (EVID-108 update) from the full-text details that remain unverified, and drops the unverified "NDVI among them". |
