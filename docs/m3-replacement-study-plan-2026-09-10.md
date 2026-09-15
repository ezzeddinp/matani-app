# Replacement study preparation

**Updated:** 2026-09-14
**Status:** Preparation authorized by the developer in this conversation; academic scope amendment remains proposed. No replacement satellite dataset has been acquired.

## Purpose and scope

Proposed method: replace the unrecovered private-field study with a reproducible secondary-data case, retaining padi monitoring and offline technical replay. Preserve the old JSON as prototype pilot history. Do not carry its results, or the draft's unreconciled 32/86 result, into the new study. This supplements [the execution plan](../plans/016-agers-research-preparation.md); it does not record advisor approval.

## Source shortlist

| Candidate | Evidence | Outstanding checks |
|---|---|---|
| BIG RBI Agrikultur Sawah polygons | EVID-056 | Retrieve a bounded sample and metadata; establish reuse terms, feature date, map scale and whether geometry represents individual plots or larger mapped areas |
| Kota Magelang protected-sawah map | EVID-057 | Resolve original GeoJSON resource, licence, observation year and geometry meaning; a Magelang case changes the prior Teluknaga scope |

DEC-47 supersedes DEC-46’s Teluknaga-first search priority: screen Indonesian padi sources by evidence quality, regardless of locality. Magelang is an unselected fallback and is not authorized as the replacement study location. The original shortlist remains unselected; the subsequently recovered ministry candidate is recorded below (OBS-46). Do not substitute a rice-classification raster polygon for a verified farm boundary. If only mapped sawah units are available, describe the unit as a mapped sawah area and revise the field-size research question accordingly. Do not infer rice cultivation for every month from a permanent land-use designation.

## Sequence and acceptance

1. Recover a source file with citation, explicit reuse basis, metadata, CRS and documented rice-related label. Store original bytes and checksum. Inspect geometry and dates.
2. Freeze eligible units before viewing satellite availability outcomes. For a one-unit pilot, use a stable source identifier ordering among eligible simple polygons; do not choose the clearest result. Record exclusions and the candidate pool. The pilot is not a representative sample.
3. Select a complete 12-month window supported by the boundary/label vintage. Do not automatically use 2025–2026 with an older crop label. Report monthly and whole-window statistics; defer wet/dry comparisons unless season labels are independently documented.
4. Prepare an offline manifest and preflight: exact geometry, versioned masking, separate native-grid NDVI/NDMI processing, source identifiers, missingness, request and retry ceilings. Obtain a concrete request budget before live processing.
5. Acquire a bounded pilot only after inputs and provider access are ready; freeze raw responses, request metadata, source identity and processing versions. Never combine M1 Statistical and M2 Process outputs as equivalent without checking compatibility.
6. Reproduce separate and joint availability, threshold rejection counts and inter-observation gaps, including empty months and boundary periods. Treat 9/3 as exploratory policy settings for a replacement site, not transferred scientific validation.
7. Attach pilot findings and the proposed secondary-data amendment to the existing advisor packet; record actual advisor decisions before claiming academic approval.

## Existing-runner constraint

CODE: research/README.md, Multi-site 12-month M1 study, and research/lib/m1-study-input.mjs require private-input verification/consent references and site-season metadata. Public reuse rights are not farmer consent. Do not populate those fields with invented approvals or bypass validation. A public-secondary-data input path requires an explicit protocol/contract amendment after a suitable dataset is identified. No runner or app changes are required for source screening.

## Completion boundary

This document is a replacement-study preparation plan, not a dataset, result, approval or novelty finding. Candidate boundary retrieval and an offline request proposal are complete (OBS-46/47); final source eligibility, reuse/date assessment, execution checks and acquisition remain open. React Doctor cleanup remains paused unless a concrete defect blocks an experiment.

## Preparation work packages (DEC-46)

The assistant performs source screening and prepares artifacts; the thesis team reviews the proposal and brings academic scope decisions to the advisor. No farmer recruitment or UAT is included in this preparation.

### 1. Teluknaga source check — target September 10–11

- [ ] Inspect BIG layer metadata and identify a documented Teluknaga administrative boundary for the spatial query. Record its source; do not invent a bounding box and call it the administrative region.
- [ ] Retrieve a small read-only sample with original identifiers, geometry, crop-related attributes, observation/publication dates and metadata references. Record query and retrieval date.
- [ ] Check explicit reuse terms and inspect geometry scale. Public accessibility or an empty copyright field does not establish reuse permission.
- [ ] Record whether each geometry is a farm parcel, mapped land-use area, or an uncertain unit. Check simple Polygon validity, CRS, area and duplicate identifiers.

