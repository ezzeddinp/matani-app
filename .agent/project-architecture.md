# Matani · Project Architecture

**Document type:** Architecture document
**Audience:** The developer, thesis advisor, reviewers, and AI agents working in this repo
**Status:** Active
**Updated:** 2026-07-29
**Canonical for:** As-built and target architecture, **current measurement provenance (canonical wording — § 2)**, trust boundaries, provider decisions, Architecture Decision Records (ADRs), free-tier constraints, security risks, verification baseline, migration triggers
**Companion documents:** [`evidence-register.md`](evidence-register.md), [`context-dump.md`](context-dump.md), [`data-evaluation-plan.md`](data-evaluation-plan.md), [`research-protocol.md`](research-protocol.md), [`product-requirements.md`](product-requirements.md), [`implementation-plan.md`](implementation-plan.md)

---

## How to read this document

This is the canonical description of **how Matani is built today, how it is meant to be
built, and why**. Read it this way:

- **§ 2 (Current measurement provenance) is the single source of truth** for what the
  satellite pipeline actually does. Every other document links here with a short gloss
  and must never re-copy or soften the canonical paragraph. If a claim about "measured"
  vs "synthetic" NDVI appears elsewhere, it defers to § 2.
- **Repository facts are cited to `file:line`** against commit
  `d131c941bf0a260626324454825f51bbdc075f63` and were re-verified while writing this
  document. Line numbers drift as code changes; re-verify before acting on a citation.
- **External facts are cited by `EVID-*` / `OBS-*`** (see [`evidence-register.md`](evidence-register.md));
  **decisions by `DEC-*`** (see [`context-dump.md`](context-dump.md)). This document does
  not restate the underlying quota/coverage numbers — it references the ID.
- **As-built ≠ target.** § 1 and § 2 describe what exists; § 3 and the ADRs describe what
  is decided but not yet built. Where the two differ, the difference is called out, not
  hidden. **Nothing here claims the current implementation is thesis-ready** — per
  [`../AGENTS.md`](../AGENTS.md) honesty constraints, it is not.
- **Perishable claims carry a checked date** and must be rechecked before any deployment
  or capacity decision (quotas especially — EVID-010, EVID-021).

---

## 1 · System boundary (as-built)

Matani is a four-part system: an Expo mobile app, a colocated Express backend, Supabase
for identity and persistence, and external services. Satellite, weather, and Gemini
data calls pass through the backend (`backend/index.js:23-25`; DEC-20). The client still
contacts presentation-only services directly: Google Maps through the native SDK,
OpenStreetMap Nominatim for place search (`app/(tabs)/explore.tsx:755-778`), and remote
avatar/display-image hosts. Those presentation integrations do not create or label
research measurements.

### 1.1 Mobile app (Expo SDK 54 / React Native 0.81)

- Expo Router with **file-based routes** under `app/` (`app/_layout.tsx`, tab group
  `app/(tabs)/` = `index`, `explore`, `weather`, `education`, `profile`; plus
  `auth/`, `detail-lahan-page.tsx`, `detail-education-page.tsx`, `onboarding`,
  `notifications`, `splash`, `modal`). `typedRoutes` and `reactCompiler` are enabled
  (`app.config.ts:59-62`).
- React 19.1 and the Expo SDK 54 package matrix are pinned through `package.json` /
  `package-lock.json` (EVID-022). `npm start`, `npm run ios`, and `npm run android`
  explicitly select Expo Go. Unused `@expo/ui` and `expo-dev-client` are absent so the
  default thesis-team device workflow does not imply a custom development build
  (DEC-22).
- **Google Maps** renders the interactive polygon field-drawing surface (via
  `react-native-maps`). Map SDK keys are **injected at build time from environment** by
  `app.config.ts` — iOS from `GOOGLE_MAPS_API_KEY_IOS` (`app.config.ts:16`), Android from
  `GOOGLE_MAPS_API_KEY_ANDROID` (`app.config.ts:34`). These land in the compiled native
  config and are **client-visible in the shipped binary** (see § 5.3).
- The app reaches the backend over an `EXPO_PUBLIC_API_URL` / host+port candidate list;
  the NDVI call builds `/ndvi?bbox=…` against those candidates
  (`app/(tabs)/explore.tsx:862-891`).
- Home and Weather use the backend `/weather` route only. The prior duplicate
  client-to-Open-Meteo fallbacks were removed on 2026-07-27 (DEC-20); an unavailable
  backend now produces an honest weather error/unavailable state rather than bypassing
  the integration boundary (`app/(tabs)/index.tsx`, `app/(tabs)/weather.tsx`).

### 1.2 Backend (Express 5 / Node, colocated in `backend/`)

Single Express app, `backend/index.js`, listening on **port 5001** locally
(`backend/index.js:10,33`) and deployed on **Vercel**. It mounts three routers
(`backend/index.js:23-25`):

The backend dependency set is independently managed in `backend/package.json`:
Express 5.2, TypeScript 7, Node types 26, and `module` / `moduleResolution` set to
`NodeNext` (`backend/package.json:12-24`, `backend/tsconfig.json:5-6`).

