# Matani · Data Evaluation Plan

**Document type:** Engineering data pipeline specification
**Audience:** The developer, thesis advisor, reviewers, and AI agents working in this repo
**Status:** Active — M2 implemented and verified locally; one scoped manual hosted
measurement is verified, while repeatable Vercel-deferred completion remains open
**Updated:** 2026-09-25

**DEC-37 amendment:** Empty field details may initialize one idempotent measurement job
per visit; polling reads stored observations. This changes the request trigger only,
not index computation, quality gates, or provenance (`utils/measurement-start.ts`, CODE).
**Canonical for:** the engineering measurement contract, provider adapter, quality pipeline, persistence/provenance, cache identity, idempotency, fixtures, and Indonesia-specific masking/resolution behavior
**Companion documents:** [`research-protocol.md`](research-protocol.md), [`project-architecture.md`](project-architecture.md), [`product-requirements.md`](product-requirements.md), [`implementation-plan.md`](implementation-plan.md), [`evidence-register.md`](evidence-register.md)

---

## How to read this document

This is the **engineering realization** of the research standard. Read it this way:

- **Research validity is not decided here.** [`research-protocol.md`](research-protocol.md) owns *why and whether* — the research questions, hypotheses, unit of analysis, quality/masking *requirements*, and threats to validity. This document owns *how the code satisfies those requirements*: the measurement contract, adapter boundary, quality pipeline, persistence schema, cache identity, idempotency, and fixtures. Where the protocol states a rule, this document links to it and specifies the mechanism — it never re-derives the rule or re-argues the research.
- **Implementation qualifiers are load-bearing.** `[As-built local]` means code and local
  verification exist; it does not imply hosted migration, worker configuration, physical
  device behavior, or scientific validation. `[Thesis]` remains an unimplemented or
  research-evaluation requirement.
- **External facts are cited, never restated.** Every externally sourced figure carries an `EVID-*` / `OBS-*` ID from [`evidence-register.md`](evidence-register.md); decisions carry `DEC-*` (from [`context-dump.md`](context-dump.md)) and architecture decisions carry `ADR-*` (from [`project-architecture.md`](project-architecture.md)); hypotheses carry `HYP-*` (from [`research-protocol.md`](research-protocol.md)). This document does not re-copy quota numbers, SCL class ids, or band resolutions — it cites the ID.
- **The canonical provenance paragraph lives elsewhere.** The single source of truth for what the satellite pipeline does today is [`project-architecture.md`](project-architecture.md) § 2 (Current measurement provenance). § 1 below links to it and does not restate it.
- **Schema implementation and deployment evidence are separate.** § 5 owns the logical contract; the versioned migration owns its physical realization. OBS-22 verifies local DB behavior; OBS-28 establishes hosted schema use for one job. Current migration parity and cross-user hosted isolation still require a fresh audit (OBS-32).

---

## 1 · As-built summary `[As-built local]`

The repository contains the M2 adapter, worker, migration, privileged persistence RPCs,
mobile request/read path, fixture tests, DB tests, and bounded live smoke (OBS-22/23).
The **canonical current-product wording** remains
[`project-architecture.md`](project-architecture.md) § 2. The dated hosted observations establish scoped operation and later failures; they do not close the repeatable device-flow acceptance gate (OBS-28/30/31/32).

### Current implementation and deployment gates

| Item | Local state | Hosted state |
|------|-------------|--------------|
| Exact polygon, dynamic ≤31-day window, SCL mask, native grids | Implemented in `backend/measurement/`; fixture and live-smoke verified (OBS-22/23) | Scoped provider/worker execution recorded; repeatable deferred completion open (OBS-28/30/31) |
| Durable jobs, provenance, stats, RLS, idempotency | Migration and 26/26 pgTAP pass from empty local DB (OBS-22) | Hosted schema used by one completed job (OBS-28); current migration/RLS re-audit open (OBS-32) |
| App save/request/read/detail polling | Implemented in `explore.tsx`, `index.tsx`, `detail-lahan-page.tsx`, `utils/backend-api.ts` (CODE) | Authenticated device requests accepted, later jobs failed; successful device readback open (OBS-30/31) |
| Legacy bbox route and `lahan_health` | Retained for compatibility but removed from M2 measurement surfaces | Must not be used as measurement data |

