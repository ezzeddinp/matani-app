# Matani · Data Evaluation Plan

**Document type:** Engineering data pipeline specification
**Audience:** The developer, thesis advisor, reviewers, and AI agents working in this repo
**Status:** Active — target pipeline specification; M1 contract artifacts exist, while
production measurement behavior remains unimplemented unless marked `[As-built]`
**Updated:** 2026-07-29
**Canonical for:** the engineering measurement contract, provider adapter, quality pipeline, persistence/provenance, cache identity, idempotency, fixtures, and Indonesia-specific masking/resolution behavior
**Companion documents:** [`research-protocol.md`](research-protocol.md), [`project-architecture.md`](project-architecture.md), [`product-requirements.md`](product-requirements.md), [`implementation-plan.md`](implementation-plan.md), [`evidence-register.md`](evidence-register.md)

---

## How to read this document

This is the **engineering realization** of the research standard. Read it this way:

- **Research validity is not decided here.** [`research-protocol.md`](research-protocol.md) owns *why and whether* — the research questions, hypotheses, unit of analysis, quality/masking *requirements*, and threats to validity. This document owns *how the code satisfies those requirements*: the measurement contract, adapter boundary, quality pipeline, persistence schema, cache identity, idempotency, and fixtures. Where the protocol states a rule, this document links to it and specifies the mechanism — it never re-derives the rule or re-argues the research.
- **`[As-built]` vs `[Thesis]` is load-bearing.** A heading or claim tagged `[As-built]` describes code that exists today (cited to `file:line`). A heading or claim tagged `[Thesis]` describes **target behavior that is not implemented** — it is a specification, not a report. Nothing in a `[Thesis]` section may be read as already built. The only `[As-built]` section is § 1.
- **External facts are cited, never restated.** Every externally sourced figure carries an `EVID-*` / `OBS-*` ID from [`evidence-register.md`](evidence-register.md); decisions carry `DEC-*` (from [`context-dump.md`](context-dump.md)) and architecture decisions carry `ADR-*` (from [`project-architecture.md`](project-architecture.md)); hypotheses carry `HYP-*` (from [`research-protocol.md`](research-protocol.md)). This document does not re-copy quota numbers, SCL class ids, or band resolutions — it cites the ID.
- **The canonical provenance paragraph lives elsewhere.** The single source of truth for what the satellite pipeline does today is [`project-architecture.md`](project-architecture.md) § 2 (Current measurement provenance). § 1 below links to it and does not restate it.
- **Physical design is frozen for M2, not deployed.** § 5 remains the canonical logical
  fields list. DEC-21 and § 9 close the four M1 engineering choices in a reviewable
  contract and migration-ready draft; no production measurement table or worker exists
  until M2 applies and tests them.

---

## 1 · As-built summary `[As-built]`

The satellite path today is a prototype request wired to the field-list surface with a visibly labeled synthetic fixture fallback, computing over a bounding box on a fixed date window through the CDSE-configured provider route, and persisting nothing as a measurement. The **canonical wording and the `file:line` evidence** for this live in [`project-architecture.md`](project-architecture.md) § 2 (Current measurement provenance) — it is not restated here; this document defers to it and specifies the target that replaces it.

### As-built gaps this plan closes

| Gap `[As-built]` | Where | Target `[Thesis]` | Owner |
|------------------|-------|-------------------|-------|
| **Fixed acquisition window** — hard-coded 2025-09-01 → 2025-09-05 in both the data filter and the aggregation | `backend/api/ndvi/utils.js:65-77` | Caller-supplied acquisition window bounded by policy (§ 2, § 6) | ADR-06 |
| **Bounding box, not polygon** — queries a bbox, defaulting to a hard-coded Jakarta bbox when none is supplied | `backend/api/ndvi/utils.js:49` | Statistics computed over the actual field polygon geometry (§ 2, § 4); bbox is never the measurement geometry (EVID-012, protocol § 7) | ADR-06 |
| **No cloud masking beyond `dataMask`** — evalscript passes `dataMask` through but never consults the Scene Classification Layer; no cloud/cirrus/shadow exclusion | `backend/api/ndvi/utils.js:12,15,22` | SCL-driven masking at the polygon level (§ 4), contrast EVID-008 / EVID-012 | ADR-06 |
| **No persistence** — fetched results become transient UI overrides (`ndviOverrides` state), never rows | `app/(tabs)/explore.tsx:1143-1150,1421,1426` | Provenance-complete measurement records written by the worker (§ 5) | ADR-06, ADR-07 |
| **Labeled synthetic fixture fallback remains in production** — on missing bbox / unusable result / thrown error the UI substitutes a fixture record; the 2026-07-27 hardening labels it “Simulasi demo” and “Bukan pengukuran satelit,” but it still substitutes rather than returning `unavailable` | `app/(tabs)/explore.tsx:320-343,1445-1462,2050-2072` | A measurement passes quality and is persisted, or is recorded as rejected with a reason; fixture substitution is removed (§ 2, § 4); honest `unavailable` state (DEC-10, protocol § 8, § 11) | ADR-06 |
| **Provider migration is not a production measurement adapter** — CDSE endpoint defaults are applied, but the bbox prototype still calls the provider directly and lacks the stable M2 adapter/persistence contract | `backend/sentinelAuth.js`, `backend/api/ndvi/utils.js`; OBS-11 is out-of-band research evidence | CDSE Sentinel Hub behind the stable provider adapter (§ 3), with the measurement semantics unchanged above it | ADR-02, ADR-08 |