| Endpoint | File | Upstream | Request flow (as-built) |
|----------|------|----------|--------------------------|
| `GET /ndvi` | `backend/api/ndvi/utils.js` | Sentinel Hub Statistical API | Parses `?bbox=w,s,e,n` (`utils.js:31-46`), defaults to a **Jakarta bbox** when absent (`utils.js:49`); fetches an OAuth token (`sentinelAuth.js`), POSTs a Statistics request with a **fixed Sept 2025 window** and the NDVI/NDMI evalscript, returns per-interval NDVI/NDMI stats or `{error:"No data available"}`. |
| `GET /weather` | `backend/api/weather/route.js` | AccuWeather → Open-Meteo fallback | Requires `?lat&lon` (`route.js:101-104`); if `ACCUWEATHER_API_KEY` is set, does geoposition→current→5-day-forecast against AccuWeather (`route.js:6,106-206`); on any missing key/failure/exception falls back to Open-Meteo (`route.js:7,90-99,108,121,133,152,162,209`). |
| `POST /ai/summary` | `backend/api/ai/route.js` | Google Gemini (Generative Language API) | Accepts `{lahanCards, totals}`, normalizes each card's data state, builds a bounded Indonesian summary prompt that forbids converting fixture/prototype inputs into measurements or diagnoses, and calls Gemini with an **env-configured model** `MATANI_GEMINI_MODEL` plus an **in-code fallback candidate list**; requires `GOOGLE_GENERATIVE_AI_API_KEY` (`route.js:96-148`). |

`backend/index.ts` now mirrors the runtime `backend/index.js` route mounts (`/ndvi`,
`/weather`, `/ai`) so the TypeScript source no longer describes an NDVI-only backend
(`backend/index.ts`, CODE; DEC-20).

**As-built processing-location note:** the weather **risk score** — `min(100, max(0, Pavg×4 + H×0.4))`, HYP-07 / DEC-16 — is computed **client-side** in `app/(tabs)/weather.tsx:474-510`, not in the backend. The aligned thesis now states that moving it to a versioned server-side component is planned hardening rather than as-built behavior (`thesis-paper-corrections.md`; PRD-17).

Token handling: `backend/sentinelAuth.js` performs OAuth2 client-credentials against the
Sentinel Hub token endpoint (`sentinelAuth.js:20`) using `SENTINEL_CLIENT_ID` /
`SENTINEL_CLIENT_SECRET` (`sentinelAuth.js:27-28`), caching the bearer token until ~60 s
before expiry (`sentinelAuth.js:4-14,50-51`) — the reuse pattern EVID-011 describes.

**As-built provider note:** both the NDVI statistics call
(`utils.js:86` → `https://services.sentinel-hub.com/api/v1/statistics`) and the token call
(`sentinelAuth.js:20` → `https://services.sentinel-hub.com/oauth/token`) target the
**commercial `services.sentinel-hub.com` host**, not CDSE. Migrating this is DEC-04 /
ADR-02, and it is a real credential+endpoint migration, not a URL swap (§ 4).

### 1.3 Supabase (Auth + Postgres + PostGIS + RLS + Storage)

