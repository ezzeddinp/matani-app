# Matani · Research Protocol

**Document type:** Research protocol
**Audience:** The developer, thesis advisor, reviewers, and AI agents working in this repo
**Status:** Active — draft pending advisor review
**Updated:** 2026-07-28
**Canonical for:** Research questions, hypotheses, methodology, and validity of the Sentinel-2 NDVI/NDMI monitoring evaluation, and the thesis paper's system-evaluation track (§ 16)
**Companion documents:** [`evidence-register.md`](evidence-register.md), [`data-evaluation-plan.md`](data-evaluation-plan.md), [`project-architecture.md`](project-architecture.md), [`implementation-plan.md`](implementation-plan.md), [`product-requirements.md`](product-requirements.md)

---

## How to read this document

This protocol is the single canonical home for **what the thesis is trying to learn and how a defensible answer is judged** — research questions, hypotheses, unit of analysis, sampling, alignment and quality rules, validation metrics, and threats to validity. Read it this way:

- **This is the "why and whether", not the "how".** Engineering mechanics — the exact evalscripts, request shapes, persistence schema, worker/job boundary, provider adapters, and quality-pipeline implementation — live in [`data-evaluation-plan.md`](data-evaluation-plan.md). This protocol states the *research requirement* (e.g. "polygon-level, not tile-level, quality assessment"); the plan states the *code that satisfies it*. Where a rule here needs an implementation, link — never duplicate.
- **External facts are cited, never restated.** Every externally sourced figure or claim carries an `EVID-*` / `OBS-*` ID from [`evidence-register.md`](evidence-register.md). This document does not re-copy the number or the canonical wording; it cites the ID and adds a short role-specific gloss. If a fact you need has no EVID entry yet, it must be added to the register first (see the register's "Adding new evidence").
- **Decisions are cited by `DEC-*`.** Product and thesis decisions live in [`context-dump.md`](context-dump.md) § 5. This protocol implements and elaborates them; it does not re-decide them.
- **Hypotheses are typed `HYP-*` and defined here.** Every falsifiable claim this thesis intends to test is registered in § 1 with an ID, a directional statement, and an explicit falsification criterion (§ 12). A `HYP-*` is a *question the data will answer*, never a finding — do not cite a HYP as if it were established.
- **Nothing here claims the current code is thesis-ready.** Per [`../AGENTS.md`](../AGENTS.md) honesty constraints, the satellite pipeline is a prototype with a visibly labeled synthetic fixture fallback; this protocol defines the standard the work must reach, and the gap to it is real and open.
- **The RQ set is provisional.** The research questions in § 1 are candidate framings consistent with the thesis focus (DEC-01). The **final RQ set requires advisor approval** — treat § 1 as a proposal to that conversation, not a settled contract.

---

## 1 · Research questions and hypotheses

The thesis deliverable is the **rice-focused mobile decision support system** described in the thesis paper (GROW workflow; DEC-14 amending DEC-01), authored by the three-person thesis team (DEC-17). The measurement evaluation below is that thesis's **evaluation backbone**: the DSS's crop-condition claims are only as defensible as the Sentinel-2 NDVI/NDMI measurements beneath them, so RQ1–RQ3 remain the standard the pipeline must meet. Thesis crop scope is **padi (rice) only** (DEC-15); non-rice strata are post-thesis. The paper's own prototype evaluation framework (functional testing, API response testing, conceptual validation, UAT) is the **system-evaluation track** and is recorded in § 16; it complements, and never substitutes for, the measurement evaluation. The candidate research questions below frame that evaluation. **The final RQ set requires advisor approval** — this section is a proposal, and both the wording and the inclusion of the optional RQ4 are open decisions.

### Candidate research questions

- **RQ1 — Usable-observation cadence.** Over a representative sample of Indonesian smallholder fields, what fraction of nominal Sentinel-2 acquisitions yield *quality-passing* NDVI/NDMI observations at the polygon level, and what monitoring cadence is therefore defensible — potentially differing by region and by wet/dry season? This directly separates nominal 5-day revisit (EVID-006) from usable cadence, which persistent tropical cloud cover erodes (EVID-015).
- **RQ2 — Statistical API vs independent processing.** How do polygon-level NDVI/NDMI statistics returned by the Sentinel Hub Statistical API (EVID-012) compare with values independently computed from raster samples over the same geometry, acquisition, and masking rules? This tests whether the API's aggregated statistics are a trustworthy measurement surface or introduce systematic bias.
- **RQ3 — Field size vs valid-pixel sufficiency and index reliability.** How does field size affect the number of valid pixels available per index and the resulting reliability, given that NDVI uses 10 m bands (B04/B08) and NDMI's SWIR input (B11) is 20 m native (EVID-009)? Because ≈62% of Indonesian land-using farmers are *petani gurem* controlling <0.5 ha (EVID-013), small fields are the population of interest, not an edge case.
- **RQ4 (optional, advisor-dependent) — Index dynamics vs ground observations.** Do NDVI/NDMI dynamics over a crop cycle agree with independently recorded ground observations of crop stage and visible stress? RQ4's feasibility is bounded by the thesis team's ground-truth collection limits (§ 5; DEC-17); it may be scoped down or dropped.

### Hypotheses

All hypotheses are unvalidated until the evaluation is run; each has an explicit falsification criterion in § 12.

- **HYP-01 — Usable-observation cadence (supports RQ1).** For representative Indonesian smallholder fields, the rate of quality-passing polygon-level observations is materially lower than the nominal acquisition rate, such that no single fixed cadence (weekly/biweekly/monthly) is defensible nationwide; the defensible cadence varies by region and season and can only be set from the feasibility study (§ 4), never from EVID-006. *Directional prior, not a finding.*
- **HYP-02 — API-vs-independent agreement (supports RQ2).** Polygon-level NDVI/NDMI from the Statistical API agrees with independently processed raster samples within a bounded, reportable error (bias and RMSE) when identical geometry, acquisition, and masking are applied; residual disagreement is attributable to documented differences (resampling of B11, dataMask/SCL handling, aggregation), not to unexplained divergence.
- **HYP-03 — Minimum usable field size (supports RQ3).** There exists an empirically determined minimum field size below which valid-pixel counts (per index, computed independently for NDVI and NDMI) are too few for a reliable polygon statistic, and this threshold is *larger* for NDMI than for NDVI because of B11's coarser 20 m resolution (EVID-009). No universal threshold is assumed in advance — it is estimated from data.
- **HYP-04 — As-built NDVI severity thresholds (as-built UI heuristic, not validated).** The NDVI severity bands and cutoffs currently hard-coded in `constants/ndvi.ts` (0.60 / 0.20 / 0.00 boundaries; `constants/ndvi.ts:12-45,64-100`) are an **as-built UI heuristic**, not calibrated science, and are not expected to hold as crop- and stage-appropriate stress classes for Indonesian smallholder conditions without recalibration (DEC-11). This HYP is registered to prevent the shipped thresholds being mistaken for a validated result; testing it is secondary to RQ1–RQ3 and stage-dependent (§ 13).
- **HYP-05 — Crop/phenology-aware water masking (supports the quality rules in § 8).** A masking rule that does *not* blanket-mask water inside rice polygons — treating flooding/transplanting as legitimate low-NDVI phenology (EVID-016) rather than as invalid or stressed — produces more agronomically faithful rice observations than a naive "mask all water" rule. Remains HYP until validated against ground observations of paddy flooding state (§ 5); the rule itself is versioned (§ 8).
- **HYP-06 (optional, paired with RQ4) — Index-dynamics vs ground agreement.** Where ground observations exist, NDVI/NDMI trajectories track recorded crop-stage progression and flagged visible stress with better-than-chance agreement. Contingent on RQ4 being approved and on ground-truth feasibility (§ 5); may be dropped with RQ4.
- **HYP-07 — Weather risk-score heuristic (as-built UI heuristic, not validated; DEC-16).** The client-side weather risk score — `min(100, max(0, Pavg×4 + H×0.4))` with bands Low <40 / Medium 40–69 / High ≥70 (`app/(tabs)/weather.tsx:541-576`) — is a **prototype decision-support indicator**, not an adopted or validated agronomic risk model; its weights and bands are not expected to hold without calibration against local agronomic data. The thesis paper positions it exactly this way. Registered (like HYP-04) to prevent the shipped heuristic being mistaken for a validated result; calibrating it is stage-dependent and secondary to RQ1–RQ3.

**Open for advisor decision:** the final RQ wording, whether RQ4/HYP-06 are in scope, and whether HYP-04 is tested in this thesis or merely documented as an as-built heuristic to be calibrated later.

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

**Primary unit of analysis: the field × acquisition observation** — one polygon's quality-assessed NDVI/NDMI statistics for one acquisition date. Justification: RQ1 (usable fraction and cadence), RQ2 (API vs independent), and RQ3 (size vs valid-pixel sufficiency) are all evaluated per observation — each observation either passes quality or does not, has an API value and an independent value, and has per-index valid-pixel counts. This is the finest grain at which all three RQs are simultaneously defined.

**Clustering / non-independence (must be handled in analysis).** Observations are **not independent**: many observations are nested within one field, and many fields are nested within one region and one crop type. Repeated observations of the same field share its geometry, terrain, and adjacency; fields in the same region share weather and cloud regimes. Naive pooling would understate uncertainty and inflate significance. The analysis must account for this structure (e.g. cluster-robust standard errors or mixed/hierarchical models with field and region as grouping levels), and per-stratum reporting (§ 12) is preferred over a single pooled headline number. The specific estimator is an analysis-plan detail; the *requirement* to handle clustering is canonical here.

---

## 3 · Study sites and inclusion / exclusion criteria

### Candidate regions

Representative candidate regions spanning Indonesia's major agroclimatic and cropping contexts:

- **Java** — dominant rice/maize smallholding, intensive and fragmented.
- **Sumatra** — mixed estate/smallholder, incl. coffee highlands and lowland crops.
- **Kalimantan** — including peat/mixed landscapes with heavy cloud regimes.
- **Sulawesi** — rice and tree crops (incl. coffee/cocoa contexts).
- **Bali / Nusa Tenggara** — terraced rice and a drier east providing wet/dry-season contrast.
- **Papua — open decision.** Included **only if** it falls within the intended research population; its inclusion is explicitly an **open decision requiring advisor approval**, weighed against access, consent, and coverage feasibility.

Sites within these regions are selected to give contrast on the axes the RQs care about: cloud regime (RQ1), field size (RQ3), crop and phenology (§ 13), and terrain (§ 10). Final site selection depends on the feasibility study (§ 4) and consent (§ 14).

### Field inclusion criteria

- Crop type among the supported categories: **padi** (rice), **jagung** (maize), **kedelai** (soybean), **teh** (tea), **kopi** (coffee) — the product's crop vocabulary (glossary, `context-dump.md`). **Thesis analysis is scoped to padi (DEC-15)**: non-rice fields may be captured by the product but enter the thesis evaluation only as documented extensions.
- A **valid field polygon** (not a bbox): closed, non-self-intersecting geometry with a plausible area, digitized to the field boundary (§ 7).
- **Farmer informed consent** obtained for use of field location and any ground observations (§ 14).
- Field falls within a selected study site and its 12-month availability record exists (§ 4).

### Field exclusion criteria

- Polygon invalid, degenerate, or clearly not a single agricultural field.
- Consent absent or withdrawn.
- Crop outside the supported categories, unless explicitly added as a documented extension.
- Fields whose geometry cannot be reliably separated from permanent water or built structures at Sentinel-2 resolution (flagged, not silently dropped — see § 8, § 9).

Small fields are **not** an exclusion criterion. Because *petani gurem* <0.5 ha dominate the population (EVID-013), excluding small fields would evaluate a population the product does not serve; instead small-field reliability is a research question (RQ3) and any size threshold is an empirical outcome (HYP-03), not an entry filter.

---

## 4 · Indonesia feasibility study (mandatory, precedes pipeline implementation)

**This study is mandatory and must precede full pipeline implementation (DEC-12).** Monitoring-cadence claims are **forbidden** until this study supports them: nominal 5-day revisit (EVID-006) is an acquisition cadence under cloud-free conditions, not a usable-observation cadence, and persistent tropical cloud cover materially reduces usable optical observations (EVID-015). A single-location catalogue check does not settle this (OBS-01, which moreover did not independently reproduce). The purpose of this study is to *measure* what cadence is defensible, per site and season, before any product promises one.

### Design

A **bounded 12-month retrospective availability study** over the representative study sites (§ 3). Retrospective (using the historical archive) so it can run before the live acquisition pipeline is fully built, and 12 months so it spans a full wet/dry seasonal cycle. Unit: per field (or per representative polygon) per site.

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

The **defensible product monitoring cadence** — weekly / biweekly / monthly / event-based — stated **per location and per season**, possibly differing across sites. This outcome, and only this outcome, licenses any cadence claim elsewhere in the repo (product-requirements.md, product-brief.md). Until it exists, cadence is stated as *unknown / to be determined by the feasibility study*. The mechanics of running the study (queries, batching, PU budgeting, persistence) are specified in [`data-evaluation-plan.md`](data-evaluation-plan.md); this section owns the *research requirement* and its forbidden-until-supported constraint.

**Execution status (2026-07-28).** The tested calculation workspace and input/output
contract exist under `research/`, and a labeled fixture run proves the report can be
generated deterministically (CODE; OBS-03). No representative-site
CDSE acquisition has been executed, so there is no measured feasibility report and
cadence remains unknown. A fixture row, successful HTTP response, or nominal revisit
cannot satisfy this section.

---

## 5 · Ground-truth / reference measurements

Ground observations anchor any claim that an index reading corresponds to a real field condition (RQ4/HYP-06) and are required to move HYP-04 (severity thresholds) and HYP-05 (rice-water rule) from hypothesis toward validation.

### What would be collected

- **Crop stage** — e.g. for padi: pre-flood/land-prep, flooding/transplanting, tillering/vegetative, reproductive, ripening, harvest; analogous stage schemes per crop (§ 13).
- **Visible stress** — presence/type of visible crop stress (water, nutrient, pest/disease) as a coarse categorical flag, not a quantitative measurement.
- **Flooding state** — for rice, standing-water presence (directly relevant to HYP-05 and EVID-016).
- **Georeferenced photos** — timestamped, location-tagged field photos as corroborating evidence.
- **Farmer reports** — the farmer's own account of recent field events (planting, irrigation, harvest, damage).

### Cadence, collector, quality controls

- **Cadence:** aligned to acquisition dates within a bounded window (§ 7), and at key phenological transitions; exact cadence is feasibility-limited.
- **Who collects:** primarily the developer and/or participating farmers; there is no field team.
- **Quality controls:** a fixed observation form with controlled vocabularies, mandatory timestamp + GPS on photos, one observer's categorical judgments recorded as such (not as measurement), and explicit recording of *who* observed and *when*.

### Honest feasibility note

This is a **three-person group thesis with no field team** (DEC-17). Comprehensive, high-frequency, multi-site ground truth is not realistically collectable at scale. Ground truth will be **sparse, opportunistic, and geographically limited**, which directly bounds RQ4/HYP-06 and the extent to which HYP-04/HYP-05 can be validated versus merely characterized. This limitation is carried forward into sampling (§ 6) and threats to validity (§ 15); it must not be papered over by substituting model or LLM output for ground truth (Gemini is never ground truth or a research label — DEC-08).

---

## 6 · Sampling strategy and target sample size

**Stratified sampling** by **region × crop × season** (the axes the RQs turn on). Strata ensure the evaluation reports per-context results (§ 12) rather than a single pooled number dominated by whichever context has the most fields, and align with the clustering structure (§ 2).

- **Strata:** region (§ 3) × crop × season (wet/dry). Under DEC-15 the thesis strata are **padi-only** (region × season); non-rice crop strata are defined here for post-thesis extension and are reported, if at all, as out-of-scope observations. Not all cells will be populated; empty or thin cells are reported as such, never imputed.
- **Two sampling layers:** (a) fields sampled within strata for spatial/size/crop coverage; (b) observations sampled in time via the acquisition calendar — with usable-observation availability itself an outcome (RQ1), so temporal "sample size" per field is partly determined by the feasibility study (§ 4).

### Target N and power — stated honestly

No fabricated power analysis is offered. A credible target N and any power statement depend on inputs that **do not yet exist**: the advisor-approved RQ set (§ 1), the feasibility study's usable-observation rates (§ 4), the achievable ground-truth volume (§ 5), and the CDSE PU budget (EVID-010). Consequently:

- The **RQ2** comparison (API vs independent) can reach a relatively large observation N cheaply, because it needs no ground truth — every quality-passing observation contributes a paired value.
- The **RQ1/RQ3** analyses are bounded by number of fields and by usable-observation availability.
- The **RQ4/HYP-06** analysis is bounded by ground-truth feasibility (§ 5) and will likely be small-N and exploratory.

A concrete target N and any power/precision targets will be set **after** the feasibility study and advisor approval, and recorded here at that point. Until then, claiming a specific N or statistical power would be unsupported.

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
- **State unavailability honestly** — when no quality-passing observation exists for a field/window, the product shows an honest *unavailable* state (the honesty constraint from `../AGENTS.md`; replaces the prototype's labeled synthetic fixture fallback, roadmap M2).

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

Field size interacts with pixel size to determine whether a polygon statistic is even meaningful (RQ3, HYP-03).

- **Pixel footprints.** NDVI uses B04 (Red) and B08 (NIR) at **10 m** native resolution — a pixel covers ≈100 m². NDMI's SWIR input B11 is **20 m** native — a pixel covers ≈400 m² (band resolutions: EVID-009). A 0.5 ha field (5,000 m²) is on the order of tens of NDVI pixels but only ~12 NDMI pixels before any masking or boundary loss.
- **Boundary-pixel mixing.** Pixels straddling the field edge mix the crop with roads, irrigation, buildings, and adjacent farms; the coarser B11 mixes over a larger footprint. Boundary mixing is a primary error source for small fields.
- **Independent valid-pixel counts per index.** NDVI and NDMI valid-pixel counts are computed and reported **separately** (§ 4, § 12) because the 10 m/20 m mismatch means a field can have enough valid NDVI pixels but too few valid NDMI pixels.
- **Inward buffer, conditionally.** An inward buffer to drop boundary pixels is applied **only when the field is large enough** to retain a sufficient interior sample; on the smallest fields a buffer would erase the field. Whether and how much to buffer is size-dependent and recorded per observation.
- **No false spatial detail.** B11 (20 m) resampled to a 10 m grid for NDMI does **not** create real 10 m spatial detail; the underlying information stays 20 m. The resampling choice is recorded (a CODE-*/data-evaluation-plan fact), and no claim of upsampled spatial resolution is made.
- **Minimum usable field size is empirical (HYP-03).** No universal minimum-size threshold is invented; it is estimated from the data, separately per index, and reported with uncertainty.
- **Small fields are the population.** Because ≈62% of Indonesian land-using farmers are *petani gurem* <0.5 ha (EVID-013), small-field reliability is the central question, not a corner case — its difficulty is a finding to report, not a reason to exclude (§ 3).

---

## 10 · Topography and mixed cropping

Beyond size, terrain and cropping pattern degrade optical index reliability in exactly the regions the product targets:

- **Terrain shadow** in tea (teh) and coffee (kopi) highlands: slopes and hill shadow alter illumination and can be misclassified or bias reflectance; highland sites are flagged and terrain effects noted per stratum (§ 12).
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

- **RQ2 (API vs independent):** paired-value agreement over the same observations — **bias (mean signed difference)**, **MAE**, **RMSE**, **correlation**, and a **Bland–Altman** analysis (mean-difference and limits of agreement) to expose any magnitude-dependent bias. Reported separately for NDVI and NDMI.
- **RQ1 (usable cadence):** usable-observation fraction, usable observations/month, and gap statistics (median/longest), per site and season (§ 4).
- **RQ3 (size vs sufficiency):** valid-pixel count and a reliability indicator as a function of field size, per index, with the size threshold (HYP-03) estimated with uncertainty.
- **RQ4/HYP-06 (if in scope):** agreement between index dynamics and ground-observed stage/stress, reported as exploratory given small N (§ 5, § 6).

### Uncertainty

- **Confidence intervals** on every reported estimate, computed in a way that respects clustering (§ 2) — cluster-robust or hierarchical, not naive pooled intervals.
- **Per-stratum reporting** (region × crop × season) is the default; a pooled headline number, if given, is accompanied by its per-stratum breakdown and never replaces it.

### Explicit failure / falsification criteria

Each hypothesis has a result that would falsify it:

- **HYP-01** is falsified if usable-observation rates are high and stable enough across sites and seasons that a single fixed cadence *is* defensible nationwide (i.e. cloud loss does not materially erode nominal revisit).
- **HYP-02** is falsified if API and independently processed values diverge beyond a pre-registered tolerance (bias/RMSE) that cannot be explained by documented differences (resampling, dataMask/SCL, aggregation) — indicating the API statistic is not a trustworthy measurement surface as used.
- **HYP-03** is falsified if index reliability shows no systematic dependence on field size down to the smallest fields (no identifiable minimum), or if NDVI and NDMI thresholds do not order as predicted.
- **HYP-04** is *supported* (contrary to its skeptical prior) only if the as-built `constants/ndvi.ts` cutoffs turn out to be crop- and stage-appropriate stress classes without recalibration; any crop/stage where a legitimate phenological low (e.g. flooded paddy, EVID-016) is misclassified as stress falsifies the heuristic for that context.
- **HYP-05** is falsified if crop/phenology-aware water handling produces rice observations no more agronomically faithful than a naive blanket-water-mask rule, judged against ground flooding-state observations (§ 5).
- **HYP-06** (if in scope) is falsified if index dynamics show no better-than-chance agreement with ground-observed stage/stress.

Pre-registering these tolerances and criteria (with the advisor) before running the evaluation is the intended practice; the specific numeric tolerances are set at that point and recorded here.

---

## 13 · Crop and phenological-stage stratification

- **Analysis is stratified by crop and by phenological stage**, not pooled across a whole cycle. NDVI/NDMI interpretation is **stage-dependent**: the same low NDVI means opposite things at different stages.
- **The flooded-paddy example is canonical.** For padi, low NDVI during flooding/transplanting is expected phenology driven by standing water, not stress, and greenness alone cannot separate the two (EVID-016). Stress classification (and any test of HYP-04) must therefore be conditioned on crop and stage — a stress label applied stage-blind is invalid.
- **Per-crop stage schemes** (padi, jagung, kedelai, teh, kopi) define the strata; tree crops (teh/kopi) have weaker discrete "stages" than annual row crops and are treated accordingly, in combination with the terrain caveats of § 10.
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

- **Site- and farmer-selection bias.** Sites and consenting farmers are not a random national sample; convenience/access shapes the sample and limits external validity. Reported per stratum (§ 12) to make the covered contexts explicit.
- **Seasonal coverage.** The 12-month feasibility window (§ 4) captures one wet/dry cycle; inter-annual variability (unusually wet/dry years) is uncontrolled and a monitoring-cadence result is conditional on the observed year.
- **Single-country scope.** Findings are for Indonesian smallholder conditions (DEC-01); they are not claimed to generalize to other countries or agroclimates.
- **Provider dependence.** Results depend on CDSE Sentinel Hub Statistical API semantics and the free-tier quota (EVID-010, EVID-012), on L2A/SCL product behavior (EVID-008), and on OAuth2 access (EVID-011). Provider changes can invalidate cost, cadence, or method assumptions.
- **Small-N limits.** Ground-truth-dependent analyses (RQ4/HYP-06) and thin strata are small-N and exploratory (§ 5, § 6); conclusions there are tentative by construction.
- **OBS-01 non-generalizability.** The single-location Jakarta catalogue check is one data point, was **not independently reproduced** from repo tooling, and tile-level cloud cover ≠ polygon cloud-free (OBS-01). It motivates the feasibility study; it is not evidence of usable cadence and is not generalized to any region or season.
- **Instrument / provider change risk (perishable claims).** Quotas and pricing (EVID-010, EVID-021), coverage, and even constellation membership (EVID-006 notes 2A retired / 2C operational) change without notice; they carry checked dates and are rechecked before any decision. A cadence or capacity result stated against a stale quota is a warning, not a guarantee.
- **Masking/threshold validity.** SCL is a heuristic (EVID-008); severity thresholds (HYP-04) and the rice-water rule (HYP-05) are unvalidated until field checks exist. Versioning masking rules (§ 8) bounds—but does not eliminate—the risk that a rule change alters conclusions.
- **Cloud-driven missingness is non-random.** Missing observations cluster by season and region (§ 11), so usable-cadence and agreement estimates can be biased toward clearer-sky periods/places; analyses must acknowledge this rather than treat gaps as random.

---

## 16 · System-evaluation track (from the thesis paper; DEC-14)

The thesis paper defines a **planned** prototype evaluation framework for the DSS itself.
At the 2026-07-27 repository baseline there is no automated test suite, CI workflow, or
completed UAT dataset (`package.json`, `.github/workflows/`, CODE); none of the procedures
below is a completed result yet. They are recorded here so the two tracks—**system
evaluation** (does the DSS work and is it usable?) and **measurement evaluation** (are
the numbers it shows defensible? §§ 1–15)—are one protocol, not two competing ones.

1. **Functional testing** — core app features (registration, polygon drawing, NDVI/NDMI display, weather retrieval, recommendation viewing) verified against the functional requirements ([`product-requirements.md`](product-requirements.md)). **Constraint:** functional tests of the satellite surfaces must state which data state they exercised (fixture / prototype / measured / unavailable); passing a display test on synthetic data is a UI test, never evidence the measurement works (INV-01/02).
2. **API response testing** — Sentinel Hub responses validated for correct band arithmetic and index ranges (−1…1); weather fallback (AccuWeather → Open-Meteo) verified under normal and simulated failure. Fixture-first in CI (DEC-09); live checks are bounded, out-of-band runs.
3. **Conceptual validation** — computed NDVI/NDMI compared against known rice phenological patterns from the literature. This is a plausibility check, not ground truth; it cannot validate HYP-04/HYP-05/HYP-07 (§ 12 owns validation standards). The flooded-paddy caveat (EVID-016) applies: low NDVI on padi is not automatically "stress".
4. **User acceptance testing (UAT)** — qualitative evaluation with prospective users of indicator understandability, risk-classification clarity, and perceived usefulness of AI-generated recommendations. UAT measures **usability and comprehension**, never measurement validity; Gemini output remains excluded from any research-label role (DEC-08).
5. **Known limitations** — no field-level ground truth (biomass, soil moisture sensors, yield records) in the prototype evaluation; the system is evaluated for technical correctness, API reliability, and usability, not predictive agronomic accuracy. This restates the paper's own limitation honestly; any stronger claim requires §§ 5, 12.

The mapping of this track onto milestones (which tests run at M0/M2/M3) lives in [`implementation-plan.md`](implementation-plan.md).
