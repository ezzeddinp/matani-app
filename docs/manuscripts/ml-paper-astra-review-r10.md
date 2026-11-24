# GPT-6 Astra review, round 10 (not CLEAN, draft 9)

**Date:** 2026-09-28 · **Model:** GPT-6 Astra, high reasoning, read-only. The review text below is verbatim.

**1. Verdict**

Not CLEAN — four Minor findings remain; no Blocker or Major. The numerical ML results and Fig. 4’s displayed counts reproduce.
Matani adds a substantive but modest implementation contribution; the evidence supports a local prototype demonstration, not operational accuracy or user benefit.
DEC-59 is sound, and DEC-58’s disclosure structure is acceptable subject to author confirmation. Both supplied six-page renders were inspected without finding clipping, broken tables or detached captions.

**2. Findings**

Read-only verification matched all 31 manifest hashes, reproduced all six evaluation files byte-for-byte, checked 576 numerical fields and passed 77 manuscript checks and 30 focused tests. No repository files were changed.

The local database contains **71 measurements, 23 passing dates, 18 held-out comparisons and 32 applied estimates**. The importer removes 20 of 52 radar passes; the display rule removes another 20 and shows **12: three in January and nine within 13 October–17 December**. Geometry, NDVI/NDMI means, quality decisions, acquisition timestamps and source provenance match the snapshot. Fig. 4 is consistent with those values.