Output: source assessment added to `docs/m3-dataset-inventory-2026-09-10.md`; supporting external facts in `.agent/evidence-register.md`; original downloads and checksums under `research/private/replacement-study/`. Completion requires a usable source or an explicit reason for rejection, not merely a working URL.

### 2. Select the case and period — target September 11

- [ ] Prefer a documented Teluknaga padi parcel whose source vintage supports the chosen year. Use the eligibility/ordering rule above and retain excluded candidates.
- [ ] If only mapped sawah areas are available, prepare revised unit-of-analysis wording without presenting them as individual smallholder fields.
- [ ] If no suitable Teluknaga source is accessible, compare alternative sources, including Magelang, on crop evidence, geometry meaning, date and reuse. Present the location change to the developer and advisor before selecting it.
- [ ] Choose one complete historical year compatible with the source evidence; record temporal mismatch if the boundary date cannot establish crop identity for that year. No default assertion of continuous rice cultivation.

Output: proposed case, period, selection rationale and known limitations in the inventory. Stop dependent acquisition if unit identity or reuse remains unresolved. Do not spend the remaining advisor-preparation window repeatedly searching for the missing historical file.

### 3. Prepare a reproducible acquisition — target September 12

- [ ] Amend `.agent/research-protocol.md` with a proposed public-secondary-data method preserving the prior approved wording and history. Update `.agent/data-evaluation-plan.md` only for actual interface changes.
- [ ] Specify how public-source rights and source-quality evidence replace private-field declarations; do not mark farmer consent as granted or claim a new advisor decision.
- [ ] Reuse existing processing and validation where compatible. Prepare a source manifest with file hashes, geometry, versions, study period, source-quality limitations and exploratory pixel floors.
- [ ] Produce a no-network preflight with endpoint/method, planned operation count, maximum retries, current account limits and a hard stop ceiling. Verify provider access separately from the inaccessible Supabase connection.

Output: reviewed manifest and bounded acquisition proposal. Exact API budget follows the selected geometry and processing route; it must be calculated before live execution. Source discovery does not require a production app redesign or successful Supabase recovery.

### 4. Pilot and advisor packet — target September 12–14

- [ ] Once live acquisition is explicitly authorized for the concrete manifest/budget, preserve raw responses and source identity; use a fresh snapshot, never overwrite the legacy JSON.
- [ ] Reproduce monthly separate/joint counts, pixel-floor rejection reasons, median/longest gaps and leading/trailing no-observation periods. Keep interval counts distinct from confirmed unique acquisitions.
- [ ] Run existing research checks and technical replay where compatible; keep simulated results separate. If a new adapter is necessary, test missing values, duplicate/conflicting records, empty periods and threshold boundaries.
- [ ] Update `docs/m3-advisor-proposal-2026-09-14.md` with pilot findings or explicit unavailable results, the closest literature comparisons and before/after method wording. Regenerate its PDF only after the text is consistent.

Success on September 14: a defensible proposal with traceable pilot evidence where obtainable. If source retrieval or acquisition is incomplete, deliver the source assessment, proposed method and technical replay evidence without numerical satellite claims.

## Decisions requested at bimbingan

Accept or revise: public secondary-data case and location; parcel versus mapped-area analysis unit; technical evaluation without participant UAT or agronomic validation; provisional threshold sensitivity rather than accuracy claims; descriptive analysis and uncertainty limits. Preparation authorization is not academic approval.


## Execution checkpoint — September 11

OBS-45: a documented Teluknaga administrative geometry was retrieved and preserved. The sawah sample request failed at the source service; no eligible farm/mapped-sawah unit is available yet. Task 1 is partially complete; all case selection and acquisition tasks remain pending. See the inventory for the next bounded action.


## Recovered candidate — September 11 (OBS-46)

The ministry LBS2019 alternative returned a bounded five-polygon sample. FID 297 is prepared as the first eligible geometry for a proposed 2019 case, pending source rights and unit/date evidence. Four of five sampled polygons are fully inside Teluknaga. Raw files, XY normalization, geometry checks, query and checksum manifest are preserved. No location switch is needed for this candidate. Do not call it an individual farm parcel or promote it to the current private-input study contract. Remaining dependencies are source-use basis, method wording and a concrete compatible processing budget, not app feature work.


## Offline acquisition proposal — September 11 (OBS-47)

The canonical replacement-method proposal is [research protocol §18](../.agent/research-protocol.md).
The ignored source directory contains `offline-request-proposal.json` and its runnable
`prepare-requests.mjs`; run `node research/private/replacement-study/prepare-requests.mjs`
from the repository to verify input hashes and regenerate the same request bodies.

