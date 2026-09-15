# M3 focused literature comparison

**Updated:** 2026-09-15
**Decision:** DEC-45. **Status:** initial targeted review, not a systematic review or proven novelty claim.

Eight primary research papers and one official system manual were reviewed at the
explicitly named evidence depth below. Search families: Sentinel-2 rice monitoring,
agricultural DSS/mobile delivery, usable optical observations and design-science
evaluation. Select sources with a direct relationship to the proposed evaluation;
exclude commercial marketing, unverified superiority claims and unrelated AI features.
Search and screening occurred on 2026-09-10. Full-paper comparison remains necessary
before asserting that an implementation capability is absent from prior work.

The evidence register EVID-047-055 owns each exact short supporting passage, primary
URL, checked date and permitted factual wording. **NR means not reported in the reviewed
excerpt, not absent from the paper or system.** No candidate below was reimplemented
or experimentally beaten by Matani.

| Study / evidence | Data and geography | Question / evaluation reviewed | Dates, quality, gaps, provenance in reviewed text | Implication for Matani (review interpretation) |
|---|---|---|---|---|
| FEDS, Venable et al., DOI 10.1057/ejis.2014.36; EVID-047 | IS design-science cases; no satellite dataset | Evaluation framework; full Dimension 2 section and strategy discussion | Not a satellite comparator; artificial/naturalistic distinction explicit | Controlled tests support technical claims; cannot replace evidence for claims about people |
| Prat et al., PACIS 2014 paper 23; EVID-048 | Corpus of 26 IS papers | Evaluation-criteria synthesis; abstract reviewed | Satellite-specific dimensions not applicable | Select explicit artifact properties rather than treating app completion as evaluation |
| IrrigaSys, Simionesei et al., 2020; EVID-049 | Weather, soil-water model, Sentinel-2; southern Portugal | System structure and five-year deployment account; abstract/section previews | Recent NDVI and weather delivery reported; per-index counts and exact scene provenance NR | Combining satellite/weather/mobile delivery is established; Matani needs a narrower result |
| Soriano-Gonzalez et al., 2022; EVID-050 | Ebro Delta rice, 2018-2019; smoothed S2 indices | Phenology/hydroperiod and yield evaluation; institutional abstract | Temporal stages and S2 gaps explicit; Matani-style NDVI/NDMI counts/provenance NR | Gap-limited rice monitoring is already recognized; study local availability rather than claiming discovery of clouds |
| Son et al., 2020 Taiwan rice study; EVID-051 | Taiwan 2018 EVI/LSWI time series | Wavelet filtering, phenology classification, parcel assessment; institutional abstract | Multitemporal processing explicit; per-index thresholds and delivered observation provenance NR | Keep classification and raw-index availability evaluations distinct |
| Defourny et al., Sen2-Agri, 2019; EVID-052 | Sentinel-2/Landsat 8 across cropping systems | Automated national/parcel products; institutional abstract | Time series, cloud-free composites and quality-controlled in-situ data explicit; Matani-specific output contract NR | No claim to invent quality-aware agriculture platforms or automated parcel monitoring |
| Schmitt et al., 2019; EVID-053 | Sentinel-2 over several global cities | Cloud-free aggregation compared with standard approaches; publisher abstract | User-defined time windows and cloud handling explicit; padi per-index provenance NR | Composite availability differs from dated field acquisitions; do not equate their denominators |
| Tropical optical availability, 2023; EVID-054 | Landsat 7/8 plus S2, tropics, 2017-2021 | Counts and longest observation-free periods; abstract/background | Gaps and documented reusable scripts explicit; padi/NDMI workflow NR | Availability and reproducibility are established; contribution is the bounded application and results |
| Sen4CAP manual v4.0, section 2.1 p.12; EVID-055 (additional system source) | S1/S2/Landsat, CAP monitoring | Architecture description, not an independent experiment | Parcel metrics, database and visualization explicit; specific mobile missing-state behavior NR | Do not claim first parcel-metric database or first monitoring visualization |

## Contribution decision

DEC-45 selects a bounded, measurement-led case study with a technically evaluated delivery
artifact. This review does **not** establish a new algorithm, universal superiority, or
that other systems fail to preserve provenance. The prospective contribution is the
traceable Teluknaga analysis and its evaluated delivery constraints. Its strength depends
on recovered evidence, adequate evaluation and advisor/reviewer judgment.

## Remaining manuscript checks

Retrieve full texts for comparison dimensions currently NR; record section/page evidence
before upgrading any claim. Add closer Indonesian implementation studies if found using
the same inclusion criteria. Do not invent a baseline to guarantee a win: use a documented
reproducible prior method only when its data/interface assumptions match; otherwise
report contract-based technical evaluation without a superiority claim (DEC-45).


## September 15 policy-focused refinement

DEC-48/49 supersedes the earlier Teluknaga contribution paragraph. Primary question:
how does an explicit complete-pair gate withhold otherwise passing observations,
relative to independent delivery, under identical quality rules and geometry sensitivity?
This is a design comparison, not an invented claim that IrrigaSys or Sen2-Agri uses
our baseline. The eight-paper review above remains a scoped initial review.

Rechecked IrrigaSys using its University of Lisbon author record (EVID-049) on September
15: abstract reports recent Sentinel-2 NDVI and multiple delivery channels. It does not
report an NDVI/NDMI pair-gate experiment in that abstract. Publisher full-text access
failed; retain NR rather than infer absence.

Added adjacent primary manuscript: Tsardanidis et al. 2024, arXiv:2403.09554v1 (EVID-064).
Reviewed Abstract and Introduction contributions: NDVI reconstruction and mowing-event
evaluation in Lithuania. Its target is generated continuity, whereas our proposed
experiment retains measured passing observations and leaves missing values missing.
No superiority comparison with their reconstruction method is proposed. Do not infer
all-system feature absence from this distinction.

Targeted searches on September 15 included NDVI/NDMI dashboard decision support,
Sentinel-2 agricultural quality monitoring, and IrrigaSys. Excluded marketing/hackathon
pages from academic evidence. No exhaustive novelty conclusion follows. For manuscript
review, expand full-text coverage of close DSS papers before using any first/unique
claim; the current contribution statement deliberately makes neither claim.