---

## 2 · Measurement contract `[Thesis]`

A **Matani measurement** is the atomic output of the pipeline and the unit the research analyses consume. It corresponds to the protocol's primary unit of analysis — the *field × acquisition observation* ([`research-protocol.md`](research-protocol.md) § 2).

### Inputs

- **Field polygon geometry** — the actual drawn field polygon (closed, non-self-intersecting), **never a bounding box**. The Statistical API excludes pixels inside the bbox but outside the request geometry (EVID-012); the geometry the measurement is computed over is the polygon, and the bbox exists only as a provider transport detail, never as the measurement extent (protocol § 7).
- **Acquisition window** — a bounded start/end date range supplied by the caller (a worker job, § 6), subject to policy limits, not a hard-coded constant. When several quality-passing acquisitions fall in the window, the selection rule is fixed in advance and recorded per observation, and discarded acquisitions are persisted with a reason (protocol § 7, § 11).
- **Index set** — **NDVI and NDMI**, computed and assessed independently (NDVI from B04/B08 at 10 m, NDMI from B08/B11 with B11 at 20 m — EVID-009; see § 4, § 9).

### Outputs

- **Per-index statistics** — for each of NDVI and NDMI: the polygon-level aggregate statistics returned over the quality-masked geometry.
- **Per-index sample counts** — valid-pixel counts computed **separately** for NDVI and NDMI (they differ because of the 10 m / 20 m band mismatch — EVID-009, § 9).
- **Quality status** — `passed`, `rejected`, or `unavailable`, with the deciding reason (§ 4).

### The pass-or-reject rule (non-negotiable)

A measurement either:

1. **Passes quality** and is **persisted with full provenance** (§ 5), or
2. **Is recorded as rejected** with an enumerated, persisted reason (§ 4), or
3. **Is recorded as `unavailable`** (honest absence — no acquisition in window, or no quality-passing pixels) (protocol § 8, § 11).

It is **never replaced** by a synthesized value on a measurement surface. This removes the as-built labeled fixture fallback (§ 1), rather than merely labeling it, and enforces the honesty constraint (DEC-10, `AGENTS.md` § Honesty constraints): synthetic, fixture, or interpolated data is never stored or displayed as a measured observation.

---

## 3 · Provider adapter `[Thesis]`

The satellite provider sits behind an **adapter with a stable internal contract** (ADR-08), so the CDSE migration (ADR-02) and any future provider change are localized and do not alter measurement semantics. The measurement contract (§ 2) and quality pipeline (§ 4) depend on the adapter's internal contract, never on `services.sentinel-hub.com` or CDSE specifics.

### Adapter responsibilities

- **Authentication** — OAuth2 client-credentials against the CDSE identity endpoint: a registered OAuth client (`client_id` + `client_secret`) is exchanged for a bearer access token, and the token is **reused within its validity** rather than re-fetched per request (EVID-011). The `client_secret` is a server-side secret and must never ship in the Expo client (EVID-018; rotation/reissue tracked in [`project-architecture.md`](project-architecture.md) § 5.3).
- **Statistical API request construction** — build the polygon-geometry + evalscript + `dataMask` request that computes per-index statistics and excludes masked pixels (EVID-012). The evalscript reads the SCL band to drive exclusion (§ 4); the API does **not** filter clouds on its own (EVID-012 limitation).
- **Error taxonomy** — the adapter normalizes provider outcomes into a fixed internal set so the pipeline reacts to categories, not raw provider payloads:
  - `timeout` — no response within the bound.
  - `rate-limit` — provider throttling (e.g. HTTP 429 on the token or statistics endpoint; token over-fetching is a documented 429 source, EVID-011).
  - `provider-error` — any other non-success provider response.
  - `no-data` — a valid response carrying no usable observation for the geometry/window.

  Raw provider responses and stack traces are **never** surfaced to clients (contrast the as-built handler echoing `err.message`, [`project-architecture.md`](project-architecture.md) § 5.1).