Schema lives in `supabase_setup.sql`. Tables: `lahan` (PostGIS `GEOMETRY(POLYGON,4326)`
with a generated `area_ha` in hectares, `supabase_setup.sql:5-15`), `lahan_thumbnails`
(`:27-37`), `public.users` (`:131-139`), `lahan_health` (NDVI/NDMI history, `:301-311`),
`lahan_notes` (`:356-364`). RLS is enabled on every table with owner-scoped policies
(e.g. `:87-95` for `lahan`, `:318-341` for `lahan_health`). A trigger on `auth.users`
back-fills `public.users` on signup via a `SECURITY DEFINER` function (`:268-295`). A
view `lahan_with_info` exposes GeoJSON + centroid (`:111-123`, redefined `:250-262`) —
see § 5.2 for the authorization risk it carries. The app authenticates with the Supabase
anon/publishable key (`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), client-safe **conditional
on RLS** (EVID-020).

---

## 2 · Current measurement provenance

> A prototype Sentinel Hub request is connected to the field-list surface, with a visibly
> labeled synthetic fixture fallback. Results are not yet a provenance-safe, polygon-based,
> current, persisted monitoring pipeline. The detail analysis remains synthetic and is
> visibly labeled as a fixture demonstration.

This is **the canonical measurement-provenance wording**. All other documents link here;
none may soften or restate it. The verified facts behind it (commit
`d131c941` plus the 2026-07-27 presentation hardening, re-checked 2026-07-27):

- **Field-list surface seeds synthetic data first.** On load, every saved field without an
  override is seeded with `createSyntheticNdviRecord(lahan)` (`app/(tabs)/explore.tsx:1181`).
- **The one live call still falls back to a synthetic fixture, but the fallback is now labeled.** When a bounding box is available,
  the code calls `fetchNdviStatistic(bbox)` (`explore.tsx:1451`); if the API result is not
  usable it substitutes `createSyntheticNdviRecord(lahan)`
  (`explore.tsx:1454-1456`, `recordFromApi ?? createSyntheticNdviRecord(lahan)`), and on a
  thrown error it does the same (`explore.tsx:1458-1462`). A missing bbox also yields a
  synthetic record (`explore.tsx:1445-1448`). The record is tagged `fixture`
  (`explore.tsx:320-343`) and the card displays “Simulasi demo” plus “Bukan pengukuran
  satelit” (`explore.tsx:2050-2072`). This fixes silent presentation, not the fallback or
  measurement pipeline.
- **The detail screen is fully synthetic.** NDVI history on the detail page is generated
  by `buildNdviSeries(…)` from `utils/ndvi-simulator.ts`
  (`app/detail-lahan-page.tsx:166`, imported at `detail-lahan-page.tsx:30-35`). No live
  request runs on this screen at all. A fixture banner now states that the graph, dates,
  harvest estimate, risks, and recommendations are synthetic and not measurements,
  observations, diagnoses, or validated agronomic advice
  (`detail-lahan-page.tsx:710-723`).
- **The backend request is not polygon-based or current.** `backend/api/ndvi/utils.js`
  uses a **fixed 2025-09-01 → 2025-09-05 time range** in both the data filter and
  aggregation (`utils.js:65-77`), queries a **bounding box rather than the field polygon**
  (defaulting to a hard-coded **Jakarta bbox** when none is supplied, `utils.js:49`), and
  its evalscript **passes `dataMask` through** (`utils.js:12,15,22`) but performs **no
  adequate cloud / cirrus / cloud-shadow exclusion** — it reads only B04/B08/B11 and does
  not consult the Scene Classification Layer (contrast EVID-008, EVID-012).
- **Nothing is persisted as a measurement.** Fetched results become **transient UI
  overrides** (`ndviOverrides` state, `explore.tsx:1143-1150,1421,1426`), not rows written
  back to `lahan_health` with provenance.

**Data-state vocabulary** (per [`../AGENTS.md`](../AGENTS.md) § Vocabulary): today's
satellite path is **prototype** (partially wired, non-provenance-safe); its fallback and
detail history are **fixture-grade synthetic values now labeled as demonstrations**. The
labels close the silent-presentation defect only; M2 must still remove production fixture
substitution. **Nothing is `measured`** yet (no persisted, provenance-complete value exists).

---

## 3 · Target architecture

The target replaces the silent-fallback prototype with a controlled, persisted,
provenance-safe pipeline, and adds a reproducible Python research workspace where the
thesis analysis lives. It is a **provider migration and hardening** (DEC-03/DEC-04/DEC-05),
not a rewrite.

```text
Expo mobile
  ├─ Supabase Auth/PostGIS (fields, observations, persisted measurements w/ provenance)
  └─ Authenticated Matani API (weather, optional AI summary, request/refresh measurement)
           ▼
     Idempotent controlled worker
           ▼
     Copernicus Data Space Sentinel Hub
           ▼
     Quality validation and persistence
           ▼
     Mobile reads the stored result

Python research workspace — reproduces, validates, compares, analyzes, produces thesis outputs
```

**Governing principle.** Opening or rendering a mobile screen must **never** be the
primary trigger for repeated satellite processing. Screens **read persisted measurements**;
acquisition is an explicit, controlled, idempotent worker job (§ 4, ADR-06). This directly
reverses the as-built behavior in § 2, where rendering the field list is what fires the
`/ndvi` call and where results are never persisted.

**Provenance contract.** Every stored value carries its origin (acquisition window, geometry,
provider, quality flags) so that `measured` can be distinguished from `unavailable` and
never confused with synthetic. The engineering contract for this lives in
[`data-evaluation-plan.md`](data-evaluation-plan.md); this document owns only the boundary
that produces it.

**Research workspace** (`research/`, added per DEC-05):

```text
research/
  pyproject.toml           # packaged, dependency-pinned workspace
  src/matani_rs/           # tested core: acquisition, index computation, QA, comparison
  lib/cdse-pilot.mjs       # bounded external-Node exact-polygon pilot contract
  scripts/                 # fixture analysis + explicitly enabled live pilot entrypoint
  notebooks/               # analysis narratives that CALL tested package functions
  tests/                   # unit/integration tests over src/matani_rs
  data-manifests/          # declarative descriptions of inputs (sites, dates, products)
  outputs/                 # generated thesis figures/tables (reproducible artifacts)
```

Notebooks are **thin** — they call functions in `src/matani_rs/`, they do not embed the
algorithms. This keeps the analysis reproducible and lets the same tested code back both
research outputs and (if ADR-03 triggers) production processing.

The 2026-07-28 pilot implementation is deliberately narrower than the M2 worker:
`research/scripts/run-cdse-pilot.mjs` permits at most two padi fields and 31 days,
requires `--allow-live`, keeps sensitive inputs and live artifacts out of Git, sends the
exact polygon, and separates quality/10 m NDVI/20 m NDMI calls. Ordinary tests remain
network-free under ADR-09. A missing CDSE OAuth client stops the runner before network
access; the first local preflight did so, hence no live or measured result is claimed.
(OBS-06.)

---

## 4 · Architecture Decision Records

Each ADR aligns to a `DEC-*` in [`context-dump.md`](context-dump.md) and carries a
**revisit trigger** — the condition that reopens it.

### ADR-01 · Retain the existing stack; no wholesale rewrite
- **Status:** Accepted (DEC-03).
- **Context:** The hackathon stack (Expo/RN, Supabase + PostGIS + RLS, Express/Node on
  Vercel, Google Maps, Sentinel-2 L2A via Sentinel Hub Statistical API) already carries
  real field capture (`supabase_setup.sql`, `app/(tabs)/explore.tsx`). The thesis
  contribution is measurement evaluation (DEC-01), not re-platforming.
- **Decision:** Keep the stack; invest effort in measurement provenance, persistence, and
  reproducibility rather than new frameworks.
- **Consequences:** Fast path to a defensible pipeline; inherits existing debt (§ 5, § 7).
- **Revisit trigger:** A stack component blocks provenance-safe measurement in a way that
  cannot be patched incrementally.

### ADR-02 · Migrate satellite provider to CDSE Sentinel Hub free tier
- **Status:** Accepted (DEC-04).
- **Context:** As-built code targets the **commercial** `services.sentinel-hub.com`
  (`utils.js:86`, `sentinelAuth.js:20`). CDSE's free "General User" tier exposes the same
  Sentinel Hub APIs (including the Statistical API) under OAuth2 client-credentials, with a
  monthly quota (EVID-010, checked 2026-07-23) and OAuth mechanics (EVID-011); the
  Statistical API supports polygon geometry + evalscript + `dataMask` exclusion (EVID-012).
- **Decision:** Move to CDSE Sentinel Hub free tier: **new OAuth client (client_id +
  client_secret) and CDSE endpoints** (token + statistics), preserving Statistical API
  request semantics.
- **Consequences:** This is a **real migration, not a URL swap** — different identity
  endpoint, different credentials, quota accounting against CDSE limits, and STAC/data
  availability that must be validated for Indonesian sites (OBS-01 could not be reproduced
  on 2026-07-23 and must be re-verified). Removes commercial-account dependency.
- **Revisit trigger:** CDSE free-tier quota (EVID-010, **perishable — recheck at the source
  before deployment**) proves insufficient for the study, or CDSE changes its auth/endpoint
  contract.

### ADR-03 · Express stays the production API; FastAPI only on a raster/algorithm trigger
- **Status:** Accepted (DEC-06).
- **Context:** The production API today is thin request-proxying, which Express handles
  well. A second Python runtime is only justified by real need.
- **Decision:** Express remains the production API. **Introduce FastAPI only if** production
  processing performs **substantial raster work** or must **share core algorithms with the
  Python research package** (`src/matani_rs`).
- **Consequences:** Avoids a premature service split and dual-runtime ops cost; keeps one
  deployable on Vercel.
- **Revisit trigger (explicit):** production needs in-request raster processing, **or** the
  same index/QA algorithm must run in both production and research and duplicating it in JS
  is untenable. Decide via a follow-up ADR at that point.

### ADR-04 · Open-Meteo becomes the default weather provider; AccuWeather dropped from target
- **Status:** Accepted (DEC-07).
- **Context:** As-built, AccuWeather is primary with Open-Meteo as fallback
  (`backend/api/weather/route.js:6-7`). AccuWeather access is time-limited/free-tier;
  weather is **not** the thesis contribution. Open-Meteo's free tier is stable but
  **non-commercial, rate-limited, CC BY 4.0** (EVID-021).
- **Decision:** Make **Open-Meteo the default**; **drop AccuWeather** from the target
  architecture.
- **Consequences:** Removes a perishable commercial dependency and simplifies the weather
  path; obliges CC BY 4.0 attribution and the non-commercial constraint (EVID-021).
- **Revisit trigger:** A thesis/product requirement needs data Open-Meteo does not provide,
  or the free-tier terms (EVID-021, perishable) change.

### ADR-05 · Gemini is optional UX, disabled by default, never ground truth
- **Status:** Accepted and applied on 2026-07-28 (DEC-08).
- **Context:** The `/ai/summary` route generates an Indonesian advisory via an
  env-configured Gemini model (`backend/api/ai/route.js`). The M0 configuration now
  requires `AI_SUMMARY_ENABLED=true` in addition to a key; its default is false
  (`backend/config.js`, `backend/.env.example`, CODE).
- **Decision:** Gemini stays an **optional UX summary, disabled by default via a config
  flag**, and is **never** used as measurement, ground truth, or a research label.
- **Consequences:** Protects research validity (LLM output cannot enter the measurement or
  labeling path); the summary degrades to absent when disabled.
- **Revisit trigger:** A product requirement makes the summary load-bearing — even then it
  remains outside the measurement/labeling boundary.

### ADR-06 · Controlled acquisition worker/job boundary
- **Status:** Accepted; external Node worker selected in M1, implementation remains M2
  (DEC-05/DEC-21).
- **Context:** As-built, rendering the field list triggers the live NDVI call and results
  are transient (§ 2). This couples cost and quota to UI rendering and yields no persisted,
  provenance-safe measurement.
- **Decision:** Introduce an **idempotent, controlled acquisition worker/job**. Measurement
  requests are explicit; the worker deduplicates concurrent jobs, validates and persists
  results with provenance, and mobile screens **read the stored result**. DEC-21 selects
  an external Node worker rather than a render-triggered or Vercel request-lifetime job;
  the concrete contract is `research/contracts/measurement-contract-v1.json`.
- **Consequences:** Decouples satellite cost from screen rendering; enables quota
  accounting, idempotency, and honest `unavailable` states.
- **Revisit trigger:** Acquisition volume or latency requirements outgrow the chosen job
  mechanism.

### ADR-07 · Versioned Supabase migrations + DB tests replace `supabase_setup.sql`
- **Status:** Accepted; M0 baseline implemented locally on 2026-07-28 (DEC-05).
- **Context:** `supabase_setup.sql` is a 388-line file with **duplicated table/policy/view/
  trigger/function blocks** and merge-marker comments; it is **not a reliable clean-install
  migration** (§ 7 — e.g. a thumbnail trigger references a function defined later in the
  file).
- **Decision:** Replace it with **versioned, ordered migrations** and **DB tests** (via the
  Supabase CLI), including tests that prove cross-user RLS isolation (§ 5.2).
- **Consequences:** Reproducible schema; regressions caught by tests; the legacy file is
  retired from the installation path. The baseline lives under `supabase/migrations/`,
  its pgTAP coverage under `supabase/tests/`, and generated TypeScript schema types under
  `supabase/types/` (CODE).
- **Revisit trigger:** N/A (foundational) — but migration ordering is re-audited whenever
  schema changes.

### ADR-08 · Provider adapters so external APIs swap without changing measurement semantics
- **Status:** Accepted (DEC-05).
- **Context:** Provider calls are inlined into route handlers today
  (`utils.js`, `route.js`), so a provider change edits measurement code directly.
- **Decision:** Put each external provider (Sentinel Hub/CDSE, weather, Gemini) behind an
  **adapter** with a stable internal contract, so swapping a provider does not change
  measurement semantics.
- **Consequences:** ADR-02 and ADR-04 migrations become localized; fixtures can stand in
  for providers in tests (ADR-09).
- **Revisit trigger:** A provider's contract cannot be expressed through the adapter without
  leaking provider-specific semantics upward.

### ADR-09 · Fixture-first testing; no live/paid providers in ordinary dev or CI
- **Status:** Accepted (DEC-09).
- **Context:** Live/paid provider calls in dev/CI are non-deterministic, costly, and
  provenance-muddying.
- **Decision:** Ordinary development and CI run against **fixtures**; live satellite/paid
  provider calls are reserved for **explicit, out-of-band acquisition runs** only.
- **Consequences:** Deterministic, cost-free tests; keeps synthetic/fixture data from ever
  being narrated as measured; requires maintained fixtures per adapter.
- **Revisit trigger:** A behavior can only be validated against a live provider — handled as
  a scoped, out-of-band run, never wired into default CI.

### ADR-10 · Provider data requests stay behind the backend boundary
- **Status:** Accepted and applied for weather on 2026-07-27 (DEC-20).
- **Context:** The home and weather screens duplicated a direct Open-Meteo fallback even
  though the backend `/weather` route already owns the AccuWeather→Open-Meteo provider
  order. That bypass contradicted the documented integration boundary and duplicated
  provider semantics in the client.
- **Decision:** Satellite, weather, and Gemini data requests use the Matani backend.
  When the backend is unavailable, the client renders an unavailable/error state rather
  than contacting a data provider directly. Client-side mapping, place-search, avatar,
  and display-media integrations remain presentation-only and outside the measurement
  boundary.
- **Consequences:** One weather contract and one provider-attribution location; backend
  outages are visible rather than masked by a second client implementation. The M0
  protected-route boundary was applied on 2026-07-28 (§ 5.1).
- **Revisit trigger:** An explicit offline/field-resilience design is approved with a
  documented privacy, attribution, caching, and research-boundary contract.

### ADR-11 · Protect every provider route before quota admission
- **Status:** Accepted and applied locally on 2026-07-28.
- **Context:** The earlier Express entrypoint exposed provider-backed routes without
  authentication, origin restriction, request bounds, rate limiting, duplicate-request
  control, or sanitized failures.
- **Decision:** Keep `/` public as a health endpoint. Require a Supabase access token for
  `/ndvi`, `/weather`, and `/ai/**`; apply an origin allowlist, per-user/per-endpoint rate
  limits, route-specific request bounds, in-flight equivalent-request rejection, and
  quota admission before the provider handler. Client errors use stable codes and do not
  contain provider payloads or stack traces (`backend/app.js`, `backend/security.js`,
  `backend/config.js`, CODE).
- **Consequences:** An unauthenticated caller cannot spend provider quota. The M0
  limiter/deduplicator is intentionally single-instance; M2 replaces it with durable
  worker/cache identity from ADR-06 and DEC-21.
- **Revisit trigger:** Horizontal backend scaling, distributed quota enforcement, or the
  M2 measurement-worker deployment.

### ADR-12 · Freeze the M1 measurement-record contract before M2
- **Status:** Accepted as a reviewed implementation contract on 2026-07-28 (DEC-21);
  physical migration and worker remain M2.
- **Context:** M2 could not be implemented reproducibly while physical schema, worker
  runtime, geometry hashing, and processing-version semantics were open.
- **Decision:** Use the contract and migration-ready draft in `research/contracts/`.
  `lahan_health` remains read-only legacy; M2 creates typed measurement and per-index
  records, uses the selected external Node worker, hashes canonical EPSG:4326 geometry,
  and performs non-destructive versioned reprocessing.
- **Consequences:** M2 has a settled input contract without falsely claiming that the
  draft schema is already installed or that any measurement exists.
- **Revisit trigger:** Advisor review rejects the physical model, or feasibility evidence
  requires a material processing/masking change before the M2 migration.

### ADR-13 · Pin Expo SDK 54 and make Expo Go the default device workflow
- **Status:** Accepted and applied locally on 2026-07-28 (DEC-22).
- **Context:** The thesis team's installed device clients could not open the prior SDK 57
  project. SDK packages must move as one compatibility matrix, not as a single `expo`
  version edit.
- **Decision:** Pin the SDK 54 matrix (Expo 54, React Native 0.81, React 19.1), use the
  SDK-compatible Router/navigation imports, remove unused `@expo/ui` and
  `expo-dev-client`, and run local mobile scripts with `--go` (EVID-022).
- **Consequences:** iOS and Android Metro exports use the same checked SDK 54 graph.
  Physical iOS access still depends on whether the installed Expo Go supports SDK 54;
  the App Store only distributes the latest physical-iOS Expo Go (EVID-023), so a
  development build remains the fallback when that version no longer matches.
- **Revisit trigger:** The thesis team standardizes on a newer Expo Go, an OS requirement
  exceeds SDK 54 support, or a required native module needs a development build.

---

## 5 · Trust boundaries and security risks

### 5.1 Backend: protected provider boundary
The public root endpoint is a health check. `/ndvi`, `/weather`, and `/ai/**` pass through
Supabase access-token verification, per-user/per-endpoint rate limiting, route-specific
request bounds, an equivalent-request in-flight guard, and quota-admission accounting
before a provider router can run (`backend/app.js`, `backend/security.js`, CODE). Browser
origins use the `CORS_ALLOWED_ORIGINS` allowlist; missing production auth configuration
fails closed. Provider errors sent to clients are normalized, while structured request
logs contain request ID, route, status, duration, and authenticated user ID but no bearer
token or provider payload. Mobile provider calls attach the active Supabase access token
through `utils/backend-api.ts` (CODE).

The M0 guard validates the current bbox prototype's coordinate/area limits. Exact-polygon
vertex and acquisition-window validation belongs to the explicit M2 measurement request,
because that request does not exist yet; M0 does not pretend the bbox route is that
pipeline. The in-memory limiter/accounting/deduplication foundation is single-instance;
the external worker and durable cache identity selected by DEC-21 replace it for M2.

### 5.2 Supabase view `lahan_with_info`
The M0 versioned baseline migration creates `lahan_with_info` with
`security_invoker = true`, enables RLS on every exposed operational table, and supplies
cross-user SQL tests for the base tables and view
(`supabase/migrations/20260728000100_m0_baseline.sql`,
`supabase/tests/0001_m0_rls.sql`, CODE). The legacy `supabase_setup.sql` remains only as
historical input and is not the installation path.

On 2026-07-29, the developer linked the hosted project and supplied read-only
`migration list`, `db push --dry-run`, and `db diff --linked --schema public` output.
The remote migration history does not contain `20260728000100`, while the hosted project
already contains the legacy operational tables and differs materially from the baseline
shadow schema, including the `lahan_with_info` definition and RLS-policy set (OBS-09).
Therefore the baseline must **not** be pushed directly or merely marked applied. A
reviewed legacy-to-M0 reconciliation must first account for existing data, constraints,
grants, functions, view security, and policy replacement; then hosted cross-user RLS
tests must pass. Until that work is complete, local M0 schema evidence is not a hosted
security claim.

### 5.3 Secrets posture
As of **2026-07-23**, `.env` and `backend/.env` are **untracked** (git-ignored) and only
the `*.env.example` templates are committed, listing **only variables the code actually
consumes** (`.env.example`, `backend/.env.example`). `app.config.ts` injects the Google
Maps keys into the native build (`app.config.ts:16,34`); these are **client-visible by
design** — the control is **key restriction, not secrecy** (EVID-019, and the Expo rule
that build-inlined values are readable in the bundle, EVID-018). The Supabase anon key is
**client-safe conditional on RLS being correct on every exposed table** (EVID-020) — which
makes § 5.2 load-bearing.

> Rotation invalidates exposed server-side credentials; historical commits and existing
> clones still contain the old values and must continue to be treated as sensitive.

**Rotation ledger:**

| Credential | Class | Action | Owner / status |
|------------|-------|--------|-----------------|
| Sentinel Hub `client_secret` (`SENTINEL_CLIENT_SECRET`) | Server-side secret | **Rotate** (and reissue as a CDSE OAuth client under ADR-02) | Developer action — pending |
| Gemini key (`GOOGLE_GENERATIVE_AI_API_KEY`) | Server-side secret | **Rotate** | Developer action — pending |
| AccuWeather key (`ACCUWEATHER_API_KEY`) | Server-side secret | **Rotate** (provider dropped in target, ADR-04) | Developer action — pending |
| Google Maps keys (iOS/Android) | Client-visible by design | **Restrict per-platform** (Android package + SHA-1 / iOS bundle ID) **and per-API**, then **monitor** usage (EVID-019) | Developer action — pending |
| Supabase key | Publishable vs `service_role` | **Verify class**; if anon/publishable, safe only with RLS correct (EVID-020, § 5.2) | Verification — pending |

---

## 6 · Free-tier and reproducibility constraints

Everything below is scoped to free / non-commercial tiers; perishable entries carry a
checked date and must be rechecked before any decision that depends on them.

| Concern | Constraint | Provenance |
|---------|-----------|------------|
| Satellite (CDSE Sentinel Hub) | Bounded live access on the free "General User" tier; monthly + per-minute quota. **Perishable — recheck before deployment.** | EVID-010 (checked 2026-07-28); auth EVID-011; capability EVID-012 |
| Weather (default) | Open-Meteo free tier: **non-commercial, rate-limited, CC BY 4.0 attribution**, no uptime guarantee. **Perishable.** | EVID-021 (checked 2026-07-23) |
| Supabase | **Local Supabase via CLI + Docker** for normal development; **hosted Supabase Free only** for shared device testing, demos, and pilots. | DEC-03/DEC-05 |
| Backend hosting | **Vercel Hobby**, within its personal / non-commercial usage limits. | DEC-03 |
| Mobile builds | **Expo local builds** for iteration; **EAS Free only** for tester distribution. | DEC-03 |
| AI summary | **Gemini Free, optional only**, disabled by default; never ground truth/labels. | ADR-05 / DEC-08 |
| CI | **GitHub Actions with no live paid-provider calls** — fixtures only. | ADR-09 / DEC-09 |

---

## 7 · Verification baseline

Recorded **2026-07-23**, commit `d131c941bf0a260626324454825f51bbdc075f63`. Raw logs are
disposable and live only in the session scratchpad (not tracked). **This documentation pass
fixed none of these** — the table remains a historical baseline, not current status.

| Check | Command | Exit | Counts / result | Representative categories |
|-------|---------|------|-----------------|----------------------------|
| Lint | `npm run lint` (expo lint) | **1** | 8 errors, 11 warnings | `react/no-unescaped-entities` in `app/(tabs)/explore.tsx` (1946, 2211) and `app/(tabs)/index.tsx` (1456, 1494); `@typescript-eslint/no-unused-vars` in `explore.tsx`, `index.tsx`, `profile.tsx`, `detail-lahan-page.tsx` |
| Type-check (root) | `npx tsc --noEmit` | **2** | 1 error | **TS5098** at `tsconfig.json(3,3)`: `customConditions` (inherited from `expo/tsconfig.base`) requires `moduleResolution` = `node16`/`nodenext`/`bundler`, but the local config sets `"node"` (`tsconfig.json:15`) |
| Type-check (backend) | `npx tsc --noEmit` (after `npm ci` — `node_modules` was absent) | **0** | clean | — |
| Tests / CI | — | — | **none** | no test scripts (`package.json` scripts: `start`, `reset-project`, `android`, `ios`, `web`, `lint`), no test files, no `.github/workflows/` |
| Schema install | inspect `supabase_setup.sql` | — | **not a reliable clean-install migration** | 388 lines; **duplicated** table/policy/view/trigger/function blocks with `-- ...existing code...` merge markers; trigger `update_lahan_thumbnails_updated_at` (`:76-78`) references `update_updated_at_column()` which is **defined later** (`:98-104`), so a clean single-run install fails at that trigger; `lahan` table (`:5`, `:168`), `lahan_with_info` view (`:111`, `:250`), and the timestamp function (`:98`, `:234`) are each defined twice |

**Superseded upgrade observation (2026-07-23).** The earlier SDK 57 / React Native 0.86
upgrade passed its then-current checks but was superseded by ADR-13 / DEC-22 because it
did not match the thesis team's requested Expo Go baseline. It is historical context,
not the current installation instruction.

**Dependency modernization verification (2026-07-23).** Unused frontend-only Turf,
Express, node-fetch, and AI SDK packages were removed from the root package. All
independently managed backend packages are current; `npm run build` passes, the Express 5
root endpoint responds locally, and the backend production dependency audit reports zero
vulnerabilities. The root production audit retains 11 moderate advisories solely through
Expo's transitive `xcode` → `uuid` tooling chain; npm's proposed forced resolution would
downgrade the SDK-pinned `expo-splash-screen`, so it was not applied.

**Current local verification (2026-07-29).** `npm run lint`, `npm run typecheck`,
`npm test`, and `npm run test:backend` exit 0. The runs contain 0 lint
errors/warnings, 3 fixture-only M0 artifact tests, 7 backend security tests covering
auth rejection, bounds, CORS, rate limiting, Gemini-off-by-default, and concurrent
equivalent-request rejection, plus 5 exact-polygon CDSE pilot tests (12 backend tests
total; OBS-02/06). The versioned Supabase baseline,
reset/reapply result, pgTAP result, generated DB types, and Expo placeholder-config check
are recorded in `docs/m0-m1-build-report-2026-07-28.md`; this local evidence does not
stand in for hosted deployment or CI-run evidence.

**SDK 54 compatibility verification (2026-07-28).** `npx expo install --check` reports
dependencies up to date, `npx expo-doctor@latest` passes 18/18, public config resolves as
SDK 54, strict lint and type-check pass, and Metro exports complete for both iOS and
Android (OBS-04). These are local config/bundle observations, not proof that every
physical iPhone has a matching Expo Go version (EVID-023).

The SDK 54 production-dependency audit has 33 transitive findings and no critical
finding (OBS-05). npm's broad suggested remediation upgrades the project back to the
SDK 57 family, so it is not applied under DEC-22. Individual advisory remediation must
preserve the Expo-validated matrix; `npm audit fix --force` is prohibited for this state.

---

## 8 · Repository structure (as-built)

```text
matani-app/
├─ app/                     # Expo Router file-based routes
│  ├─ _layout.tsx           # root layout
│  ├─ (tabs)/               # index, explore (ladang), weather, education, profile
│  ├─ auth/                 # sign-in / sign-up screens
│  ├─ detail-lahan-page.tsx # field detail — synthetic NDVI history (§ 2)
│  ├─ detail-education-page.tsx, onboarding.tsx, notifications.tsx, splash.tsx, modal.tsx
├─ backend/                 # colocated Express API (Vercel), port 5001 local
│  ├─ index.js              # process entrypoint
│  ├─ app.js                # Express factory, protected route mounting, errors/logs
│  ├─ config.js             # environment configuration and safe defaults
│  ├─ security.js           # JWT, validation, rate/quota/idempotency guards
│  ├─ sentinelAuth.js       # Sentinel Hub OAuth token (cached)
│  └─ api/{ndvi,weather,ai} # provider proxy handlers
├─ components/              # shared UI components
├─ hooks/                   # React hooks
├─ constants/               # ndvi.ts (severity thresholds — HYP, DEC-11), education.ts, theme.ts
├─ utils/                   # authenticated backend client; labeled fixture simulator
├─ assets/                  # images / fonts
├─ supabase/                # versioned migrations, seed, pgTAP tests, generated types
├─ research/                # tested M1 feasibility package, fixtures, contracts, outputs
├─ .github/workflows/       # fixture-only verification CI
├─ supabase_setup.sql       # legacy historical input; not the installation path
├─ app.config.ts            # typed Expo config; injects Maps keys from env
├─ eas.json, eslint.config.js, tsconfig.json, package.json
└─ .agent/                  # this documentation suite
```

---

## 9 · Migration triggers

Conditions that justify a future architectural change (each decided via a follow-up ADR
when it fires):

- **FastAPI (ADR-03 trigger):** production processing needs substantial in-request raster
  work, **or** core index/QA algorithms must be shared with `src/matani_rs`. Until then,
  Express stays.
- **CDSE quota (ADR-02 trigger):** the free-tier quota (EVID-010, **perishable — recheck at
  source**) proves insufficient, forcing a paid tier or a different acquisition strategy.
- **Sentinel-1 (SAR) addition:** a cloud-penetrating complement to optical Sentinel-2
  (EVID-017) requires a **separate thesis-scope decision** — it is a set-aside post-thesis
  contingency, not current scope (DEC — see [`context-dump.md`](context-dump.md) § 6). SAR
  measures backscatter, not the NDVI/NDMI reflectance this project uses, so it is a
  fallback pathway, not a drop-in substitute.
- **Hosted vs local Supabase:** local (CLI + Docker) is the default for development; moving a
  workload to hosted Supabase Free (shared testing/demo/pilot) is a scoped decision bounded
  by that tier's limits.
- **EAS usage:** local builds are the default; EAS Free is used only for tester
  distribution, and any change to that boundary is a scoped decision.
- **Git-history rewrite:** deferred (DEC-13). Only undertaken if the developer **separately
  authorizes** it; until then, historically committed secrets are handled by rotation
  (§ 5.3), not history surgery.