Contributions 1–2 carry the empirical novelty. Contribution 3 demonstrates how that evidence informs an application’s presentation policy. That is a defensible applied contribution for AGERS’s remote-sensing scope, but adding the application does not establish a separately validated decision-support benefit. The 60-day cutoff is defensible as an **exploratory prototype choice**, not an estimated universal crossover; its use for open-ended gaps remains unevaluated. [AGERS scope](https://r10.ieee.org/indonesia-grsaes/agers-2026/)

| ID | Status | Severity (Blocker/Major/Minor/Nit) | Location | Evidence | Fix |
|---|---|---|---|---|---|
| N24 | New | Minor | [III-H](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:84), abstract, contribution 3 and V-C; [detail panel](/Users/billy/codeOS/projects/matani-app/app/detail-lahan-page.tsx:351) | The paper says estimates are labelled with radar date and evaluated error. Those labels exist only in the selected-point panel; Fig. 4 shows neither. [OBS-87](/Users/billy/codeOS/projects/matani-app/.agent/evidence-register.md:553) explicitly records that this panel could not be opened in the web demonstration and that no physical-device verification occurred. Thus implemented metadata is presented without distinguishing it from demonstrated functionality. The stored MAE, 0.138, is correct and formats as ±0.14. | Distinguish the functioning chart demonstration from the implemented, undemonstrated detail panel. Alternatively, repair and verify access before retaining the unqualified labelling claim. Identify the error as pooled held-out MAE, not an individual prediction interval. |
| N25 | New | Minor | [Gap calculation](/Users/billy/codeOS/projects/matani-app/utils/estimate-timeline.ts:79); III-H | With no qualifying observations, `opticalGapDays` returns `Infinity`. Executing `gapEstimates` with either an empty measurement list or only rejected observations displayed the applied estimate immediately. III-H describes bracketing and one-sided intervals but omits this third case; no observed interval establishes 60 days. | Define and document the no-observation policy explicitly. If the stated 60-day eligibility requirement is retained, require an established interval before displaying estimates. Cover this case in the existing test. |
| N26 | New | Minor | [Seed mapping](/Users/billy/codeOS/projects/matani-app/research/scripts/seed-local-krangkeng-demo.py:91) | The seed writes `source_pixels` into `sample_count`, whereas [the measurement implementation](/Users/billy/codeOS/projects/matani-app/backend/measurement/statistics.js:50) defines it as valid samples. Read-only database comparison found **96 incorrect index-stat rows**, all on rejected dates. For 1 January, NDVI/NDMI sample counts are 36/9 although both valid counts are zero. Passing values and Fig. 4 are unaffected. | Map `sample_count` to `valid_pixels`; correct the affected local demo metadata and verify it against the snapshot. |
| N27 | New | Minor | [Importer precedence](/Users/billy/codeOS/projects/matani-app/research/lib/ndvi-estimate-import.mjs:128); [UI precedence](/Users/billy/codeOS/projects/matani-app/utils/estimate-timeline.ts:98) | The importer compares UTC calendar dates; the UI compares an estimate’s midnight timestamp with the measurement’s acquisition timestamp. Reproduced example: a 10 January estimate, bracketed by 1 November and **13 January 02:50 UTC** measurements, is discarded by the importer but displayed by the UI. A measurement arriving after import can therefore produce different eligibility. The current twelve-point demonstration is unaffected. | Use one time convention for the three-day rule in both paths, state it in III-H, and test the boundary with non-midnight acquisition timestamps. |
| F3 | Wording recurred | Nit | [Contribution 2](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:31); III-H | “Identifies the optical-gap length from which” is stronger than the implemented binned analysis. The first qualifying bin contains **475 events spanning 60–85 days**; no continuous crossover was estimated. III-G and V-A still correctly describe exploratory, region-dependent inference, so the earlier substantive limitation has not disappeared. | Say “identifies the first effective-gap bin with a pooled radar advantage.” Describe 60 days as the prototype’s chosen cutoff motivated by that result. |
| N21 | Recurred | Nit | [Manuscript status](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:4) | The working manuscript still identifies itself as Draft 6 and references round 9’s CLEAN verdict, although it matches frozen draft 9. This metadata is not rendered. | Identify draft 9 and distinguish its pending review from draft 6’s completed review. |
| N28 | New | Nit | [IV-E](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:146); [V-C](/Users/billy/codeOS/projects/matani-app/docs/manuscripts/ml-paper.md:166) | IV-E’s new demonstration claims lack the required provenance marker. V-C still cites OBS-77, which records the older, pre-import situation, rather than OBS-87. | Cite OBS-87 and DEC-60 for the demonstration and display-policy claims; retain code citations for implementation facts. |

**3. Author-only remaining actions**

- Confirm authorship, advisor/co-author approval, actual AI contributions and the claimed human revision and verification. DEC-58 identifies tools, sections and assistance categories as required by [IEEE’s disclosure policy](https://open.ieee.org/author-guidelines-for-artificial-intelligence-ai-generated-text/); factual completeness, including any assistance behind the new application demonstration, remains **unverified**.
- Confirm historical decision timing and the unpublished status of the related delivery-policy manuscript. These are **unverified** from snapshots. DEC-59’s Krangkeng measurements themselves reproduce; disclose related submissions if that status changes.
- Confirm AGERS-specific template, page limit, anonymity and deadline time zone; these remain **unverified**. Inspect the final Word export after corrections. The supplied DOCX render is legible, although its final page is sparsely filled.
- Settle the data/code release policy and retain the accurate local-deployment, unreleased-prototype and no-user-evaluation boundaries.



## Resolution (2026-09-28, draft 10)

Each finding was checked against the code and the local database before it was fixed. All of them were confirmed.

| ID | Action taken |
|---|---|
| N24 | Fixed rather than qualified. The web tap bug was fixed in `app/detail-lahan-page.tsx`: react-native-web passes the DOM click, so the web build now uses `clientX/Y` relative to the chart. Fig. 4 was recaptured with the panel open for the 13 December estimate: radar pass 14 December, "±0.14 NDVI", model version. III-H now says the panel shows the model's pooled held-out MAE, "an average error rather than an interval for that value". The abstract and contribution 3 say "the model's held-out error". V-C says the demonstration was a web build and was not checked on a phone. |
| N25 | With no qualifying observation, the gap now counts as 0, so no estimate is shown. The test "no established optical interval means no estimate (review N25)" was written first and seen to fail. III-H states the case. |
| N26 | The seed writes `valid_pixels` to `sample_count`. The 96 local rows were corrected, and all 142 index-stat rows for the demo field now satisfy `sample_count = valid_pixel_count`. |
| N27 | Both rules now count whole UTC calendar days, like the importer. The failing-first test uses Astra's 10 January / 13 January 02:50 UTC example. III-H states the convention. The demo still shows 12 estimates. |
| F3 | Contribution 2 now reads "identifies the first effective-gap bin in which radar estimates were more accurate than interpolation in the pooled data". III-H calls 60 days the prototype's cutoff, chosen because of that bin. |
| N21 | The status header identifies draft 10 and says draft 6 was the last CLEAN version. |
| N28 | IV-E cites [OBS-87; DEC-60]. V-C cites OBS-87 instead of OBS-77, and III-H adds DEC-60 and the code and test paths. |
| — | The acknowledgment now includes "the application code shown in Fig. 4", which was also AI-assisted. |

Checks: 77/77 number gate, `npm run verify` exit 0 (63 + 46 tests), `research/tests/test_run_binding.py` 4 passed, `tsc` clean. Both renders are 6 pages (Chrome PDF and LibreOffice DOCX). Frozen as `ml-paper-draft10-*` with `ml-paper-draft10-manifest.json`. The draft-9 Fig. 4 is kept as `ml-fig-app-draft9.png`; the draft-9 manifest's `ml-fig-app.png` hash refers to that file.