### Swap-without-semantic-change guarantee

Swapping the provider (commercial Sentinel Hub → CDSE, or any future provider) changes only the adapter implementation. The measurement contract, the persisted schema (§ 5), the quality decisions (§ 4), and the cache identity (§ 6) are defined in provider-neutral terms and must not shift when the provider does. If a provider's contract cannot be expressed through the adapter without leaking provider-specific semantics upward, that is the ADR-08 revisit trigger.

### Quota accounting hooks

The adapter exposes hooks to account **requests and processing units (PU)** consumed per call against the CDSE free-tier quota (EVID-010 — **perishable; recheck at source before any capacity or deployment decision**). This accounting feeds the feasibility study's cost measures (protocol § 4) and the worker's budget enforcement (§ 6, § 7). Quota is a first-class, perishable input, not an afterthought.

---

## 4 · Quality pipeline `[Thesis]`

This section is the **engineering realization** of the research quality and masking rules — [`research-protocol.md`](research-protocol.md) § 8 (quality/masking), § 9 (resolution/small fields), § 10 (topography). The protocol owns the rules; this section owns the code that satisfies them and the reasons persisted with each decision.

### SCL-based masking

Using the Level-2A Scene Classification Layer, the evalscript **masks** (excludes from the statistics, via the `dataMask` output — EVID-012):

- clouds at **medium and high** probability,
- **cirrus**,
- **cloud shadows**,
- **invalid / saturated / defective** pixels,

via the corresponding SCL classes (EVID-008). SCL is a **per-pixel heuristic classification, not ground truth** (EVID-008) — it is a quality gate, not a guarantee, and this framing is preserved in every result.

### Polygon-level, not tile-level

Quality is assessed over **each field's own polygon**, never the tile. Tile-level `eo:cloud_cover` can read low while a specific smallholder polygon is fully clouded — OBS-01 makes exactly this point (a 6.7% tile can still be clouded over a given field; the observation was moreover not independently reproduced). Every observation carries a **polygon-level cloud/shadow fraction** and a **polygon valid-pixel fraction** (§ 5), computed from the SCL over the polygon.

### Per-index valid-pixel counts

Valid-pixel counts are computed **independently** for NDVI (B04/B08, 10 m) and NDMI (B08/B11, with B11 at 20 m) — EVID-009. A field can hold enough valid NDVI pixels but too few valid NDMI pixels; the two counts are separate fields in the record (§ 5) and separate reliability inputs for HYP-03 (protocol § 9, § 12). B11 resampled to a 10 m grid for NDMI **does not create real 10 m spatial detail** — the underlying information stays 20 m; the resampling method is recorded (§ 5) and **no claim of upsampled resolution is made** (protocol § 9).

### Rice-water rule (HYP-05)

The crop/phenology-aware water handling is a **research rule owned by the protocol** (§ 8, HYP-05) and only *referenced* here: no blanket water masking inside rice (padi) polygons, because flooding/transplanting is legitimate low-NDVI phenology, not stress (EVID-016); permanent water *outside* the polygon is excluded by geometry. The engineering obligation is that the **masking configuration is versioned** — a masking-config version is stored with every measurement (§ 5) so a change in masking never silently alters historical values. The rule remains **HYP-05 until field-validated** (protocol § 8); the versioning scheme itself is an open decision (§ 9). Link, do not duplicate: the rule text is protocol § 8.

### Rejection reasons (enumerated and persisted)

Every non-passing outcome carries one enumerated reason, persisted with the record (§ 5) and never a silent gap (protocol § 11):

