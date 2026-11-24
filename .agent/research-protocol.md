# Matani · Research Protocol

**Document type:** Research protocol
**Audience:** The developer, thesis advisor, reviewers, and AI agents working in this repo
**Status:** Active — RQ1/RQ3 and M1 scope approved (DEC-29/30); validation remains open
**Updated:** 2026-09-25
**Canonical for:** Research questions, hypotheses, methodology, and validity of the Sentinel-2 NDVI/NDMI monitoring evaluation, and the thesis paper's system-evaluation track (§ 16)
**Companion documents:** [`evidence-register.md`](evidence-register.md), [`data-evaluation-plan.md`](data-evaluation-plan.md), [`project-architecture.md`](project-architecture.md), [`implementation-plan.md`](implementation-plan.md), [`product-requirements.md`](product-requirements.md)

---

## How to read this document

This protocol is the single canonical home for **what the thesis is trying to learn and how a defensible answer is judged** — research questions, hypotheses, unit of analysis, sampling, alignment and quality rules, validation metrics, and threats to validity. Read it this way:

- **This is the "why and whether", not the "how".** Engineering mechanics — the exact evalscripts, request shapes, persistence schema, worker/job boundary, provider adapters, and quality-pipeline implementation — live in [`data-evaluation-plan.md`](data-evaluation-plan.md). This protocol states the *research requirement* (e.g. "polygon-level, not tile-level, quality assessment"); the plan states the *code that satisfies it*. Where a rule here needs an implementation, link — never duplicate.
- **External facts are cited, never restated.** Every externally sourced figure or claim carries an `EVID-*` / `OBS-*` ID from [`evidence-register.md`](evidence-register.md). This document does not re-copy the number or the canonical wording; it cites the ID and adds a short role-specific gloss. If a fact you need has no EVID entry yet, it must be added to the register first (see the register's "Adding new evidence").
- **Decisions are cited by `DEC-*`.** Product and thesis decisions live in [`context-dump.md`](context-dump.md) § 5. This protocol implements and elaborates them; it does not re-decide them.
- **Hypotheses are typed `HYP-*` and defined here.** Every falsifiable claim this thesis intends to test is registered in § 1 with an ID, a directional statement, and an explicit falsification criterion (§ 12). A `HYP-*` is a *question the data will answer*, never a finding — do not cite a HYP as if it were established.
- **Nothing here claims thesis readiness.** Current implementation provenance belongs solely to [`project-architecture.md`](project-architecture.md) § 2. Software/deployment evidence does not establish scientific validity (OBS-28/30/31/32).
- **The active RQ wording below is advisor-approved as relayed by the developer on 2026-08-30.** Any later substantive change requires a new advisor review.

---

## 1 · Research questions and hypotheses

The thesis deliverable is a **padi-only, observation-first mobile DSS** (GROW workflow; DEC-14/24), authored by the three-person thesis team (DEC-17). Its active measurement-evaluation backbone is the reliability of dated Sentinel-2 NDVI/NDMI observations through RQ1 and RQ3. RQ2 is set aside as optional M3/future work and is not an M1 or active-thesis requirement (DEC-26). Crop-health classification and diagnosis are outside the claim surface; there are no non-rice strata (DEC-24). The paper's system-evaluation track is recorded in § 16 and never substitutes for measurement evaluation. The active RQ wording below was approved by the advisor as relayed on 2026-08-30.

### Approved active research questions

- **RQ1 — Usable-observation cadence.** Within the approved padi study field in Teluknaga, Banten, what proportion of Sentinel-2 acquisitions produces quality-passing polygon-level NDVI and NDMI observations, and what monitoring cadence is defensible during the locally labelled wet and dry seasons? This directly separates nominal revisit (EVID-006) from locally usable cadence, which cloud conditions can erode (EVID-015); it does not support a nationwide cadence claim (DEC-27).
- **RQ2 — Retired from active scope; optional future work.** The earlier proposal compared polygon-level Statistical API values with independently processed raster samples over identical geometry, acquisition, and masking rules. DEC-26 removes this comparison from M1 and from the active thesis evaluation. The identifier remains reserved so historical material cannot be mistaken for current scope; reactivation requires a new thesis-team/advisor-approved decision.
- **RQ3 — Teluknaga field pixel sufficiency and limitations.** For the approved Teluknaga padi field, how many valid NDVI and NDMI pixels are available per acquisition under the provisional quality floors, and what measurement limitations arise from the field's size and Sentinel-2 spatial resolution?

### Hypotheses

All hypotheses are unvalidated until the evaluation is run; each has an explicit falsification criterion in § 12.

- **HYP-01 — Usable-observation cadence (supports RQ1).** For the Teluknaga study site, the rate of quality-passing polygon-level observations is materially lower than the nominal acquisition rate and differs between wet and dry months; a site-specific cadence can only be set from the feasibility study (§ 4), never from EVID-006. *Directional prior, not a finding; no nationwide inference is permitted under DEC-27.*
- **HYP-02 — Retired from active scope with RQ2.** The earlier API-vs-independent agreement hypothesis is not evaluated for M1 or the active thesis under DEC-26. Its identifier and former comparison intent are retained only for traceability and optional M3/future work.
- **HYP-03 — Retired from active inferential scope.** The approved one-field RQ3 is descriptive and limitation-focused; it does not estimate a general field-size threshold or a population-level size effect. DEC-27's 9-NDVI/3-NDMI floors remain provisional operational availability floors, not validated universal thresholds. A multi-field size-effect hypothesis remains future work unless separately approved.
- **HYP-04 — Retired historical threshold set.** The former 0.60/0.20/0.00 NDVI severity bands were removed from code and are not tested as a thesis hypothesis after DEC-24. The ID remains reserved so historical documents cannot be mistaken for current scope.
- **HYP-05 — Crop/phenology-aware water masking (supports the quality rules in § 8).** A masking rule that does *not* blanket-mask water inside rice polygons — treating flooding/transplanting as legitimate low-NDVI phenology (EVID-016) rather than as invalid or stressed — produces more agronomically faithful rice observations than a naive "mask all water" rule. Remains HYP until validated against ground observations of paddy flooding state (§ 5); the rule itself is versioned (§ 8).
- **HYP-06 — Retired with RQ4.** Product and thesis outputs do not infer crop condition from index dynamics (DEC-24).
- **HYP-07 — Weather risk-score heuristic (as-built UI heuristic, not validated; DEC-16).** The client-side weather score remains a prototype weather-context indicator, not an agronomic diagnosis or crop-damage prediction. It is secondary to active RQ1/RQ3 and is not evidence about NDVI/NDMI measurement validity.

**Open for advisor decision:** target N beyond the currently approved manifest and remaining evaluation tolerances. The active RQ1/RQ3 wording was approved as relayed on 2026-08-30. Teluknaga and the provisional 9/3 quality floors are approved by DEC-27. RQ2/HYP-02 are set aside by DEC-26; RQ4/HYP-06 and active HYP-04 testing are removed by DEC-24.

**M1 scope/quality checkpoint (2026-08-29; DEC-25/26/27).** A dated advisor WhatsApp
decision accepts Teluknaga, Banten as the thesis's single study region because of the
available timeline and thesis-team capacity, and approves provisional floors of 9 valid
NDVI pixels and 3 valid NDMI pixels. Site-specific monthly labels and cadence reporting
per wet/dry season remain mandatory. This approval makes the constrained study executable;
it does not make one region nationally representative. Final active RQ wording, target N
beyond the approved manifest, and remaining pre-registered tolerances stay open. On 2026-08-30 the advisor relayed agreement with the proposed final RQ1/RQ3 wording and with retaining RQ2 only as optional future work; this closes the RQ-wording review item but does not create a broader sample or new tolerance values (DEC-29).

---

## 2 · Unit of analysis

Choosing the unit of analysis fixes what one row of the evaluation dataset *is* and therefore what the statistics describe. Candidate units:

| Candidate unit | What one record is | Role |
|----------------|--------------------|------|
| **Field (lahan)** | one smallholder polygon | grouping / stratification variable |
| **Acquisition** | one Sentinel-2 overpass of a tile/date | temporal grouping variable |
| **Field × acquisition observation** | one field's polygon statistics for one acquisition date | **primary unit** |
| **Crop cycle** | one planting→harvest sequence on a field | aggregation for phenology (§ 13) |
| **Farmer (petani)** | one consenting participant | consent / privacy / higher cluster |

**Primary unit of analysis: the field × acquisition observation** — one polygon's quality-assessed NDVI/NDMI statistics for one acquisition date. Justification: active RQ1 measures usable fraction/cadence and RQ3 describes per-acquisition pixel sufficiency/limitations for the same approved field. Each observation either passes quality or does not and has independent per-index valid-pixel counts.

**Clustering / non-independence (must be handled in analysis).** Observations are **not independent**: many observations are nested within one field, and many fields are nested within one region and one crop type. Repeated observations of the same field share its geometry, terrain, and adjacency; fields in the same region share weather and cloud regimes. Naive pooling would understate uncertainty and inflate significance. The analysis must account for this structure (e.g. cluster-robust standard errors or mixed/hierarchical models with field and region as grouping levels), and per-stratum reporting (§ 12) is preferred over a single pooled headline number. The specific estimator is an analysis-plan detail; the *requirement* to handle clustering is canonical here.

---

## 3 · Study sites and inclusion / exclusion criteria

### Approved thesis region

- **Teluknaga, Banten** is the single advisor-approved M1 study region (DEC-27). The
  thesis team has onsite access there, and every included field still requires verified
  padi identity, exact boundary, consent, and location/area evidence.
- Wet/dry comparisons use dated site-specific BMKG ZOM labels, not a fixed Java or
  Indonesia-wide calendar (DEC-25; EVID-024/025).
- The constrained design can support a Teluknaga site/season feasibility result only.
  It cannot estimate variation across Indonesian regions or license a national cadence.

### Field inclusion criteria

- Crop identity is verified as **padi (rice)**; non-rice fields are excluded from both product and thesis scope (DEC-24).
- A **valid field polygon** (not a bbox): closed, non-self-intersecting geometry with a plausible area, digitized to the field boundary (§ 7).
- **Farmer informed consent** obtained for use of field location and any ground observations (§ 14).
- Field falls within a selected study site and its 12-month availability record exists (§ 4).

### Field exclusion criteria

- Polygon invalid, degenerate, or clearly not a single agricultural field.
- Consent absent or withdrawn.
- Crop not verified as padi.
- Fields whose geometry cannot be reliably separated from permanent water or built structures at Sentinel-2 resolution (flagged, not silently dropped — see § 8, § 9).

Small fields are **not** an exclusion criterion. RQ3 reports the observed pixel sufficiency and resolution limitations of the approved Teluknaga field. The one-field design does not estimate a universal minimum field size or a cross-field size effect (DEC-29).

---

## 4 · Indonesia feasibility study (mandatory, precedes pipeline implementation)

**This study is mandatory and must precede full pipeline implementation (DEC-12).** Monitoring-cadence claims are **forbidden** until this study supports them: nominal 5-day revisit (EVID-006) is an acquisition cadence under cloud-free conditions, not a usable-observation cadence, and persistent tropical cloud cover materially reduces usable optical observations (EVID-015). A single-location catalogue check does not settle this (OBS-01, which moreover did not independently reproduce). The purpose of this study is to *measure* what cadence is defensible, per site and season, before any product promises one.

### Design

A **bounded 12-month retrospective availability study** over the approved Teluknaga site (§ 3). Retrospective (using the historical archive) so it can run before the live acquisition pipeline is fully built, and 12 months so it spans a full locally labeled wet/dry seasonal cycle. Unit: per included field per site. Results are site-specific and are not generalized to Indonesia (DEC-27).

### Measures (per field / site, over the 12-month window)

- Total Sentinel-2 acquisitions intersecting the polygon.
- Acquisitions **passing polygon-level quality** (§ 8) — not tile-level `eo:cloud_cover`.
- **Usable observations per month.**
- **Median** and **longest gap** (days) between consecutive usable observations.
- **Wet-season vs dry-season** usable-observation availability, separately.
- **Polygon-level cloud/shadow fraction** per acquisition (from SCL, EVID-008).
- **Valid-pixel fraction** of the polygon per acquisition.
- **NDVI valid-pixel count** and **NDMI valid-pixel count**, computed **independently** (they differ because of the 10 m vs 20 m band mismatch, EVID-009 — see § 9).
- **Provider cost accounting:** requests and processing units (PU) consumed, tracked against the CDSE free-tier quota (EVID-010, perishable — recheck at source before any capacity decision).

### Outcome

The **defensible Teluknaga monitoring cadence** — weekly / biweekly / monthly / event-based — stated separately for locally labeled wet and dry months. This outcome, and only this outcome, licenses a Teluknaga-specific cadence claim elsewhere in the repo (product-requirements.md, product-brief.md); it never licenses a national cadence (DEC-27). Until it exists, cadence is stated as *unknown / to be determined by the feasibility study*. The mechanics of running the study (queries, batching, PU budgeting, persistence) are specified in [`data-evaluation-plan.md`](data-evaluation-plan.md); this section owns the *research requirement* and its forbidden-until-supported constraint.

**Execution status (2026-07-29).** The tested calculation workspace and input/output
contract exist under `research/`, and a labeled fixture run proves the report can be
generated deterministically (OBS-03). A developer-controlled CDSE OAuth client then
enabled a bounded exact-polygon pilot and a checkpointed 2025-07-01 → 2026-07-01
retrospective acquisition for the two private, padi-labeled polygons. Stored WGS84
geometry was projected to a local UTM metre grid; SCL masking, separate 10 m NDVI and
20 m NDMI counts, request/PU accounting, retry, and checkpoint/resume were exercised
against live provider responses (OBS-11/12).

This is a **limited provider-backed prototype study**, not the advisor-approved Teluknaga
study required by this section. Its two historical polygons lack the current manifest's
verified crop identity, boundary, consent, location/area, site-specific wet/dry labels,
and advisor-approved HYP-03 floors. Consequently the
descriptive gaps in OBS-12 do not license a monitoring cadence, and M1 remains open.
A fixture row, dry-run request, successful HTTP response, nominal revisit, or these two
unverified polygons alone cannot satisfy this section.

**Execution-readiness update (2026-08-28; CODE).** The study runner now accepts a
versioned multi-site remote-assisted manifest with a dynamic field count. It rejects a
live input unless each field declares referenced verification for padi identity, exact
boundary, consent, and location/area; fixture input can only preflight. Each site must
carry a source reference and one wet/dry label for every study month, using the BMKG
onset/ZOM basis (EVID-024/025). Reports group descriptive metrics per field and per site
× season. Quality-passing, usable-observation, and gap results use the advisor-approved
provisional 9/3 HYP-03 floors (DEC-27), and cadence always requires a recorded determination.
This closes an execution-tooling gap only: no approved sample, human verification,
provider result, or advisor decision is created by the validator.

**Approved-study result and review update (2026-08-30; OBS-19/20, DEC-29).** The
approved Teluknaga manifest completed 12/12 field-months over 2025-07-01 → 2026-07-01.
The report contains 86 acquisition intervals: 32 pass the provisional 9/3 floors and 54
are rejected. The evidence-backed cadence is monthly for locally labelled dry months and
no defensible cadence for locally labelled wet months. The advisor relayed approval of
that cadence, the final RQ wording above, and RQ2's optional-future-work status. These
results remain scoped to the approved field and do not make the M1 Statistical API output
a production `measured` dataset.

**M1 closure.** The feasibility/research-contract milestone is closed under
`M1-CLOSURE-2026-08-30` (DEC-30). This closure licenses only the scoped dry/wet
cadence conclusion and the finalized M2 contract; it does not imply production persistence,
crop-health validity, a national cadence, or completed M2 behavior.

---

## 5 · Ground-truth / reference measurements

Ground observations support geometry/crop identity, acquisition-date context, and HYP-05 water-mask validation. They are not used to train or justify a crop-health diagnosis (DEC-24).

### What would be collected

- **Rice stage** — pre-flood/land-prep, flooding/transplanting, tillering/vegetative, reproductive, ripening, harvest (§ 13).
- **Flooding state** — for rice, standing-water presence (directly relevant to HYP-05 and EVID-016).
- **Georeferenced photos** — timestamped, location-tagged field photos as corroborating evidence.
- **Farmer reports** — the farmer's own account of recent field events (planting, irrigation, harvest, damage).

### Cadence, collector, quality controls

- **Cadence:** aligned to acquisition dates within a bounded window (§ 7), and at key phenological transitions; exact cadence is feasibility-limited.
- **Who collects:** primarily the developer and/or participating farmers; there is no field team.
- **Quality controls:** a fixed observation form with controlled vocabularies, mandatory timestamp + GPS on photos, one observer's categorical judgments recorded as such (not as measurement), and explicit recording of *who* observed and *when*.

### Honest feasibility note

This is a **three-person group thesis with no field team** (DEC-17). Crop/stage/flooding reference observations will be sparse, opportunistic, and geographically limited, which bounds HYP-05 and phenology-aware interpretation. This limitation must not be papered over with model or LLM output (DEC-08/24).

---

## 6 · Sampling strategy and target sample size

**Stratified sampling** by **region × season** for verified padi fields (DEC-24). Strata ensure the evaluation reports per-context results rather than one pooled number dominated by the most sampled context.

- **Strata:** region (§ 3) × season (wet/dry), padi only. Empty or thin cells are reported, never imputed.
- **Two sampling layers:** fields sampled for spatial/size coverage, then observations sampled in time through the acquisition calendar; usable availability remains an RQ1 outcome.

### Target N and power — stated honestly

The advisor-approved active scope contains **one verified Teluknaga padi field** observed
across the 12-month acquisition calendar (DEC-27/29). Its temporal field × acquisition
records support the scoped RQ1 and descriptive RQ3; they do **not** provide statistical
power for a cross-field size effect, a universal minimum field size, or national
generalization. No fabricated population-level power claim is made. Expanding field N or
restoring an inferential size-effect question requires a new advisor-approved scope.

---

## 7 · Spatial and temporal alignment rules

- **Geometry = the drawn field polygon, not a bounding box.** All index statistics are computed over the actual polygon geometry; the Statistical API excludes pixels inside the bbox but outside the request geometry (EVID-012). The current backend's use of a bbox and a hard-coded Jakarta fallback is a prototype defect (see `context-dump.md` § 2), not the target behavior.
- **CRS handling.** Polygons are stored/queried in a defined geographic CRS (PostGIS, WGS84) and must be handled consistently with the provider's expected CRS; any reprojection for area or pixel operations is explicit and recorded. Area-in-hectares is derived on an equal-area basis, not from raw degrees.
- **Temporal alignment window.** A ground observation (§ 5) is matched to an acquisition only if the acquisition falls within a **bounded window** around the observation date (window length is a documented parameter, set with agronomic reasoning — short enough that crop state has not materially changed). Observations with no acquisition in-window are recorded as unmatched, not force-matched.
- **Multiple acquisitions in one window.** When several quality-passing acquisitions fall in a window, the selection rule (e.g. nearest-in-time, or highest polygon valid-pixel fraction) is **fixed in advance and recorded per observation**; the discarded acquisitions and the reason are persisted (§ 11), never silently dropped.

Implementation of these rules (geometry plumbing, CRS transforms, window parameters) is specified in [`data-evaluation-plan.md`](data-evaluation-plan.md); this section owns the *rules*, that document owns the *code*.

---

## 8 · Quality and masking rules

Quality assessment is at the **polygon level, not the tile level.** Tile-level `eo:cloud_cover` describes a whole Sentinel-2 tile and can be low while a specific smallholder polygon is fully clouded (OBS-01 makes exactly this point). Every observation is assessed over its own polygon.

### Masking

Using the Level-2A Scene Classification Layer (SCL), which classifies cloud shadows, clouds (low/medium/high probability), and cirrus (EVID-008):

- **Mask** clouds at **medium and high** probability, **cirrus**, **cloud shadows**, and **invalid / saturated / defective** pixels, via SCL classes. SCL is a per-pixel heuristic classification, not ground truth (EVID-008) — treat it as a quality gate, not a guarantee.
- **Persist the rejection reason** for every masked pixel category and every rejected acquisition (§ 11); rejections are data, not silent gaps.
- **Display the actual acquisition date** of the observation shown, never a "current" or synthesized date.
- **State unavailability honestly** — when no quality-passing observation exists for a field/window, the product shows an honest *unavailable* state. DEC-24 already removes product fallback substitution; M2 adds reason-bearing provenance outcomes.

### Rice-water rule (HYP-05)

**No blanket water masking.** Flooded paddies are legitimate rice phenology: during flooding/transplanting, standing water dominates the surface and NDVI is legitimately low — this is expected phenology, not stress, and single greenness indices cannot distinguish the two (EVID-016). Therefore:

- Do **not** mask "water" indiscriminately inside rice (padi) polygons.
- **Exclude permanent water** that lies *outside* the field polygon (irrigation canals, ponds beyond the boundary) via geometry and persistent-water handling.
- Apply **crop- and phenology-aware handling** of water *inside* rice polygons: water there may be the flooding stage (kept, flagged as flooding) rather than invalid data.
- Masking rules are **versioned** (a rule-set version is stored with every observation, § 11) so that a change in masking never silently alters historical values.
- This rule is **HYP-05 until field-validated** against ground observations of paddy flooding state (§ 5); it is a documented, versioned hypothesis, not a settled procedure.

The evalscript/`dataMask` mechanics that implement SCL-driven exclusion (EVID-012) live in [`data-evaluation-plan.md`](data-evaluation-plan.md).

---

## 9 · Spatial resolution and small fields

Field size interacts with pixel size to determine whether a polygon statistic is meaningful; approved RQ3 describes that limitation for the Teluknaga field without estimating a population-level size effect (DEC-29).

- **Pixel footprints.** NDVI uses B04 (Red) and B08 (NIR) at **10 m** native resolution — a pixel covers ≈100 m². NDMI's SWIR input B11 is **20 m** native — a pixel covers ≈400 m² (band resolutions: EVID-009). A 0.5 ha field (5,000 m²) is on the order of tens of NDVI pixels but only ~12 NDMI pixels before any masking or boundary loss.
- **Boundary-pixel mixing.** Pixels straddling the field edge mix the crop with roads, irrigation, buildings, and adjacent farms; the coarser B11 mixes over a larger footprint. Boundary mixing is a primary error source for small fields.
- **Independent valid-pixel counts per index.** NDVI and NDMI valid-pixel counts are computed and reported **separately** (§ 4, § 12) because the 10 m/20 m mismatch means a field can have enough valid NDVI pixels but too few valid NDMI pixels.
- **Inward buffer, conditionally.** An inward buffer to drop boundary pixels is applied **only when the field is large enough** to retain a sufficient interior sample; on the smallest fields a buffer would erase the field. Whether and how much to buffer is size-dependent and recorded per observation.
- **No false spatial detail.** B11 (20 m) resampled to a 10 m grid for NDMI does **not** create real 10 m spatial detail; the underlying information stays 20 m. The resampling choice is recorded (a CODE-*/data-evaluation-plan fact), and no claim of upsampled spatial resolution is made.
- **No universal minimum-size claim.** The provisional 9-NDVI/3-NDMI valid-pixel floors classify the approved observations under DEC-27. With one field they cannot establish a universal minimum field size; such a claim is outside the active thesis under DEC-29.
- **Small fields are the population.** Because ≈62% of Indonesian land-using farmers are *petani gurem* <0.5 ha (EVID-013), small-field reliability is the central question, not a corner case — its difficulty is a finding to report, not a reason to exclude (§ 3).

---

## 10 · Topography and mixed cropping

Beyond size, terrain and cropping pattern degrade optical index reliability in exactly the regions the product targets:

- **Terrain shadow** in sloped or terraced rice sites: hill shadow can bias reflectance, so terrain context is flagged and reported per stratum (§ 12).
- **Mixed cropping and fragmented polygons:** a single smallholder polygon may contain more than one crop or intercropping, and fields are small and irregular; the polygon statistic is then a mixture, not a pure-crop signal.
- **Adjacency effects:** neighbouring fields at different growth stages contaminate boundary pixels (§ 9).
- **Sentinel-1 (SAR) is a documented post-thesis contingency only.** C-band SAR images all-weather, day and night, unimpeded by cloud (EVID-017), which is attractive for cloud-limited sites — but SAR measures backscatter, **not** the NDVI/NDMI reflectance this thesis evaluates, so it is not a drop-in substitute. It is set aside as a post-thesis contingency requiring a **separate scope decision** before adoption (DEC — see `context-dump.md` § 6); it is **not in current thesis scope**.

---

## 11 · Missing-data policy

- **Gaps are recorded, not filled.** Cloud-outage periods and any interval with no quality-passing observation are recorded explicitly as missing, with the reason (§ 8) — e.g. clouded, shadow, too few valid pixels, no acquisition in window (§ 7). Missingness is itself an outcome of RQ1 and must be preserved.
- **No imputation presented as observation.** Interpolated, gap-filled, or model-inferred values are **never** stored or displayed as measured observations. If any gap-filling is used for a *derived* analysis, it is clearly labelled as derived, kept separate from measured records, and never surfaced in the product as a measurement (consistent with the fixture/prototype/measured/unavailable vocabulary and the honesty constraints in `../AGENTS.md`).
- **Missingness is analyzed.** The distribution of gaps (median/longest gap, wet vs dry) is a reported result (§ 4, § 12), and analyses account for the fact that missingness is not random (clouds cluster seasonally and regionally) — a threat carried into § 15.

---

## 12 · Validation metrics, uncertainty, and failure criteria

### Agreement metrics

- **RQ2 (inactive optional future work):** if reactivated by a new scope decision, paired-value agreement over the same observations would use **bias (mean signed difference)**, **MAE**, **RMSE**, **correlation**, and a **Bland–Altman** analysis, reported separately for NDVI and NDMI. None is required for M1 or the active thesis (DEC-26).
- **RQ1 (usable cadence):** usable-observation fraction, usable observations/month, and gap statistics (median/longest), per site and season (§ 4).
- **RQ3 (approved-field sufficiency and limitations):** independent NDVI/NDMI valid-pixel counts per acquisition, pass/reject outcome under the provisional floors, and descriptive limitations attributable to the approved field's size and Sentinel-2 resolution.

### Uncertainty

- **Confidence intervals** on every reported estimate, computed in a way that respects clustering (§ 2) — cluster-robust or hierarchical, not naive pooled intervals.
- **Per-stratum reporting** (region × season, padi only) is the default; a pooled headline number, if given, is accompanied by its per-stratum breakdown.

### Explicit failure / falsification criteria

Each hypothesis has a result that would falsify it:

- **HYP-01** is falsified if usable-observation rates at Teluknaga are high and stable across wet and dry months such that one fixed site-specific cadence is defensible (i.e. cloud loss does not materially erode nominal revisit there).
- **HYP-02** has no active falsification run under DEC-26. If a later scope decision reactivates it, its criterion must be pre-registered before comparison; historical wording is not an active thesis commitment.
- **HYP-03** has no active falsification run after DEC-29 narrowed RQ3 to a descriptive one-field question. A future multi-field size-effect study must pre-register its own hypothesis and tolerances before collection.
- **HYP-05** is falsified if crop/phenology-aware water handling produces rice observations no more agronomically faithful than a naive blanket-water-mask rule, judged against ground flooding-state observations (§ 5).

Pre-registering these tolerances and criteria (with the advisor) before running the evaluation is the intended practice; the specific numeric tolerances are set at that point and recorded here.

---

## 13 · Rice phenological-stage stratification

- **Analysis is stratified by rice phenological stage**, not pooled blindly across a whole cycle. This is measurement context, not a health classifier.
- **The flooded-paddy example is canonical.** Low NDVI during flooding/transplanting can reflect expected phenology and standing water (EVID-016); Matani therefore shows the value and date without assigning a stress label (DEC-24).
- Stage assignment draws on ground observations and farmer reports where available (§ 5); where stage is unknown, observations are stratified as "stage unknown" rather than assumed.

---

## 14 · Ethics, consent, privacy, retention

- **Informed consent.** Farmers give **informed consent** for collection and research use of field location and any ground observations/photos (§ 5), including the right to withdraw (which triggers exclusion, § 3).
- **Field polygons are location data.** A field polygon reveals where a specific farmer's land is; combined with consent metadata it is **personal location data** and is treated as sensitive. **Data minimization** applies — collect only what the RQs require; no unnecessary personal attributes.
- **Access control.** Access is guarded server-side by Postgres roles with **Row Level Security enabled on all tables** — the Supabase anon/publishable key is client-safe *only* on the precondition that RLS is correctly enabled everywhere (EVID-020); an RLS gap turns it into a data-exposure vector. Every mutation carries a server-side authorization check; UI hiding is never the control.
- **Retention and deletion.** A stated **retention period** and a **deletion pathway** (honoring withdrawal) are defined; observations tied to withdrawn consent are removed or irreversibly de-identified.
- **University ethics alignment.** The consent form, data-handling, and retention plan align with the university's ethics/IRB requirements. Exact obligations are **advisor- and institution-dependent** and confirmed with the advisor before any field data is collected.

Security implementation (RLS policies, secrets hygiene per DEC-13, trust boundaries) is detailed in [`project-architecture.md`](project-architecture.md); this section owns the *research-ethics requirements*.

---

## 15 · Threats to validity and generalizability

- **Site- and farmer-selection bias.** Teluknaga and its consenting participants are an access-constrained, advisor-approved case, not a random national sample; this sharply limits external validity. Reporting stays field- and season-specific so the covered context is explicit (DEC-27).
- **Seasonal coverage.** The 12-month feasibility window (§ 4) captures one wet/dry cycle; inter-annual variability (unusually wet/dry years) is uncontrolled and a monitoring-cadence result is conditional on the observed year.
- **Single-country scope.** Findings are for Indonesian smallholder conditions (DEC-01); they are not claimed to generalize to other countries or agroclimates.
- **Provider dependence.** Results depend on CDSE Sentinel Hub Statistical API semantics and the free-tier quota (EVID-010, EVID-012), on L2A/SCL product behavior (EVID-008), and on OAuth2 access (EVID-011). Provider changes can invalidate cost, cadence, or method assumptions.
- **Small-N limits.** Ground-reference-dependent masking/phenology checks and thin strata are exploratory (§ 5, § 6).
- **OBS-01 non-generalizability.** The single-location Jakarta catalogue check is one data point, was **not independently reproduced** from repo tooling, and tile-level cloud cover ≠ polygon cloud-free (OBS-01). It motivates the feasibility study; it is not evidence of usable cadence and is not generalized to any region or season.
- **Instrument / provider change risk (perishable claims).** Quotas and pricing (EVID-010, EVID-021), coverage, and even constellation membership (EVID-006 notes 2A retired / 2C operational) change without notice; they carry checked dates and are rechecked before any decision. A cadence or capacity result stated against a stale quota is a warning, not a guarantee.
- **Masking validity.** SCL is a heuristic (EVID-008), and the rice-water rule (HYP-05) is unvalidated until field checks exist. Versioning masking rules (§ 8) bounds but does not eliminate semantic drift.
- **Cloud-driven missingness is non-random.** Missing observations cluster by season and region (§ 11), so usable-cadence and agreement estimates can be biased toward clearer-sky periods/places; analyses must acknowledge this rather than treat gaps as random.

---

## 16 · System-evaluation track (from the thesis paper; DEC-14)

The thesis paper defines a prototype evaluation framework for the DSS itself. As of the
2026-08-21 local audit, deterministic engineering checks exist and the current lint,
root/backend type-checks, 5/5 root artifact tests, and 21/21 backend tests pass (OBS-13).
The Python research suite was not re-run on that workstation because Python 3 is absent;
current remote CI, physical-device coverage, and UAT remain unverified. These boundaries
keep **system evaluation** (does the DSS behave as specified and is it usable?) distinct
from **measurement evaluation** (are its values defensible? §§ 1–15).

1. **Functional testing** — core app features (registration, padi polygon drawing, NDVI/NDMI time-series display, weather retrieval, notes, optional data summary) verified against the functional requirements. Every satellite test records its data state; passing a UI test never establishes measurement validity.
2. **API response testing** — Sentinel Hub responses validated for correct band arithmetic and index ranges (−1…1); the Open-Meteo response/WMO-code contract is verified under normal and simulated failure. Fixture-first in CI (DEC-09); live checks are bounded, out-of-band runs.
3. **Conceptual validation** — computed NDVI/NDMI compared against known rice phenological patterns as a plausibility check, never as health ground truth. The flooded-paddy caveat applies (EVID-016).
4. **User acceptance testing (UAT)** — qualitative evaluation of timeline readability, date/data-state comprehension, weather-context clarity, and whether users understand that Matani does not diagnose. UAT measures usability, never measurement validity.
5. **Known limitations** — no field-level ground truth (biomass, soil moisture sensors, yield records) in the prototype evaluation; the system is evaluated for technical correctness, API reliability, and usability, not predictive agronomic accuracy. This restates the paper's own limitation honestly; any stronger claim requires §§ 5, 12.

The mapping of this track onto milestones (which tests run at M0/M2/M3) lives in [`implementation-plan.md`](implementation-plan.md).

## 17 · Proposed participant-free evaluation amendment

**Status: proposed for advisor review; not academic approval (DEC-45, 2026-09-10).**
This section is the canonical proposal. Existing advisor-approved RQ1/RQ3 wording and
prior HYP-05/UAT acceptance requirements above remain visible; the proposal does not
silently retire them or declare M3 complete.

- Retain the one-field retrospective RQ1/RQ3 evaluation. Use existing records; no new
  farmer recruitment, field collection, live satellite run, or paid acquisition is part
  of this preparation (DEC-45).
- Use controlled technical evaluation for the delivery artifact, informed by EVID-047/048.
  Test quality/date/provenance preservation and failure recovery. Report the actual
  production boundaries exercised and all simulated dependencies. Do not infer farmer
  comprehension, decision quality, usability or agronomic accuracy.
- Propose deferring HYP-05 agronomic validation. Pixel-floor sensitivity, if supported
  by saved data, describes policy effects only; it cannot validate flooding-state
  fidelity. Water-mask comparisons remain excluded without underlying data (DEC-45).
- Report per-index pixel-floor sufficiency separately from stored joint quality.
  Count unique returned M1 acquisition intervals, not assumed individual satellite
  overpasses. M2 source-specific measurements remain a separate dataset; historical
  M1 data retains its prototype provenance qualification (engineering interface in
  data-evaluation-plan.md, section 8).
- Include zero-observation months and missing pixels explicitly. Compute seasonal
  gaps only inside contiguous season blocks; report whole-window gaps and leading/
  trailing observation-free periods separately. No gap filling (DEC-45).
- Initial outputs are descriptive. The current CI requirement in section 12 is an open
  advisor decision for this one-field case: do not use a one-field cluster bootstrap or
  naive independent-pixel intervals. Resolve the target estimand, temporal dependence,
  and whether descriptive reporting suffices before any inferential claims.
- Historical results were already inspected before this amendment. Describe new
  analysis as retrospective/exploratory; do not label new criteria preregistered.
  Any HYP-01 formal verdict requires agreed operational criteria. Until then report
  descriptive observations and leave the hypothesis adjudication pending.

**Proposed acceptance (DEC-45):** recoverable identified snapshot; reproducible scoped
RQ1/RQ3 results; discrepancies against historical records explained; offline technical
checks passed with proof boundaries; limitations and literature comparison complete;
advisor decision recorded. An unrecovered input blocks measured-result reproduction,
not preparation of an explicitly incomplete advisor packet.


## 18 · Proposed public-secondary-data replacement (DEC-46)

**Status: preparation authorized; advisor approval pending.** This alternative supplements
§17 because the approved private-field inputs remain unrecovered (OBS-41/43). It does
not change the approved wording or consent requirements in §§1–16.

- **Analysis unit:** one publicly mapped sawah polygon, provisionally OBS-46's FID 297
  in Teluknaga. It is not established as an individual farm parcel. Describe the case
  as a mapped-area monitoring study; do not infer smallholder ownership or field size.
- **Selection:** retain the documented source-ID ordering and all five screened units
  before inspecting satellite outcomes (OBS-46). Do not replace a poorly observed unit
  merely to improve availability. This bounded sample is not representative.
- **Period:** propose calendar 2019 to align with the source label. Exact mapping dates
  and monthly rice cultivation remain unknown (OBS-46); title-year alignment does not
  establish temporal ground truth. Report calendar months without assumed seasons or
  phenological stages. A period change requires a recorded rationale before acquisition.
- **Replacement RQ1 proposal:** what separate NDVI, NDMI and joint usable-interval
  availability, monthly counts and observation gaps does this mapped area support
  during the documented period under the specified processing policy?
- **Replacement RQ3 proposal:** how do separate valid-pixel counts and exploratory
  9/3 policy floors constrain delivered observations for this geometry? No universal
  minimum field size, validated threshold or agronomic accuracy claim follows.
- **Source use:** record publisher, original identifiers, raw geometry, CRS, query,
  retrieval date, hashes, source-label limitations and an established reuse basis.
  Public-source documentation does not imply farmer consent; do not populate private
  declarations with invented verification. Institutional treatment of secondary data
  remains an advisor decision. Preserve source data separately from app user records.
- **Processing:** OBS-47 prepares only an offline Statistical interval pilot. Inspect
  raw responses, interval boundaries and provenance before selecting the final study
  route. Preserve missing values and exclude duplicates/conflicts from inflated counts.
  Do not identify an aggregated interval as one verified satellite acquisition or
  silently merge it with M2 Process records. Existing private-input validation remains.
- **Acceptance:** reuse and unit/date limitations explicitly resolved or accepted within
  revised academic claims; compatible input contract and bounded execution checked;
  real snapshot preserved; descriptive results reproduced; technical replay reported
  separately; actual advisor decision recorded. No new interviews, field collection or
  participant UAT are proposed. §17's uncertainty and claim limitations still apply.


**September 14 source-selection update (DEC-47):** The developer removed the Teluknaga-first
screening constraint. The FID 297 / calendar 2019 case above remains a historical
proposal, not a fixed replacement site. Compare documented Indonesian padi sources
before proposing a final unit and compatible period; source quality takes precedence
over locality. Preserve approved scope history and obtain advisor review of the final
case amendment. No country change, sampling change or new academic approval is inferred.


**Proposed fixed-block option (DEC-47 preparation; OBS-54):** A three-candidate shortlist
now exists using 6 × 6 source-cell rectangles in the documented Open-SEA convenience
pool. These units are analysis blocks, not farmer parcels. The size and all-positive
rice-label eligibility are engineering choices with explicit selection bias; no
universal minimum-area claim follows. This option changes the geometry basis of RQ3
and needs advisor review before being called the accepted method. Proposed calendar
2021 is conditional on a map generated from 2020–2021 inputs. The
[candidate-selection record](../docs/m3-candidate-selection-2026-09-14.md) owns exact
ordering, coordinates and reproducibility details; previous approved wording remains.


**Pending-review technical comparison (preparation under DEC-45/47):** Propose comparing
complete-pair delivery with independent per-index delivery on identical frozen records
and identical per-index quality rules. Measure the magnitude and timing of withheld
passing observations; extra single-index values alone are a mathematical consequence,
not a novelty result. Unknown decisions remain unevaluable, not rejected quality.
The [comparison worksheet](../docs/m3-delivery-comparison-proposal.md) specifies counts,
checks and historical-adapter incompatibility. OBS-57 verifies synthetic counting only.
This proposal does not approve production changes or settle the thesis contribution.


## 19 — Advisor-supported direction and pre-acquisition specification

**Updated: 2026-09-15. Basis: DEC-48.** This section supersedes the blanket
advisor-response-pending status of §§17-18 for the overall direction and participant-free
evaluation. Earlier proposals remain historical; exact site/sample and acquisition
settings are not automatically approved by the advisor's message.

**Primary contribution framing:** evaluate the complete-pair versus independent-index
delivery policy, with observation availability and pixel sufficiency as supporting
measurements. Establish differentiation through the literature; neither extra singleton
values nor advisor support proves novelty. No usability, farmer-benefit, crop-health
accuracy or general superiority claim is permitted.

**Buffer response:** compare the original analysis geometry (0 m) against a 10 m inward
buffer in a metric local CRS as the initial engineering specification, not an
advisor-selected or validated purity distance. Freeze exact geometries and hashes before
satellite acquisition. Apply both delivery policies to each geometry, yielding a paired
2 geometry × 2 policy comparison with identical dates, source products and quality rules.
An empty/invalid buffer is an explicit ineligible geometry, not zero usable observations;
retain its exclusion and do not silently replace the site. Report area loss, source/valid
pixel counts and availability changes. Buffering a fixed raster block removes its edges,
which may not coincide with real padi boundaries. It cannot establish pure rice pixels or
remove source-classification error. Do not optimize buffer size using favorable outcomes.

**Time unit and denominator:** proposed calendar 2021 is 365 UTC days, from
2021-01-01 inclusive to 2022-01-01 exclusive. Freeze the final period before acquisition.
Use daily intervals or records that can be assigned to exact UTC acquisition days;
coarser aggregated intervals cannot support these daily metrics. No interpolation or
carrying an older value forward as a new observation. Deduplicate exact source identities;
conflicting duplicates must be resolved before analysis. A complete pair must come from
the same compatible record/source, not NDVI and NDMI from different acquisitions that
happen to share a day. Count each qualifying day only once for each metric.

**Prespecified metrics, for each geometry and delivery policy:**
- Any-index day coverage = 100 × days with at least one delivered passing index / all
  calendar days in the frozen period.
- Complete-pair day coverage = 100 × days with a delivered compatible passing pair /
  the same calendar-day denominator.
- Separate NDVI and NDMI day coverage use that same denominator.
- Report policy differences in percentage points within each geometry, then the change
  in those differences between original and buffered geometry. Complete-pair coverage
  must be identical across policies when input quality decisions are identical.
- Mean, median and longest gap use differences between consecutive distinct qualifying
  UTC dates, separately for any-index, NDVI, NDMI and complete-pair delivery. Fewer than
  two dates yields NA, never zero. Report leading/trailing absence separately; with no
  qualifying dates report the full observation-free period once. These are observation
  gaps, not processing latency or how long a user waits after opening the app.

**Failures and missingness:** report calendar days, attempted requests, returned requests,
fully evaluated days, known no-observation days and unresolved days separately. A failed
request is not evidence of cloud rejection or satellite absence. Verified available days
remain a known lower bound while any relevant source/day is unresolved; optionally show
an identification bound by adding unresolved days that could change that metric's daily
status, capped at the calendar-day total. These are missing-data bounds, not confidence
intervals. Report evaluable-day fractions as secondary results with their own denominator;
do not silently substitute them for calendar coverage. Do not label provisional coverage
as a complete empirical result until unresolved processing is reconciled.

**Execution:** freeze the site/sample, quality criteria, source identity, daily processing
settings and geometry pair in a dated manifest before requesting satellite data. This is
prospective specification of the replacement experiment, not retrospective preregistration
of earlier exploratory work. The existing Statistics-only request proposal and synthetic
Boolean checker do not yet implement this full contract. No new live acquisition or
production behavior change is implied by recording this feedback.


**Paired-source preparation constraint (OBS-60):** The first Process template uses a
strict single-source match across both indices and geometry variants. Multiple-source
or mismatching responses are unresolved paired comparisons, not satellite absence.
Report this eligibility limitation. Grid alignment must be verified before attributing
geometry differences solely to buffering. The analysis preparation document records the
implementation checkpoint; this does not change the final study sample or quality floors.


## 20 — Phase 1 frozen specification

**Basis: DEC-49; prior advisor conditions DEC-48.** Freeze one primary analysis block,
`open-sea-2021-tile-42-r5566-c5626`, in Krangkeng, Indramayu, for 2021-01-01 through
2022-01-01 exclusive (365 UTC days). This is a purposive one-block case, not a sample of
Indonesian farms. Do not pool the alternative candidates or replace unfavorable outcomes.
Retain the map's selection dependence and unverified crop-truth limitations.

**Grid and buffer design:** supersede the four independently clipped requests of OBS-60.
Request one common bbox raster per index, then apply both polygons locally. Snap the
original envelope outward to 20 m multiples in the local metric CRS; request 10 m NDVI
and 20 m NDMI grids over that same extent. Include cells whose centres are covered by
the polygon, including its boundary. Do not use all-touched or area-weighted membership.
Thus buffered samples are subsets of original samples within each index. A selected
cell may still mix land covers; no pure-rice or native-Sentinel-grid alignment claim.
EVID-063 supports avoiding bbox-plus-geometry requests. OBS-62 records geometric counts.

**Quality specification:** reuse the production evalscript formulas, SCL exclusions
[0,1,3,8,9,10], nearest resampling and harmonized L2A processing. NDVI uses B08/B04 at
10 m; NDMI uses B08/B11 on the 20 m output grid. Retain SCL water class 6 without
claiming agronomic validation. Per geometry/index, count only centre-selected pixels
with source presence, passing mask, finite value and nonzero denominator. Passing
requires at least 9 valid NDVI pixels or 3 valid NDMI pixels respectively. These remain
provisional technical floors. No extra cloud-cover cut, adaptive floor or post-result
threshold tuning. Missing metadata, invalid counts or malformed rasters are processing
failures, not quality rejection. Summary statistics must use the same selected pixels.

**Source and inventory specification:** enumerate all catalogue pages for the original
case and frozen period with no cloud-percentage filter; retain raw items and query
provenance. Build distinct UTC-day inventory and retain item identities/reprocessed
versions. Process each inventoried day using the common-bbox pair. Accept paired
source identity only when one scene/product/path, service version and valid acquisition
instant match across NDVI and NDMI; derive both geometry variants from those rasters.
Ambiguous multiple-source days or mismatches remain unresolved, never no-acquisition.
Complete catalogue with no item permits a known no-acquisition day; incomplete inventory
does not. This defines a strict source-eligible case analysis, not complete sensitivity
to every possible scene combination. No best-cloud-day selection. Pilot uses the first
chronological inventoried day; inability to resolve it is reported before any expansion.

**Comparison and interpretation:** retain §19's daily metrics and missing-data accounting.
Joint delivery requires both per-index decisions; independent delivery retains each
passing observation, without inventing its companion or carrying observations forward.
Both policies receive identical inputs. A pair-compatibility failure precludes complete
pairs but does not erase independently verified data from descriptive single-index
accounting; flag that day as unresolved for paired analysis. Report paired comparisons
on matched inputs and retain calendar-day bounds for unresolved days. A zero difference
is valid. No significance testing, confidence intervals, causal farmer-benefit inference,
new-algorithm claim or assertion of universal novelty.

**Phase 2 acceptance:** actual returned TIFFs must match declared EPSG, dimensions,
north-up affine and planned pixel scale/origin within 1e-6 m before applying masks.
Unexpected scale, rotation, shape, masks or source metadata stop the analysis for that
response. Preserve originals; record any contract amendment before reprocessing. Freeze
execution budgets and account allowance in Phase 2; no live acquisition is authorized
by the specification alone. The manifest owns exact grids, masks, hashes and templates;
this protocol owns methodology. This is prospective specification after source-map
exploration, not registered preregistration.

**Contribution statement:** Matani evaluates the observable information withheld by
complete-pair delivery compared with independent delivery of quality-passing NDVI/NDMI,
using a reproducible single-case dataset, common-grid buffer sensitivity and controlled
technical delivery checks. Existing availability, reconstruction and DSS work motivate
the question; literature review has not established that this is the first such policy.
The baseline is an explicit design alternative, not a claimed reproduction of another
published system. Literature limitations do not prevent specifying the experiment but
must remain visible in the paper's novelty wording.

## ML evaluation extension (DEC-54) — advisor-visible, 2026-09-25

**Status:** proposed, not advisor-approved.

**Question:** how accurately radar-only Random Forest and XGBoost models estimate block-mean Sentinel-2 NDVI over held-out mapped-rice regions, and at what optical-gap length they beat temporal interpolation.

**Method:** see [`../docs/matani-ml-technical-spec.md`](../docs/matani-ml-technical-spec.md):
- sampling §3, target and matching §4, features §5, leave-one-tile-out splits §6;
- baselines and budgets §7, metrics and the gap experiment §8, leakage controls §9, threats §10.

The frozen Phase 4 observation study stays unchanged and serves as motivation. The claim is limited to within-2021 spatial transfer over map-confident contiguous rice. It does not establish agronomic accuracy, stages, yield or farmer benefit.
