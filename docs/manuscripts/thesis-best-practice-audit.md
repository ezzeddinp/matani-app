# Thesis paper audit against paper-best-practice.md

**Audited:** `research/Thesis Matani.docx` (revised after the reviewer's 25 comments; file dated 2026-09-26)
**Rules:** [paper-best-practice.md](paper-best-practice.md)
**Result:** 18 of 25 comments are fully applied, 6 partially and 1 not applied. There are also 7 rule-level issues the reviewer did not comment on, several introduced during the revision.

## 1. Comment-by-comment status

| # | Status | Detail |
|---|---|---|
| 1 | Fixed | Muhammad Wildan added as the fourth author; 2 × 2 author table |
| 2 | Fixed | Buffer paragraph shortened (now split around Table VI) |
| 3 | Fixed | Discussion B shortened |
| 4 | Fixed | Table VII deleted |
| 5 | Partial | Replacement paragraph added, but Results D keeps two older paragraphs that repeat the recovery outcome (see R1 below) |
| 6 | Fixed | Principal limitation in one paragraph |
| 7 | Partial | Subsection deleted, but its content survives as the last paragraph of Discussion C ("By keeping all the original rasters, anyone can reproduce…") |
| 8 | Fixed | Verification shortened |
| 9 | Fixed | Further evaluation shortened |
| 10 | Partial | Caption fixed, but the old caption was pasted into the body under Fig. 1 ("…we found that the two delivery policies match perfectly…") |
| 11 | Fixed | Conclusion rewritten |
| 12 | Partial | Rewrite inserted, but the paragraph after Fig. 1 restates the 65-day and 75-day gaps ("blind spot", "absolutely no available observations") |
| 13 | **Not applied** | Discussion A still opens with the wrong definition: "Under the independent delivery policy, the system only displays a date if exactly one index qualifies." Replace it with "The two delivery policies differ only when exactly one index qualifies." |
| 14 | Fixed | Merged into the Methods D paragraph |
| 15 | Fixed | Positioning moved into the Introduction |
| 16 | Fixed | "proves" sentence removed |
| 17 | Partial | Methods E shortened and [35] removed, but [36] is still listed and never cited |
| 18 | Fixed | Table I deleted |
| 19 | Partial | Sentence added, but the old paragraph "Table III gives the possible display outcomes…" remains and points to a deleted table |
| 20 | Fixed | GROW section shortened, scope stated |
| 21 | Fixed | Research design shortened |
| 22 | Fixed | Zero-gain logic sentence added |
| 23 | Fixed | Geometry section shortened |
| 24 | Fixed | Table V deleted |
| 25 | Fixed | Acquisition section condensed to one paragraph |

## 2. Remaining issues by rule, in priority order

1. **R7, wrong definition.** Comment #13 above. This is a factual error.
2. **Dangling numbering.**
   - The text refers to "Table III", which was deleted.
   - The two remaining tables are still numbered IV and VI; renumber them I and II.
   - The equations are numbered (3) and (4) with no (1) or (2), because the NDVI and NDMI formulas are now inline; renumber them (1) and (2).
3. **R13, references.**
   - [28]–[34] and [36] are listed but no longer cited. Shortening Methods C and D dropped their citations.
   - The list jumps from [20] to [26] and from [34] to [36].
   - Fix: re-cite where the facts are still stated (Catalog API, dataMask and SCL in Methods D; GeoJSON in Methods C), delete the rest, and renumber consecutively.
4. **R1, repetition.**
   - The recovery outcome appears three times: Methods E, and Results D paragraphs 1 and 3. Keep the Methods sentence and one result sentence.
   - The gap statistics appear twice in Results B (the rewrite, then the "blind spot" paragraph).
   - The old Fig. 1 caption text is still in the body.
   - Table IV repeats the numbers in the sentence above it (365, 294, 71, 23, 48, 0). This is the same reason the reviewer deleted Table V; keep either the table or the sentence.
   - Literature B opens with two near-identical sentences ("Several studies connect…" and "Several studies highlight…").
   - Methods F defines a "buffer interaction" that is never reported.
5. **R5, claim size.** "Testing confirmed the system's reliability, with all … passing completely" overclaims, because passing tests show that the tested behaviors worked, not reliability. Suggested wording: "All 46 backend tests, 35 repository tests and the type and lint checks passed."
6. **R11, voice.**
   - There are 43 uses of "we" or "our", 2 contractions ("didn't", "doesn't") and several intensifiers ("perfectly", "absolutely", "completely", "simply", "actually", "just", "wiped out", "It is important to note", "Right now").
   - Most are in Literature A, the paragraphs after Fig. 1, Results D paragraph 1, Discussion A and Discussion C paragraphs 2–3. These are the passages the reviewer did not rewrite.
7. **Grammar.**
   - Literature A: "Different spatial resolutions offered by Sentinel-2 bands." (a sentence fragment), "This difference impacting…", "the matani system", "overtime" (should be "over time"), "this paper was strictly uses…".
   - Literature B: "While fulfill the gap techniques…".
   - Literature C: "The challenges … was reviewed" (should be "were reviewed").
   - Introduction paragraph 5: "By reporting this outcome, it helps check…" (dangling modifier).
8. **Formatting.** "VI. Conclusion" and "Data and Software Availability" have no heading style, and most body paragraphs lost their template style in the Google Docs round trip. Check the layout in Word before submission.

## 3. How this was checked

Text, tables and citations were extracted from the DOCX. Each comment's anchored passage was compared with the revised text. Citation coverage and phrase counts were computed by script; the other findings come from reading the extracted text.