| Stage | Proposed bound | Readiness |
|---|---|---|
| Offline preparation | 36 monthly Statistical request bodies, calendar 2019 | Checked; no network |
| Initial January pilot | 3 Statistics calls, one authentication attempt, sequential, no retries | Not executed; enforce cap and stop on first failure before running |
| Remaining year | 33 additional Statistics calls, at most one authentication attempt for this stage | Separate decision after initial response/provenance review |
| Catalogue/Process acquisition | Excluded from this budget | Final provenance route not yet established |

The published provider allocation was rechecked September 11 (EVID-010); this account's remaining quota and the pilot's processing-unit cost have not been verified. Source-use basis and
mapping/parcel limitations remain as recorded in OBS-46. The request bodies are not
an executable live runner, and a request-count ceiling is not a monetary estimate.
The next dependent action is to resolve source eligibility and provider limits, then
finalize the smallest compatible pilot runner and review its concrete budget. A live
run must preserve raw responses and metadata; the existing private-field declarations
must not be filled with invented consent or crop verification.


## Advisor handoff — September 11 (OBS-48)

The updated [advisor proposal](m3-advisor-proposal-2026-09-14.md) and its two-page PDF
in `output/pdf/` now reflect protocol §18 and the recovered candidate. They distinguish
geometry/preflight evidence from measured satellite results. The original approved
private-field result remains unreproduced; replacement results are unavailable.
Source-use searches did not resolve exact-dataset terms (OBS-48). No additional runner
is implemented while source eligibility and the final provenance route are unresolved.


## Suitability decision — September 14

OBS-49–51: the candidate remains **on hold**, not source-approved. A public catalogue
check confirms a covering January 2019 Sentinel-2 item. Geometry diagnostics raise a
narrow-area concern; exact-source reuse and date evidence remain unresolved. An openly
licensed NESEA-Rice10 tile was recovered for comparison, but its local class-code meaning
requires verification and it does not confer rights on the ministry boundary.

See [the completed suitability assessment](m3-source-suitability-2026-09-14.md) for evidence,
limits and next checks. The September 11 advisor PDF is a preparation snapshot; attach
this September 14 assessment when using it. No location, method or live-processing
approval is recorded by this investigation.


## Search priority update — September 14 (DEC-47)

Teluknaga is optional. Compare candidate Indonesian sources on explicit reuse terms,
traceable rice-class meaning, documented observation year, geometry interpretation,
reproducible access and compatibility with the research questions. Annual raster
classifications and actual parcel datasets must remain distinct. Favorable satellite
outcomes are not a selection criterion. No replacement site is selected yet.

The recovered NESEA-Rice10 tile remains a source to investigate, not an approved study
area. Verify class meanings and source limitations before selecting rice locations.
Any resulting site/year proposal should include why that unit is appropriate and which
claims it cannot support; preserve the rejected or unresolved candidates in the record.


## Alternative-source recommendation — September 14 (OBS-52)

The [source comparison](m3-alternative-sources-2026-09-14.md) recommends Open-SEA-Rice-10
for the next bounded data inspection (EVID-060/061). This replaces locality-first
searching with an explicitly licensed, year-labelled national source. It is a raster
classification, not a selected farm parcel. NESEA-Rice10 remains a comparison;
non-georeferenced paddy segmentation data is unsuitable for our extraction task
(EVID-062). Exact location selection awaits raster inspection and a documented
analysis-unit rule. No protocol approval or measured outcome is inferred.


**Raster checkpoint (OBS-53, September 14):** Open-SEA archive checksum and sampled Java
raster checks passed. All Indonesia-labelled index entries have corresponding files.
Positive class encoding is checked; zero/missingness remains qualified. See the updated
alternative-source comparison. Next work is a documented mapped-area selection rule,
not further locality-first searching or live processing. No final site is selected.


**Candidate checkpoint (OBS-54):** A reproducible three-block shortlist is prepared;
see [candidate selection](m3-candidate-selection-2026-09-14.md). This is an explicitly
proposed fixed-block method, not verified farm boundaries or approved multi-site scope.
Next dependencies are administrative context and final unit/period/processing contract.
No live request has been made for these blocks.


**Advisor-pending preparation:** The developer reports that the scope question has been
sent and no response received. The [delivery comparison proposal](m3-delivery-comparison-proposal.md)
specifies a controlled comparison and identifies why historical joint/pixel-floor
counts must not be treated as equivalent acceptance rules. It remains proposed;
preparation continues without inferring approval or changing production behavior.


**Offline pilot package (OBS-55):** First shortlist candidate now has three checked
January 2021 Statistical request bodies and a repeatable no-network preparation script.
The package correctly uses EPSG:32749, preserves exact geometry and source hashes, and
states the proposed attempt cap. It remains separate from the old Teluknaga package.
Administrative/land context and the final measurement contract remain next dependencies;
no live run or advisor approval is inferred.
