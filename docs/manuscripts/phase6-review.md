# Manuscript review checklist — Phase 7

**Updated:** 2026-09-17
**Status:** Full-paper editorial revision complete; thesis-team and advisor approval pending. [DEC-53; OBS-73]

## Deliverables and comparison

- [x] `phase6-paper.md` remains the canonical full-paper Markdown source, expanded in Phase 7.
- [x] `phase7-paper-standard.docx` is the preferred standard DOCX; `phase7-paper.docx` retains the template format; `../../output/pdf/matani-phase7-paper.pdf` is the rendered review copy.
- [x] 6,026 words from Abstract through Data and Software Availability, excluding title/authors/references; 36 references, seven tables, four numbered equations and one timeline.
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

## Editorial revision (2026-09-17; OBS-74)

- [x] Rewrote abstract, introduction, literature synthesis, system description, methods, results, discussion and conclusion for direct academic prose.
- [x] Replaced the internal block identifier with location, coordinates and area; explained the existing candidate-selection procedure. Exact identifiers remain in the research records.
- [x] Removed internal phase labels, troubleshooting conversation language and unexplained test-framework wording from the formatted manuscript.
- [x] Clarified that thresholds are inherited provisional application rules, with no new calibration or field-validation claim.
- [x] Preserved all 36 references and their existing support limits; no new external literature verification claimed for this editorial revision.
- [x] Checked unchanged source snapshot, numerical findings, citation order and complete text equality between Strict and standard DOCX copies. All eight pages of the standard DOCX render inspected.
- [x] Strengthened the manuscript check to reject internal identifiers, project phase labels and local paths in the rendered document text.

This revision improves prose and presentation. It adds no agronomic or usability evidence,
and does not certify human authorship or predict an AI detector's output. Author, advisor
and venue review remain open. Google Docs import was subsequently verified under OBS-75. The separate
chapter-based draft remains unchanged.


## Reference and import validation (2026-09-17; OBS-75)

- [x] All 36 sources identified in primary publisher, author repository or official records; 18 journal articles and 18 other sources. Per-source access and claim limits recorded in the reference audit.
- [x] Replaced generic links for references 11 and 13; updated reference 15 to its published journal version; corrected full source titles where needed.
- [x] Disclosed the NDMI source description/example-code band inconsistency; retained the study's B08/B11 calculation and frozen results.
- [x] All 137 cells have explicit left/right/top/bottom borders; 36 bibliography links are clickable in the standard DOCX and native Google Doc.
- [x] Native Google Docs import succeeded; readback confirmed seven tables, 36 links and all cell borders. Repaired 21 imported subsection alignments to match the template.
- [x] Inspected every page of both the local and final Google-exported eight-page PDFs; no overflow, clipped tables, broken column order or missing figure observed.
- [x] Template styles and A4 two-column layout compared with the supplied source. The source has different nominal continuous-section margins; LibreOffice renders both source and output with approximately 27 pt top margin. Standard conversion normalises margins to that effective layout, so it is not exact section-XML equivalence. Table rules are 0.5 pt rather than the sample's 0.25 pt. Google reflows line/page breaks; final-page columns are not balanced.

The checked source template is the formatting benchmark, not proof of compliance with a conference's current submission rules. Author details and venue requirements remain pending. Bibliographic identity and scoped claim support do not establish that every full text was reviewed, universal methodological validity, or comprehensive retraction clearance.

Native review copy: https://docs.google.com/document/d/1BdAlrWpf7DhGUnyRV6kGai6J3Sj1ck1S3yaq6JimNpg/edit