---

## 2 · Measurement contract `[As-built local]`

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

## 3 · Provider adapter `[As-built local]`

The satellite provider sits behind an **adapter with a stable internal contract** (ADR-08), so the CDSE migration (ADR-02) and any future provider change are localized and do not alter measurement semantics. The measurement contract (§ 2) and quality pipeline (§ 4) depend on the adapter's internal contract, never on `services.sentinel-hub.com` or CDSE specifics.

### Adapter responsibilities

- **Authentication** — OAuth2 client-credentials against the CDSE identity endpoint: a registered OAuth client (`client_id` + `client_secret`) is exchanged for a bearer access token, and the token is **reused within its validity** rather than re-fetched per request (EVID-011). The `client_secret` is a server-side secret and must never ship in the Expo client (EVID-018; rotation/reissue tracked in [`project-architecture.md`](project-architecture.md) § 5.3).
- **Catalog + Process request construction** — discover the latest intersecting L2A
  acquisition, then send the exact projected polygon in two native-grid Process requests:
  NDVI at 10 m and NDMI at 20 m. Each returns raster + `userdata`; persistence requires
  strict source-identity agreement across both (ADR-15; EVID-028; OBS-23).
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

## 4 · Quality pipeline `[As-built local]`

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

Valid-pixel counts are computed **independently** for NDVI (B04/B08 on a 10 m output
grid) and NDMI (B08/B11 on a 20 m output grid) — EVID-009. A field can hold enough valid
NDVI pixels but too few valid NDMI pixels; the two counts are separate fields in the
record (§ 5) and RQ3 reports them descriptively per acquisition (DEC-29). The adapter uses
`NEAREST` where provider resampling is required and records that choice; it makes no claim
of additional spatial detail.

For the advisor-approved M1 run, the manifest records provisional reliability floors of
**9 valid NDVI pixels** and **3 valid NDMI pixels** (DEC-27). These values drive
`passed`/`too-few-valid-pixels` adjudication for this study; they remain provisional
operational parameters rather than validated universal reliability thresholds (DEC-29).

### Rice-water rule (HYP-05)

The crop/phenology-aware water handling is a **research rule owned by the protocol** (§ 8, HYP-05) and only *referenced* here: no blanket water masking inside rice (padi) polygons, because flooding/transplanting is legitimate low-NDVI phenology, not stress (EVID-016); permanent water *outside* the polygon is excluded by geometry. The engineering obligation is that the **masking configuration is versioned** — a masking-config version is stored with every measurement (§ 5) so a change in masking never silently alters historical values. The rule remains **HYP-05 until field-validated** (protocol § 8); M2 implements masking version `s2l2a-scl-rice-v1` under DEC-31, without treating that implementation choice as field validation. Link, do not duplicate: the rule text is protocol § 8.

### Rejection reasons (enumerated and persisted)

Every non-passing outcome carries one enumerated reason, persisted with the record (§ 5) and never a silent gap (protocol § 11):

- `clouded` — polygon cloud/shadow fraction above threshold.
- `too-few-valid-pixels` — per-index valid-pixel count below the reliability floor (per index; see HYP-03).
- `no-acquisition-in-window` — no Sentinel-2 acquisition intersected the polygon in the window.
- `no-valid-pixels` — an acquisition existed but no pixel survived masking.
- `geometry-unusable` — polygon degenerate, or field cannot be separated from permanent water/built structure at Sentinel-2 resolution (flagged, not dropped — protocol § 3, § 8).
- `provider-unavailable` — the adapter returned `timeout` / `rate-limit` / `provider-error` (§ 3).
- `provider-response-invalid` — the returned multipart/raster contract cannot be parsed.
- `source-identity-missing` / `source-identity-mismatch` — raster provenance is absent or
  differs between the native-grid responses.