- `clouded` — polygon cloud/shadow fraction above threshold.
- `too-few-valid-pixels` — per-index valid-pixel count below the reliability floor (per index; see HYP-03).
- `no-acquisition-in-window` — no Sentinel-2 acquisition intersected the polygon in the window.
- `no-valid-pixels` — an acquisition existed but no pixel survived masking.
- `geometry-unusable` — polygon degenerate, or field cannot be separated from permanent water/built structure at Sentinel-2 resolution (flagged, not dropped — protocol § 3, § 8).
- `provider-unavailable` — the adapter returned `timeout` / `rate-limit` / `provider-error` (§ 3).

### Honest unavailable outcome

When no quality-passing observation exists for a field/window, the pipeline records and the product shows an honest **`unavailable`** state (DEC-10; replaces the prototype's labeled fixture fallback — protocol § 8, roadmap M2). Missingness is itself an outcome of RQ1 (protocol § 11) and is preserved, not filled.

---

## 5 · Persistence and provenance `[Thesis]`

The pipeline persists a **provenance-complete measurement record** — every value carries its origin, so `measured` is distinguishable from `unavailable` and never confused with synthetic (`AGENTS.md` § Vocabulary; [`project-architecture.md`](project-architecture.md) § 3 provenance contract).

### Required fields (logical schema)

This is a **logical** required-fields list. The physical design (types, table split, indexes, JSONB vs columns) is an implementation task (§ 9), not fixed here.

| Field | Purpose |
|-------|---------|
| **Measurement ID** | Stable unique identity for the observation record. |
| **Field (lahan) ID** | The field this measurement belongs to. |
| **User / owner relationship** | The owning user, for RLS-scoped access (protocol § 14; EVID-020). |
| **Provider** | Which provider produced it (e.g. CDSE Sentinel Hub), for provider-swap traceability (§ 3). |
| **Satellite mission + platform** | Sentinel-2, and the specific platform where identifiable (constellation membership changes over time — EVID-006). |
| **Collection + processing level** | e.g. Sentinel-2 **L2A** (BOA surface reflectance — EVID-008). |
| **Source product / acquisition identifiers** | The product/scene identifiers backing the observation, for reproduction. |
| **Acquisition start / end timestamps** | The actual acquisition datetime(s) — the date **displayed** is the real acquisition date, never "current" or synthesized (protocol § 8). |
| **Processing timestamp** | When the pipeline computed the measurement (distinct from acquisition time). |
| **Geometry or geometry hash used** | The exact polygon the statistics were computed over (or its hash — § 6). |
| **Processing algorithm / version** | The index-computation algorithm and its version. |
| **Evalscript / processing-config version** | The evalscript + request-config version (part of cache identity — § 6). |
| **CRS** | The coordinate reference system used (protocol § 7). |
| **Output resolution** | The grid resolution the statistics were computed on. |
| **Resampling method** | How B11 (20 m) was brought to the working grid — recorded, with no claim of added detail (EVID-009, § 4, protocol § 9). |
| **Cloud / shadow masking version** | The versioned masking config applied (§ 4, protocol § 8). |
| **Tile-level cloud metadata** | The provider's tile-level cloud figure, retained **for context only** — explicitly not the quality basis (contrast polygon-level, OBS-01). |
| **Polygon-level cloud fraction** | Cloud/shadow fraction over the polygon (§ 4). |
| **Valid-pixel fraction** | Fraction of the polygon surviving masking. |
| **NDVI sample count + statistics** | Valid-pixel count and polygon statistics for NDVI. |
| **NDMI sample count + statistics** | Valid-pixel count and polygon statistics for NDMI, counted independently (EVID-009). |
| **Quality status** | `passed` / `rejected` / `unavailable` (§ 2, § 4). |
| **Rejection / limitation reason** | The enumerated reason when not `passed` (§ 4); rejections are data. |
| **Provenance metadata sufficient to reproduce** | Whatever additional request/response provenance is needed to reproduce the measurement from the archive. |

### Relation to the existing `lahan_health` table (insufficient)

The as-built `lahan_health` table stores only `id, lahan_id, user_id, ndvi_score, ndmi_score, status, captured_at, created_at, updated_at` (`supabase_setup.sql`, table `public.lahan_health`). It is **insufficient as a measurement record** because it carries **a single scalar score per index with no provenance**: no acquisition window or product identifiers, no geometry/geometry-hash, no provider/mission/collection/processing-level, no CRS/resolution/resampling method, no masking-config version, no polygon-level cloud fraction or per-index valid-pixel counts, and no enumerated rejection reason. A `status` text field cannot distinguish `measured` from `unavailable` from a synthesized value. It therefore cannot satisfy the provenance contract and cannot back RQ1–RQ3.

### Relation to versioned migrations (ADR-07)

The measurement record is introduced through **versioned, ordered Supabase migrations with DB tests** (ADR-07), which replace the legacy `supabase_setup.sql` (a 388-line file that is not a reliable clean-install migration — [`project-architecture.md`](project-architecture.md) § 4 ADR-07, § 7). DB tests must prove **cross-user RLS isolation** on the new table(s) (ADR-07, protocol § 14). Whether the record extends or supersedes `lahan_health` is part of the physical-schema open decision (§ 9).

---

## 6 · Cache identity and idempotency `[Thesis]`

An **equivalent measurement request must be idempotent**. Two requests are equivalent when they share the same **geometry hash + acquisition window + processing-config version** (evalscript/masking/algorithm versions). This realizes the ADR-06 worker boundary: rendering a screen never triggers repeated processing — screens read persisted measurements ([`project-architecture.md`](project-architecture.md) § 3 governing principle).

- **Unique constraint.** The persisted record carries a uniqueness constraint over the cache-identity tuple, so an equivalent request resolves to the existing record rather than producing a duplicate.
- **No concurrent duplicate jobs.** The worker deduplicates in-flight jobs (ADR-06): a second request for an equivalent measurement while one is running does not spawn a second provider call (protecting the quota, EVID-010).
- **Refresh semantics.**
  - **New acquisitions extend history** — a later acquisition in a new window produces a **new** record; it does not overwrite an earlier observation.
  - **Reprocessing with a new processing-config version creates new records** — changing the evalscript or masking-config version yields a new measurement under the new version, and **never overwrites** the provenance of the value produced under the old version. Historical values remain reproducible under the config that produced them (this is why the masking-config version is a stored field, § 4, § 5).

The concrete geometry-hash definition and the masking-config versioning scheme are open decisions (§ 9).

---

## 7 · Fixtures and testing `[Thesis]`

Testing is **fixture-first** (ADR-09 / DEC-09): ordinary development and CI **never** call live satellite or paid providers. Fixtures are captured/sanitized provider payloads that drive the adapter (§ 3) and quality pipeline (§ 4) deterministically.

### The fixture set

- **healthy-field** — a clean acquisition with ample valid pixels for both indices.
- **cloudy-acquisition** — polygon largely clouded; exercises `clouded` rejection.
- **cloud-shadow** — SCL cloud-shadow class present; exercises shadow masking.
- **no-valid-pixels** — an acquisition where nothing survives masking; exercises `no-valid-pixels`.
- **partial-coverage** — acquisition partially covers the polygon.
- **small-field** — a sub-0.5-ha *petani gurem*-scale polygon (EVID-013); exercises per-index count divergence and HYP-03 paths.
- **mixed-boundary** — boundary-pixel mixing with roads/adjacent fields (protocol § 9, § 10).
- **flooded-rice** — a padi polygon in flooding/transplanting phenology (EVID-016); exercises the rice-water rule (HYP-05).
- **missing-ndmi** — enough valid NDVI pixels but too few valid NDMI pixels (the 10 m / 20 m mismatch, EVID-009).
- **provider-timeout** — adapter `timeout` outcome (§ 3).
- **provider-rate-limit** — adapter `rate-limit` outcome (HTTP 429; § 3).
- **provider-error** — adapter `provider-error` outcome (§ 3).

### Rules

- **Fixtures are always labeled as test data** and are **never** presented as measured observations in production UI (DEC-10, `AGENTS.md` § Honesty constraints; the fixture/prototype/measured/unavailable vocabulary).
- **Ordinary dev/CI never calls live providers** (ADR-09) — the deterministic suite runs entirely on fixtures, with no network to satellite or paid APIs.
- **Live checks are explicitly enabled**, bounded to **known test polygons + short date ranges**, **excluded from ordinary CI**, **counted against a quota budget** (EVID-010, via the § 3 accounting hooks), and **kept separate from the deterministic tests** — they are scoped, out-of-band acquisition runs, never wired into default CI (ADR-09).

---

## 8 · Python research workspace interface

The pipeline's **persisted measurements** (§ 5) are the interface to the Python research workspace (`research/`, DEC-05; [`project-architecture.md`](project-architecture.md) § 3). The workspace consumes measurements; it does not re-open the live pipeline on every run.

- **Dataset snapshots + checksums.** Analyses run against declarative snapshots of the persisted measurements (`research/data-manifests/`), each with a checksum, so a figure or table is reproducible from a fixed, identified input set — not from a live query whose result drifts.
- **API-vs-independent raster comparison (HYP-02 / RQ2).** The workspace independently computes NDVI/NDMI from raster samples over the **same geometry, acquisition, and masking rules** and compares them to the Statistical API values persisted by the pipeline. Identical masking-config and resampling provenance (§ 5) is what makes the comparison fair; residual disagreement must be attributable to documented differences (resampling, `dataMask`/SCL, aggregation), not unexplained divergence (protocol § 12, HYP-02).
- **Availability analysis (HYP-01 / RQ1).** The feasibility study's availability measures (protocol § 4) are computed over persisted per-observation quality outcomes and polygon-level fractions (§ 4, § 5) — usable-observation fraction, gaps, wet/dry split, per-index valid-pixel counts, and PU accounting (EVID-010).
- **Notebooks call tested package functions.** Notebooks are thin: they call functions in `research/src/matani_rs/` (acquisition, index computation, QA, comparison) rather than embedding algorithms ([`project-architecture.md`](project-architecture.md) § 3). If the same index/QA algorithm must run in both production and research, that is the ADR-03 trigger for a shared runtime — decided separately, not assumed here.

**M1 implementation note (CODE, updated 2026-07-29).** `research/src/matani_rs/feasibility.py`
and `research/scripts/run_feasibility.py` implement the deterministic report calculation;
`research/tests/` verifies cadence withholding for fixture data and canonical
geometry-hash stability. The committed fixture report demonstrates reproducible report
shape only. It is not a 12-month provider observation and cannot license cadence.

`research/lib/cdse-pilot.mjs` and `research/scripts/run-cdse-pilot.mjs` additionally
implement the explicitly enabled, out-of-band pilot boundary from § 7. The runner accepts
at most two padi polygons and a 31-day window. It validates the stored CRS84 polygon,
projects the exact boundary to the local UTM zone, and submits that projected polygon
with a metre-based 20 m/10 m/20 m quality/NDVI/NDMI grid. No bbox is substituted. It
applies versioned SCL exclusions, keeps water for HYP-05, reuses one OAuth token, records
request/PU accounting, and omits geometry and direct identifiers from output. Its
provisional `NEAREST` resampling is recorded and does not settle the final scientific
resampling decision.

The two-field no-network preflight also confirms exact-polygon/no-bbox request construction
and records theoretical area-to-pixel-footprint capacity without relabeling it as provider
or valid-pixel accounting (OBS-07). The live pilot established actual, separate
NDVI/NDMI source and valid counts for both polygons. Because the CDSE deployment returned
no `geometryPixelCount`, the evalscript emits a separate coverage output to derive the
polygon-source denominator; this derived value is never mislabeled as a provider
`geometryPixelCount` (OBS-11).

`research/lib/cdse-study.mjs` and
`research/scripts/run-cdse-availability-study.mjs` add the checkpointed, explicitly
enabled 12-calendar-month acquisition path. It enforces exactly two padi inputs, a
72-request ceiling, per-request throttling, bounded 429/5xx retry, resume identity, and a
privacy-minimized artifact. The 2025-07 → 2026-07 run completed for both candidates
(OBS-12), but remains `prototype`: it does not supply representative multi-region sites,
verified crop/boundary/consent, wet/dry labels, an approved HYP-03 threshold, source
product identifiers, or independent raster comparison. It therefore cannot license a
cadence or satisfy the M1 study acceptance by itself.

---

## 9 · M1 engineering decisions closed; M2 application pending

DEC-21 / ADR-12 closes the four choices below. The detailed machine-readable contract is
`research/contracts/measurement-contract-v1.json`; the SQL beside it is a
**migration-ready draft**, deliberately not placed in `supabase/migrations/` before M2.

- **Physical schema:** typed measurement rows plus typed per-index child rows;
  `lahan_health` remains read-only legacy during M2 migration/backfill.
- **Worker runtime:** external Node worker behind the explicit ADR-06 job boundary.
- **Geometry identity:** SHA-256 over the canonical EPSG:4326 exterior ring rounded to
  seven decimal places, with canonical orientation/start; an analysis buffer is outside
  the identity.
- **Processing versions:** separate algorithm, processing, and masking identifiers;
  semantic changes produce a version bump and non-destructive reprocessing.

These are engineering decisions, not evidence that M2 is implemented or that any stored
row is `measured`.
