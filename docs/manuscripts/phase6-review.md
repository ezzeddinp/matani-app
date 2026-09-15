# Manuscript review checklist — Phase 7

**Updated:** 2026-09-15
**Status:** Full-paper review draft complete; thesis-team and advisor approval pending. [DEC-53; OBS-73]

## Deliverables and comparison

- [x] `phase6-paper.md` remains the canonical full-paper Markdown source, expanded in Phase 7.
- [x] `phase7-paper.docx` is editable; `../../output/pdf/matani-phase7-paper.pdf` is the rendered review copy.
- [x] 6,287 words from Abstract through Data and Software Availability, excluding title/authors/references; 36 references, seven tables, four numbered equations and one timeline.
- [x] Previous PDF benchmark: approximately 5,800 pre-reference words, 38 references and 11 pages. Current draft: eight denser A4 template pages. Word and section coverage, rather than page count, establish expansion.
- [x] Introduction, rice literature, NDVI/NDMI foundations, DSS context, GROW, system architecture, methods and discussion expanded.
- [x] Original PDF/template and `phase6-thesis-chapters.md` preserved. Separate chapter expansion deferred. [DEC-53]

## Evidence and numerical checks

- [x] All 38 previous references screened; retained/replaced/omitted decisions recorded in `phase7-reference-audit.md`.
- [x] All 36 citations resolve, appear in numbered first-occurrence order and have a supporting location and claim boundary in `phase7-reference-audit.json` and the canonical evidence register.
- [x] Source-access limits explicitly recorded: some verification uses abstracts, author summaries or metadata. No claim that all 36 full texts were reviewed; no systematic-review claim.
- [x] Frozen snapshot digest and offline archive audit pass; `check-phase7.py` checks citations, counts, document structure, result constants and identical passing-date sets. [OBS-69–73]
- [x] 23/365 calendar coverage, 71 acquisition dates, 48 rejected pairs, 294 no-acquisition days, zero unresolved dates, 65-day maximum internal gap and separate 75-day leading absence preserved. Zero difference is not equivalence or an empirical policy benefit. [OBS-70]
- [x] Historical Teluknaga evidence remains separate. No measured agronomic accuracy, farmer usability or operational reliability is inferred. Independent delivery remains the offline comparator. [OBS-70–71]
- [x] Phase 5 test counts are dated engineering evidence; static SQL and host-stub JSX are not database/native-device validation. No app tests were rerun for this document-only phase. [OBS-71; OBS-73]

## Render and template checks

- [x] All eight final PDF pages visually inspected: no text overflow, wrong column flow, clipped tables/figure or unreadable references observed. [OBS-73]
- [x] Existing A4 template geometry and styles retained; source package parts outside documented editable slots preserved byte-for-byte. Strict OOXML requires namespace-aware package inspection; the bundled transitional-only text-diff extractor is not suitable for this template. [OBS-73]
- [x] Timeline uses frozen dates without interpolation; table/figure captions and equation cross-references resolve. [OBS-70; OBS-73]

## Remaining human review

- [ ] Thesis team verifies provisional title, author order, affiliations and contacts inherited from the previous PDF.
- [ ] Thesis team and advisor review scientific wording, source relevance and the zero-result interpretation.
- [ ] Confirm venue-specific page limits and submission requirements; this eight-page full-length draft makes no venue-compliance claim.
- [ ] Decide later chapter-based thesis expansion and campus formatting separately.

No automatic submission or academic acceptance is implied. [DEC-48; DEC-53]