### Honest unavailable outcome

When no quality-passing observation exists for a field/window, the pipeline records and the product shows an honest **`unavailable`** state (DEC-10; replaces the prototype's labeled fixture fallback — protocol § 8, roadmap M2). Missingness is itself an outcome of RQ1 (protocol § 11) and is preserved, not filled.

---

## 5 · Persistence and provenance `[As-built local]`

The pipeline persists a **provenance-complete measurement record** — every value carries its origin, so `measured` is distinguishable from `unavailable` and never confused with synthetic (`AGENTS.md` § Vocabulary; [`project-architecture.md`](project-architecture.md) § 3 provenance contract).

### Offline NDVI estimates (DEC-55)

`estimated` means NDVI inferred offline in Python from Sentinel-1 inputs by Random
Forest or XGBoost. It is never a Sentinel-2 measurement. The separate table stores
target date, radar acquisition/products/orbit/offset, model/feature/dataset/run identity,
evaluation role, optional test MAE, and source-row/fold/seed provenance. An estimated
row requires an in-range value and radar identity; an unavailable row requires a reason
and no estimate. Only `held_out_test` rows may carry a reference NDVI. The unique key is
field/date/model-version/evaluation-role; repeat imports replace values, preserving row
identity and creation time (`supabase/migrations/20260926000100_ndvi_estimates.sql:1`,
CODE). Access and deployment boundaries are owned by [ADR-19](project-architecture.md#adr-19--estimated-ndvi-is-a-separate-read-only-to-clients-data-state).

The CSV importer selects the requested model and feature set, joins predictions by
table and row ID, and includes only source rows with `role=showcase`. It averages seeds
without clipping, rejects out-of-range predictions and ambiguous source/fold/target
collisions, and preserves the seed list. `ml_table` rows map to `held_out_test` using
`s2_date`, reference `ndvi`, and the recorded offset. `showcase_apply` rows map to
`applied` using `s1_date`, no reference, and zero offset. Applied rows are skipped when
the same block has a present NDVI with `valid_frac >= 0.8` within an inclusive three-day
window. These are developer-selected import rules, not calibrated scientific thresholds
or independently verified held-out/model-quality claims (DEC-55;
`research/lib/ndvi-estimate-import.mjs:80`, CODE).

`import-ndvi-estimates.mjs` prints role counts, skipped count, and the first three rows
by default; `--live` calls the privileged estimate RPC. Historical remeasurement uses
unique sorted block dates and one-day UTC windows through the existing measurement
worker, preserving measurement provenance and missingness. The scripts load no env
file and make no network call in dry-run mode (`research/scripts/import-ndvi-estimates.mjs:10`,
`research/scripts/queue-historical-measurements.mjs:55`, CODE). No live execution is
authorized by this implementation task (DEC-55).

### Required fields (logical schema)

This is the canonical **logical** required-fields list. Its physical realization lives
only in `supabase/migrations/20260830000100_m2_measurement_pipeline.sql`; duplicating an
executable schema in the research contract is prohibited (§ 9).

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

The as-built `lahan_health` table stores only `id, lahan_id, user_id, ndvi_score, ndmi_score, status, captured_at, created_at, updated_at` (`supabase_setup.sql`, table `public.lahan_health`). It is **insufficient as a measurement record** because it carries **a single scalar score per index with no provenance**: no acquisition window or product identifiers, no geometry/geometry-hash, no provider/mission/collection/processing-level, no CRS/resolution/resampling method, no masking-config version, no polygon-level cloud fraction or per-index valid-pixel counts, and no enumerated rejection reason. A `status` text field cannot distinguish `measured` from `unavailable` from a synthesized value. It therefore cannot satisfy the provenance contract or back active RQ1/RQ3.

### Relation to versioned migrations (ADR-07)

The measurement record is introduced through **versioned, ordered Supabase migrations with DB tests** (ADR-07), which replace the legacy `supabase_setup.sql` (a 388-line file that is not a reliable clean-install migration — [`project-architecture.md`](project-architecture.md) § 4 ADR-07, § 7). DB tests must prove **cross-user RLS isolation** on the new table(s) (ADR-07, protocol § 14). DEC-21 / ADR-12 settled the physical model: typed measurement rows plus typed per-index child rows supersede `lahan_health`, which remains read-only legacy during migration/backfill.

---

## 6 · Cache identity and idempotency `[As-built local]`

An **equivalent measurement request must be idempotent**. Two requests are equivalent when they share the same **geometry hash + acquisition window + processing-config version** (algorithm/evalscript/masking versions) **and executor revision**. The executor revision changes only when the hosted execution mechanism is repaired in a way that must not reuse an exhausted failed job; it does not alter or relabel a stored measurement. This realizes the ADR-06 worker boundary: rendering a screen never triggers repeated processing — screens read persisted measurements ([`project-architecture.md`](project-architecture.md) § 3 governing principle; OBS-30).

- **Unique constraint.** The persisted record carries a uniqueness constraint over the cache-identity tuple, so an equivalent request resolves to the existing record rather than producing a duplicate.
- **No concurrent duplicate jobs.** The worker deduplicates in-flight jobs (ADR-06): a second request for an equivalent measurement while one is running does not spawn a second provider call (protecting the quota, EVID-010).
- **Refresh semantics.**
  - **New acquisitions extend history** — a later acquisition in a new window produces a **new** record; it does not overwrite an earlier observation.
  - **Reprocessing with a new processing-config version creates new records** — changing the evalscript or masking-config version yields a new measurement under the new version, and **never overwrites** the provenance of the value produced under the old version. Historical values remain reproducible under the config that produced them (this is why the masking-config version is a stored field, § 4, § 5).

The concrete geometry-hash and processing-version decisions are implemented in
`backend/measurement/geometry.js` and `cdse-process-adapter.js` (§ 9; OBS-22).

---

## 7 · Fixtures and testing `[Thesis]`

Testing is **fixture-first** (ADR-09 / DEC-09): ordinary development and CI **never** call live satellite or paid providers. Fixtures are captured/sanitized provider payloads that drive the adapter (§ 3) and quality pipeline (§ 4) deterministically.

### The fixture set

- **high-valid-pixel observation** — a clean acquisition with ample valid pixels for both indices.
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
- **Optional independent raster comparison (retired HYP-02 / RQ2).** DEC-26 removes API-vs-raster agreement from M1 acceptance and the active thesis evaluation. It remains an optional M3/future-work extension only. If a later thesis-team/advisor-approved scope decision reactivates it, the workspace must compute NDVI/NDMI over the **same geometry, acquisition, masking rules, masking-config version, and resampling provenance** as the persisted Statistical API values. Until then it is not part of the active measurement contract or definition of done.
- **Availability analysis (HYP-01 / RQ1).** The feasibility study's availability measures (protocol § 4) are computed over persisted per-observation quality outcomes and polygon-level fractions (§ 4, § 5) — usable-observation fraction, gaps, wet/dry split, per-index valid-pixel counts, and PU accounting (EVID-010).
- **Notebooks call tested package functions.** Notebooks are thin: they call functions in `research/src/matani_rs/` (acquisition, index computation, QA, comparison) rather than embedding algorithms ([`project-architecture.md`](project-architecture.md) § 3). If the same index/QA algorithm must run in both production and research, that is the ADR-03 trigger for a shared runtime — decided separately, not assumed here.

**M1 implementation note (CODE, updated 2026-08-28).** `research/src/matani_rs/feasibility.py`
and `research/scripts/run_feasibility.py` implement the deterministic report calculation;
`research/tests/` verifies cadence withholding for fixture data and canonical
geometry-hash stability. The committed fixture report demonstrates reproducible report
shape only. It is not a 12-month provider observation and cannot license cadence.

**Approved M1 result and review (OBS-19/20, DEC-29; updated 2026-08-30).** The live
Teluknaga study completed 12/12 field-months, 48 provider operations, and 86 acquisition
intervals; 32 pass and 54 fail the provisional 9/3 floors. The advisor-approved scoped
cadence is dry monthly and wet no defensible cadence. DEC-28/ADR-15 finalizes the M2
source-provenance path; DEC-29 approves the active RQ wording. M2 subsequently implements
the amended two-native-grid Process path locally (DEC-31; OBS-22/23).

M1 is formally closed under `M1-CLOSURE-2026-08-30` (DEC-30). The M2 schema/worker/app
path is implemented; its scoped hosted evidence and remaining gates are qualified in architecture § 2 (OBS-28/30/31).

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

`research/lib/m1-study-input.mjs`, `research/lib/m1-study-report.mjs`, and
`research/scripts/run-cdse-availability-study.mjs` now add a versioned multi-site input
contract around the checkpointed 12-calendar-month path. The contract accepts a dynamic
field count and requires padi, site/region membership, private crop/boundary/consent/
location-area verification references, and one BMKG-source-backed wet/dry label for
every site-month (EVID-024/025). Fixture input is blocked from live calls. Provisional
scope requires an explicit override; this permits acquisition but does not approve the
sample. Preflight makes no network call and records both the dynamic four-operation
per-field-month plan (one Catalog lookup plus quality/NDVI/NDMI) and the bounded
`request_attempt_ceiling` in its JSON artifact. Live execution requires an exact
acknowledgement of that ceiling,
fixing the former mismatch in which a "72-request ceiling" did not include retries.

The privacy-minimized artifact now preserves non-identifying site/region and verification
declarations, applies season labels, records intersecting Catalog product candidates
(EVID-026), and
groups acquisition/cloud/pixel/request/PU metrics per field and per site × season.
Catalog candidates improve acquisition provenance but do not prove the Statistical API's
exact mosaic selection. Numeric quality-passing, usable-observation, and gap metrics are
computed only when the advisor-approved provisional 9/3 policy is present; cadence remains
an explicit advisor determination rather than an automatic label.
Backend contract tests cover multi-site validation, missing-consent rejection, fixture
live-call rejection, dynamic preflight budgeting, and site-season gap calculation.

The historical 2025-07 → 2026-07 run completed for both old candidates (OBS-12), but
remains `prototype`: it does not use the advisor-approved Teluknaga manifest, verified
crop/boundary/consent, wet/dry labels, approved provisional floors, or exact source
product/mosaic identity. It therefore cannot license a cadence or satisfy the M1 study
acceptance by itself. The approved Teluknaga manifest and completed report supersede that
input-only state for M1 (OBS-19; DEC-27/29/30). Independent raster comparison remains
outside the active thesis under DEC-26. The CDSE General User quota was rechecked on
2026-08-28 and the completed study/live-smoke consumption was recorded (EVID-010;
OBS-19/23).

---

## 9 · M2 physical realization and deployment state

DEC-21 / ADR-12 closed the original choices; DEC-31 implements and amends them. The
machine-readable contract is `research/contracts/measurement-contract-v1.json`. The SQL
beside it is a non-executable pointer; the versioned migration is the sole physical schema.

- **Physical schema:** durable jobs, typed measurement rows, typed per-index child rows,
  privileged completion/failure RPCs, owner-select RLS, and a security-invoker read view;
  `lahan_health` remains read-only legacy.
- **Worker runtime:** authenticated Node backend worker behind the ADR-06 job boundary;
  the route durably enqueues and returns HTTP 202, then Vercel `waitUntil` retains the
  processing promise inside the same bounded function invocation (DEC-33; EVID-031/032).
  This is not a separately scheduled durable worker.
- **Geometry identity:** SHA-256 over the canonical EPSG:4326 exterior ring rounded to
  seven decimal places, with canonical orientation/start; an analysis buffer is outside
  the identity.
- **Processing versions:** separate algorithm, processing, and masking identifiers;
  semantic changes produce a version bump and non-destructive reprocessing.
- **Provider request amendment:** two same-acquisition Process responses preserve NDVI
  10 m and NDMI 20 m output grids; each raster carries same-response `userdata`, and
  strict source-identity matching is mandatory before persistence (ADR-15).

OBS-22 proves local schema/worker/client behavior, OBS-23 proves the bounded live provider
adapter, and OBS-24 proves only public backend reachability plus fail-closed authentication.
The production code and server-only credentials are deployed, and one explicitly approved
job was manually executed against real CDSE and persisted/read through the hosted
observation view as a quality-passing `measured` row (OBS-28). Formal M2 PASS still requires
a direct authenticated smoke through the deployed deferred route, physical-device readback,
and the remaining milestone evidence. The single row must not be generalized beyond that
field, acquisition, and execution.

## 10 · Offline M3 snapshot interface (DEC-45)

**CODE (2026-09-10):** `research/src/matani_rs/evaluation.py` and
`research/scripts/run_m3_evaluation.py` consume the existing M1 report shape produced by
`research/lib/m1-study-report.mjs`. This adds an analysis adapter, not a provider or
production measurement change. The adapter accepts only complete, labeled M1
fixture/prototype reports with the existing provisional 9/3 policy, study identity,
processing versions, field references, observation intervals and season calendar.

The output directory contains exact input bytes (`source.json`), a normalized
`snapshot.json`, a descriptive `report.json`, `monthly.csv`, `report.md`, and a SHA-256
`manifest.json`. Existing directories are refused to prevent accidental replacement.
Non-fixture exports are restricted to ignored `research/private/`. Fixture outputs
must remain labeled in their manifest and accompanying report. A checksum verifies
identity, not scientific truth, and source declarations are not independently verified.

Exact duplicate field-interval records are counted once; conflicting duplicates and
overlapping intervals fail for manual adjudication. Missing counts stay null; invalid
counts, windows, season mismatches and unsupported policies fail. Per-index outputs
are explicitly floor-sufficiency counts, never replacements for stored quality.
The methodology and inference limits live in research-protocol.md section 17.

M2 Process records are deliberately rejected by this adapter. No compatible M2
research export was recovered or implemented; adding one requires its own explicit
source-identity mapping. The separate replay consumes labeled synthetic M2-shaped
payloads at the existing production worker boundary, with fake provider/admin
implementations (`research/scripts/run-m3-replay.mjs`, CODE). It does not write to
Supabase or prove UI rendering, database isolation, or provider correctness.

**Legacy recovery extension (CODE; OBS-43):** `research/scripts/audit-legacy-m1.py` audits the earlier no-study-contract report separately. It reports nonzero-both-index intervals and whole-window gaps without applying provisional floors or inventing season labels. Source bytes, derived audit and source/analysis hashes stay under ignored private outputs. It does not feed the approved M1 adapter or production pipeline.


## Research-only Phase 1 snapshot interface

DEC-49 / protocol §20 specifies two common-bbox Process rasters, with both original and
buffered centre masks applied locally. This supersedes the four-request research template
for subsequent work; production APIs and persisted measurement semantics are unchanged.
`research/scripts/freeze-phase1.py` produces `phase1-frozen-manifest.json` under ignored
replacement-study artifacts, with CRS, bbox, affine transforms, dimensions, Boolean
row-major masks, input/code hashes, quality settings and offline templates (OBS-62).
Expected row order is north to south and column order west to east. Phase 2 must verify
GeoTIFF metadata before applying masks; geometry cell counts are never valid-pixel counts.
Preserve the historical M1/Statistics adapter separately. This is not an implemented
live executor or an authorization to insert research blocks as verified farmer fields.


Phase 2 implementation checkpoint (OBS-63/64): `run-phase2-pilot.mjs` is opt-in with
`--allow-live`, requires a fresh named output directory and preserves raw non-authentication
responses plus selected headers and hashes. Credentials/tokens are not persisted. Its
no-flag mode is offline and checks request caps. Live TIFFs are verified before local
geometry masks and statistics; provider identity is checked before overall pilot acceptance.
A stopped report is not a validated measurement snapshot. `audit-phase2-pilot.py` checks
the saved successful pilot offline. The current research outputs are separate from
production database records and the historical Statistical adapter.

Phase 3 research interface (DEC-51; CODE: `research/scripts/run-phase3.mjs`): the
research-only collector reuses the Phase 2 inventory and pilot, preserves raw request
attempts/responses, and counts attempts across restarts. Missing responses remain
interrupted; automatic Process retries are disabled. Its offline audit reconstructs
catalogue pagination and verifies the frozen query, response hashes, per-index source
membership, TIFF grids, local masks and quality counts. A source mismatch leaves paired
analysis unresolved while retaining any independently verified index. The daily snapshot
separates no-acquisition, paired-verified and unresolved dates; zero-valid means remain
null. Freeze emits a deterministic snapshot and a SHA256 manifest of acquisition/code
artifacts. Hashes make changes detectable; they are not an external archival guarantee.
No production provider, database contract or application behavior changes are introduced.


Phase 3 freeze checkpoint (OBS-67/68): the research snapshot and acquisition manifest
are now frozen and locally read-only. `research/scripts/audit-phase3-freeze.py` checks
file hashes, snapshot identity, calendar accounting and recovery/geometry-source linkage.
The two interrupted NDVI attempts retain verified NDMI but cannot form complete pairs.
Use the [Phase 3 report](../docs/m3-phase3-acquisition-2026-09-15.md) for artifact locations
and offline reproduction. Phase 4 consumes this snapshot without replacing unavailable
values, reclassifying failed requests as quality rejection or calling it an M2 DB export.


Phase 3 retry revision (DEC-52; OBS-69; CODE: `research/scripts/retry-phase3.mjs`):
identical requests recovered both interrupted NDVI responses. The current `frozen-02`
snapshot links the parent freeze and separate retry manifest; the original snapshot and
failed attempts remain unchanged. Both recovered NDVI results are quality-rejected,
not unknown downloads. Subsequent analysis consumes this revision. The retry audit
reparses responses, verifies source compatibility against preserved NDMI and regenerates
the revised snapshot without network calls. Original failed-attempt charges remain unknown.

Phase 4 analysis interface (OBS-70; CODE: `research/scripts/analyze-phase4.py`): a
fully resolved `frozen-02` snapshot is audited before analysis; unresolved snapshots are
rejected. Existing daily metrics supply calendar coverage, identification bounds and
gaps. Outputs retain per-date geometry/index counts, summary metrics, policy deltas,
input hash and code/output hashes. No measured values or quality settings are changed.
See the Phase 4 result ledger for the scoped zero-difference outcome.

## Radar NDVI estimation dataset (DEC-54) — 2026-09-25

The engineering contract lives in [`../docs/matani-ml-technical-spec.md`](../docs/matani-ml-technical-spec.md) §4–§5 and §11.

Code:
- `research/scripts/select-ml-blocks.mjs` selects the blocks.
- `research/lib/cdse-s1.mjs` and `research/scripts/run-s1-extraction.mjs` do the extraction.
- `research/scripts/make-ml-handoff.py` builds the reviewer package.

The Sentinel-2 target reuses the M3 Statistical API request and SCL mask unchanged, and the pilot reproduced the frozen Phase 4 dates and values. Estimates enter Matani only through ADR-19. Tests: `tests/s1-extraction.test.mjs`.
