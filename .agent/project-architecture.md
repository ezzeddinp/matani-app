# Matani · Project Architecture

**Document type:** Architecture document
**Audience:** The developer, thesis advisor, reviewers, and AI agents working in this repo
**Status:** Active
**Updated:** 2026-09-25
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
- **Repository facts are cited to `file:line`** against the repository history and were
  re-checked at base commit `ab5c77127666f2a914bc608d01549bb70a8ae457` during the
  2026-08-21 audit. The audit edits themselves are an uncommitted worktree delta until
  the developer commits them. Line numbers drift; re-verify before acting on a citation.
- **External facts are cited by `EVID-*` / `OBS-*`** (see [`evidence-register.md`](evidence-register.md));
  **decisions by `DEC-*`** (see [`context-dump.md`](context-dump.md)). This document does
  not restate the underlying quota/coverage numbers — it references the ID.
- **Local as-built ≠ hosted/validated.** § 1 and § 2 describe repository behavior and
  state its deployment qualification; § 3 and the ADRs describe boundaries and decisions.
  **Nothing here claims the current implementation is thesis-ready** — per
  [`../AGENTS.md`](../AGENTS.md) honesty constraints, it is not.
- **Perishable claims carry a checked date** and must be rechecked before any deployment
  or capacity decision (quotas especially — EVID-010, EVID-021).

---

## 1 · System boundary (as-built)

Matani is a four-part system: an Expo mobile app, a colocated Express backend, Supabase
for identity and persistence, and external services. Satellite, weather, and Gemini
data calls pass through the backend (`backend/index.js:23-25`; DEC-20). The client still
contacts presentation-only services directly: Google Maps through its native SDK or the
Maps JavaScript API inside the iOS Expo Go WebView,
OpenStreetMap Nominatim for place search (`app/(tabs)/explore.tsx:755-778`), and remote
avatar/display-image hosts. Those presentation integrations do not create or label
research measurements.

### 1.1 Mobile app (Expo SDK 57 / React Native 0.86; CODE)

- Expo Router with **file-based routes** under `app/` (`app/_layout.tsx`, tab group
  `app/(tabs)/` = `index`, `explore`, `weather`, `education`, `profile`; plus
  `auth/`, `detail-lahan-page.tsx`, `detail-education-page.tsx`, `onboarding`,
  `notifications`, `splash`, `modal`). `typedRoutes` and `reactCompiler` are enabled
  (`app.config.ts:59-62`).
- React 19.2 and the Expo SDK 57 package matrix are pinned through `package.json` /
  `package-lock.json` after upstream commit `da0463e` (CODE; ADR-13 amendment).
  `expo-dev-client` is installed as the optional app-specific native path. The default
  start scripts target Expo Go again; `start:dev-client` selects the custom client when
  it is installed (CODE; DEC-44; EVID-034/038).
- Ladang never selects Apple MapKit. `react-native-maps` renders the native field surface
  with `PROVIDER_GOOGLE` on Android and app-specific iOS builds. In iOS Expo Go, where the
  installed Google placeholder otherwise renders no tiles, `react-native-webview` hosts
  the Google Maps JavaScript API and bridges drawing, saved polygons, markers, layer
  changes, region events, and camera commands (`app/(tabs)/explore.tsx`,
  `components/google-maps-webview.tsx`, CODE; DEC-42/44). Separate Android/iOS keys feed
  the native config plugin; a dedicated Web key feeds only the browser route. All are
  client-visible and require matching application + API restrictions (EVID-019/040).
  Loading remains non-blocking, the satellite/standard switch remains available, and
  detail navigation can fit the map to one owner-visible polygon. Local source, audit,
  and bundle checks pass; physical-iPhone tile and interaction verification remains open
  (OBS-40).
- When configured, `EXPO_PUBLIC_API_URL` is the authoritative backend origin. Manifest/LAN
  candidates are constructed only when no public URL is configured, so a production
  response cannot be hidden by a later local-network timeout (DEC-33; OBS-27).
  Saving/retrying a field explicitly posts its field UUID to `/measurements/request`;
  current measurement surfaces do not issue the legacy `/ndvi?bbox` request
  (`utils/backend-api.ts`, `app/(tabs)/explore.tsx`, CODE).
- `expo-document-picker` and `expo-file-system` read a user-selected GeoJSON file from
  the device cache. `utils/geojson-import.ts` accepts one simple WGS84 Polygon, rejects
  ambiguous or invalid geometry before persistence, and hands normalized longitude/
  latitude vertices to the existing field-save boundary. The same utility serializes
  pending or saved geometry as a one-feature WGS84 `FeatureCollection`; `expo-sharing`
  exports its `.geojson` cache file and `expo-clipboard` provides the text fallback
  (CODE; DEC-38/39; ADR-17).
- Expo Go development without a public URL adds the current Metro manifest host as a LAN
  backend candidate.
  Backend responses must be JSON; Vercel SSO/HTML responses are classified as
  unavailable rather than passed to `JSON.parse` (`hooks/config.ts`,
  `utils/backend-api.ts`, CODE; OBS-16).
- Home and Weather use the backend `/weather` route only. The prior duplicate
  client-to-Open-Meteo fallbacks were removed on 2026-07-27 (DEC-20); an unavailable
  backend now produces an honest weather error/unavailable state rather than bypassing
  the integration boundary (`app/(tabs)/index.tsx`, `app/(tabs)/weather.tsx`).

### 1.2 Backend (Express 5 / Node, colocated in `backend/`)

Single Express app, `backend/index.js`, listening on **port 5001** locally. It mounts four
protected provider/measurement routers through `backend/app.js`. Each connected Vercel
backend project uses `backend/` as its Root Directory, so Vercel installs that package and
detects the direct `express` import plus default app export in `backend/app.js`; no repository-root
server shim is used (`backend/vercel.json`, CODE; DEC-36). The stable Vercel
production alias is publicly reachable and its protected route fails closed without
a token (OBS-24/34); this reachability check does not prove hosted measurement persistence.

The backend dependency set is independently managed in `backend/package.json`:
Express 5.2, TypeScript 7, Node types 26, and `module` / `moduleResolution` set to
`NodeNext` (`backend/package.json:12-24`, `backend/tsconfig.json:5-6`).

| Endpoint | File | Upstream | Request flow (as-built) |
|----------|------|----------|--------------------------|
| `GET /ndvi` | `backend/api/ndvi/utils.js` | Sentinel Hub Statistical API | Parses `?bbox=w,s,e,n` (`utils.js:31-46`), defaults to a **Jakarta bbox** when absent (`utils.js:49`); fetches an OAuth token (`sentinelAuth.js`), POSTs a Statistics request with a **fixed Sept 2025 window** and the NDVI/NDMI evalscript, returns per-interval NDVI/NDMI stats or `{error:"No data available"}`. |
| `GET /weather` | `backend/api/weather/route.js` | Open-Meteo | Requires `?lat&lon`; requests current and daily weather including WMO weather codes, maps the response into the stable mobile contract, and returns a sanitized `weather_provider_unavailable` error on failure. Coordinates and raw provider payloads are not logged. |
| `POST /ai/summary` | `backend/api/ai/route.js` | Google Gemini (Generative Language API) | Accepts `{lahanCards, totals}`, normalizes each card's data state, builds a bounded Indonesian summary prompt that forbids converting fixture/prototype inputs into measurements or diagnoses, and calls Gemini with an **env-configured model** `MATANI_GEMINI_MODEL` plus an **in-code fallback candidate list**; requires `GOOGLE_GENERATIVE_AI_API_KEY` (`route.js:96-148`). |
| `POST /measurements/request` | `backend/api/measurements/route.js` | CDSE Catalog + Process APIs; Supabase Data API | Authenticates the user, validates field UUID/≤31-day window, loads only that owner's polygon, durably enqueues/reuses a job, returns HTTP 202, and defers the adapter/quality/persistence task with Vercel `waitUntil` inside the same bounded invocation (DEC-33; EVID-031/032). |

`backend/app.js` is the runtime route/security composition root. Measurement processing
lives under `backend/measurement/`; `geotiff` decodes provider rasters and `proj4`
constructs the local UTM grid (CODE; DEC-31).

**As-built processing-location note:** the weather **risk score** — `min(100, max(0, Pavg×4 + H×0.4))`, HYP-07 / DEC-16 — is computed **client-side** in `app/(tabs)/weather.tsx:474-510`, not in the backend. The aligned thesis now states that moving it to a versioned server-side component is planned hardening rather than as-built behavior (`thesis-paper-corrections.md`; PRD-17).

Token handling: `backend/sentinelAuth.js` performs OAuth2 client-credentials against the
Sentinel Hub token endpoint (`sentinelAuth.js:20`) using `SENTINEL_CLIENT_ID` /
`SENTINEL_CLIENT_SECRET` (`sentinelAuth.js:27-28`), caching the bearer token until ~60 s
before expiry (`sentinelAuth.js:4-14,50-51`) — the reuse pattern EVID-011 describes.

**As-built provider note (updated 2026-07-29):** the server defaults and
`backend/.env.example` now use the CDSE identity and Statistical API hosts, with both
URLs remaining environment-configurable (`backend/sentinelAuth.js`,
`backend/api/ndvi/utils.js`; ADR-02). A developer-controlled CDSE OAuth client was
verified in the out-of-band M1 pilot (OBS-11). This provider migration does **not**
upgrade the application request to a measurement: the production route still has the
bbox, fixed-window, masking, persistence, and provenance defects recorded in § 2.

### 1.3 Supabase (Auth + Postgres + PostGIS + RLS + Storage)

The installation path is the versioned `supabase/migrations/` sequence; the duplicated
`supabase_setup.sql` is retained only as historical input (ADR-07). Operational tables
are `lahan`, `lahan_thumbnails`, `public.users`, `lahan_health`, and `lahan_notes`.
The linked hosted legacy schema was reconciled through
`20260729000100_m0_hosted_reconciliation.sql`; owner-scoped RLS and the
`security_invoker` view are tested locally and hosted (OBS-10; § 5.2). The app
authenticates with the Supabase anon/publishable key
(`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), client-safe **conditional on RLS**
(EVID-020).

On mobile, Supabase Auth persists the session through AsyncStorage and starts/stops token
auto-refresh with app foreground state. Email confirmation returns through
`mataniapp://auth/callback`; the callback accepts either a PKCE code or access/refresh
token pair and never logs or renders those credentials (`hooks/supabase.ts`,
`app/auth/callback.tsx`, CODE; DEC-36).

The auth-to-profile trigger remains the owner of initial `public.users` creation. Migration
`20260907000100_auth_signup_profile_collision.sql` makes optional unique username/phone
collisions non-fatal to the Auth transaction: the account and required profile row are
created, while any already-owned optional value remains unset for later correction
(CODE; DEC-35). Other integrity failures still abort rather than being swallowed.

---

## 2 · Current measurement provenance

> The repository now contains a locally verified M2 measurement path: saving a padi
> polygon explicitly requests an authenticated backend job; the worker discovers one
> acquisition, runs exact-polygon NDVI 10 m and NDMI 20 m Process API requests, requires
> matching source provenance, applies versioned SCL quality rules, and persists a typed
> result plus per-index pixel statistics. Mobile surfaces read only the persisted
> `measurement_observations` view and show acquisition date, quality, valid-pixel counts,
> or honest unavailability. The stable public backend alias is reachable and protected
> routes fail closed. One explicitly approved real-provider job has been processed and
> persisted as a provenance-complete hosted `measured` row. That manual worker execution
> does not establish repeatability: later authenticated device requests were durably
> accepted and invoked by Vercel, but their provider work failed before persistence.
> A 2026-09-08 production trace confirms Catalog returned HTML rather than JSON after
> token acquisition. The current remediation normalizes provider URLs, rejects
> redirects, and uses a fresh executor cache revision. Empty field details now request
> an idempotent job automatically once per visit and poll persisted results. Hosted
> completion still requires an explicitly approved real-field test; automatic approval
> review blocked the private-polygon probe (OBS-37; DEC-37).

This is **the canonical measurement-provenance wording**. All other documents link here;
none may soften or restate it. The verified facts behind it (OBS-22/23, 2026-08-30):

- **No repeated render-triggered processing or synthetic substitution remains.** Field
  save/retry and bounded empty-detail initialization call `POST /measurements/request`;
  screens query persisted rows (DEC-37)
  and retain honest queued, failed, rejected, and unavailable states
  (`app/(tabs)/explore.tsx`, `utils/backend-api.ts`, `app/detail-lahan-page.tsx`, CODE).
- **The measurement boundary is implemented locally.** The Node adapter validates and
  hashes the stored polygon, projects it to local UTM, discovers a bounded acquisition,
  executes separate native-grid Process requests with raster + `userdata`, rejects
  mismatched source identities, and returns versioned provenance and per-index stats
  (`backend/measurement/`, CODE; ADR-15 amendment).
- **Persistence is typed and owner-isolated.** The versioned migration creates durable
  jobs, measurements, per-index stats, privileged RPCs, RLS, and a security-invoker read
  view; clean reset and 26/26 pgTAP tests pass locally
  (`supabase/migrations/20260830000100_m2_measurement_pipeline.sql`,
  `supabase/tests/0002_m2_measurements.sql`, CODE; OBS-22).
- **The legacy route/table are not measurement sources.** `backend/api/ndvi/utils.js` and
  `lahan_health` remain historical compatibility code only; current M2 mobile surfaces do
  not read their values as measurements.
- **Hosted measurement availability is proven for one scoped job only.** Production
  Supabase/CDSE configuration and deployment are present, and one explicitly approved job
  completed against CDSE and appears in the hosted observation view with a passing dated
  NDVI/NDMI row (OBS-28). Later authenticated HTTP 202 requests invoked deferred work but
  ended in a sanitized processing failure with no observation (OBS-30). The adapter now
  uses one Node HTTP transport for token, Catalog, and Process requests, emits bounded
  stage diagnostics, and includes the executor revision in job cache identity. Deployment
  `dpl_9TCjqtkoVoFyTYRXPRgimjN7axif` is live at the stable alias, but no post-deployment
  measurement request was observed during its first bounded monitoring interval. Later
  device retries created three fresh field jobs, all of which failed before persistence
  with an unclassified bounded code (OBS-31). Deployment
  `dpl_7URDNjYLkXyCFhng6Km5KfByLJyA` now separates and checkpoints provider stages from
  database completion, but no request arrived during its bounded post-deployment watch;
  hosted success, authenticated physical-device readback, repeatability, and formal M2
  PASS remain open. A 2026-09-01 production trace then confirmed failure after
  `token_acquired` and before `catalog_received`. Executor revision
  `cdse-node-fetch-v2` locally treats transport failures and malformed successful
  Catalog/Process responses as retryable within the existing bounded attempt ceiling;
  backend fixture tests pass 42/42. Deployment
  `dpl_GsDPR8f2c8TwkDHxHXRAKR9etTC4` is live on the stable production alias and its
  health endpoint passes; post-deployment measurement verification remains open.

**Data-state vocabulary** (per [`../AGENTS.md`](../AGENTS.md) § Vocabulary): only rows
created by the M2 completion RPC with complete provenance can be **measured**; test rows
remain **fixture**, M1/live-adapter artifacts remain **prototype**, and failed/absent
retrieval is **unavailable**. Local implementation does not retroactively promote legacy
or M1 rows and does not prove hosted rows exist.

DEC-55 adds **estimated** as a separate offline-model state, with its own store and
privileged import boundary (ADR-19). Its contract lives in
[data evaluation plan § 5](data-evaluation-plan.md#offline-ndvi-estimates-dec-55);
it does not change the measured provenance classification above.

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
  lib/cdse-pilot.mjs       # bounded external-Node exact-polygon/provider contract
  lib/m1-study-*.mjs       # private manifest validation + site-season report builder
  contracts/               # measurement contract + labeled M1 manifest fixture
  scripts/                 # fixture analysis + explicitly enabled live pilot entrypoint
  notebooks/               # analysis narratives that CALL tested package functions
  tests/                   # unit/integration tests over src/matani_rs
  data-manifests/          # declarative descriptions of inputs (sites, dates, products)
  outputs/                 # generated thesis figures/tables (reproducible artifacts)
```

Notebooks are **thin** — they call functions in `src/matani_rs/`, they do not embed the
algorithms. This keeps the analysis reproducible and lets the same tested code back both
research outputs and (if ADR-03 triggers) production processing.

The M1 pilot implementation is deliberately narrower than the M2 worker:
`research/scripts/run-cdse-pilot.mjs` permits at most two padi fields and 31 days,
requires `--allow-live`, keeps sensitive inputs and live artifacts out of Git, sends the
validated exact polygon projected from stored WGS84 to a local UTM metre grid, and
separates quality/10 m NDVI/20 m NDMI calls. Ordinary tests remain network-free under
ADR-09. On 2026-07-29 the bounded pilot and a checkpointed 12-month two-polygon
acquisition completed against CDSE (OBS-11/12). Those artifacts remain `prototype`, not
`measured`: they do not pass M1 representativeness or M2 persistence/provenance gates.

The 2026-08-28 M1 study path adds research-only multi-site orchestration around that
pilot contract: a private remote-assisted manifest, no-network preflight, dynamic
request/retry ceiling, field and site × season reporting, and one CDSE Catalog lookup per
field-month for intersecting Sentinel-2 L2A candidate IDs (EVID-026). The Catalog lookup
uses the same OAuth trust boundary and remains explicitly enabled/out-of-band under
ADR-09. Candidate IDs improve provenance but do not prove the Statistical API's exact
mosaic selection; production persistence remains M2 work. Independent raster comparison
is optional M3/future work and not an M1 or active-thesis gate (DEC-26). This does not
alter the canonical current-product provenance wording in § 2.

The advisor-approved Teluknaga manifest subsequently completed all 12 field-months and
48 planned provider operations (OBS-19). The Catalog adapter now requests the provider's
current GeoJSON media type (EVID-027; `research/lib/cdse-pilot.mjs`, CODE). A separate
exact-polygon Process API probe on the one interval with two Catalog candidates returned
one selected provider scene ID and exact `.SAFE` data path (OBS-20). Under DEC-28 /
ADR-15, that tested capability becomes the M2 source-provenance path; it does not turn
the separate M1 Statistical API results into production measurements.

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
- **Status:** Accepted and provider-endpoint/OAuth migration applied on 2026-07-29
  (DEC-04); production measurement semantics remain M2.
- **Context:** The historical code targeted the commercial `services.sentinel-hub.com`.
  CDSE's free "General User" tier exposes the same
  Sentinel Hub APIs (including the Statistical API) under OAuth2 client-credentials, with a
  monthly quota (EVID-010, checked 2026-07-29) and OAuth mechanics (EVID-011); the
  Statistical API supports polygon geometry + evalscript + `dataMask` exclusion (EVID-012).
- **Decision:** Move to CDSE Sentinel Hub free tier: **new OAuth client (client_id +
  client_secret) and CDSE endpoints** (token + statistics), preserving Statistical API
  request semantics.
- **Consequences:** This is a **real migration, not a URL swap** — different identity
  endpoint, different credentials, quota accounting against CDSE limits, and STAC/data
  availability that must be validated for Indonesian sites. The bounded two-polygon
  provider run used approximately 8.027 PU and 72 requests (OBS-12), well inside the
  freshly checked General User limits, but does not establish representative-study or
  production capacity. Removes the runtime dependency on the commercial endpoint.
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

### ADR-04 · Open-Meteo is the weather provider; AccuWeather removed
- **Status:** Accepted (DEC-07) and implemented on 2026-08-21.
- **Context:** AccuWeather was formerly primary with Open-Meteo as fallback. AccuWeather
  access was time-limited/free-tier; weather is **not** the thesis contribution.
  Open-Meteo's free tier is stable but
  **non-commercial, rate-limited, CC BY 4.0** (EVID-021).
- **Decision:** Use **Open-Meteo only** and remove AccuWeather configuration and request
  branches. Return WMO weather codes so the client icon mapping matches the provider.
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
- **Amendment (2026-09-08; DEC-37):** Empty field details automatically request one
  idempotent job per visit, unless a completed result or active processing lease exists.
  This supersedes the earlier prohibition on screen-open initialization, while retaining
  persisted reads, backend deduplication, and no provider calls from React rendering.
  Catalog/Process URLs are trimmed, blank values use canonical defaults, and non-HTTPS
  or credential-bearing URLs are rejected. Executor `cdse-node-fetch-v5` rejects
  redirects and separates repaired jobs from exhausted earlier executions. Production
  URL configuration was normalized; hosted completion remains unverified (OBS-37).
- **Status:** Accepted; Node worker, durable job schema, and explicit request path are
  implemented and locally verified. One manual hosted completion is observed; Vercel
  deferred invocation is observed but successful deferred completion remains pending
  (DEC-05/DEC-21/DEC-31/DEC-33; OBS-28/30).
- **Context:** As-built, rendering the field list triggers the live NDVI call and results
  are transient (§ 2). This couples cost and quota to UI rendering and yields no persisted,
  provenance-safe measurement.
- **Decision:** Introduce an **idempotent, controlled acquisition worker/job**. Measurement
  requests are explicit; the worker deduplicates concurrent jobs, validates and persists
  results with provenance, and mobile screens **read the stored result**. DEC-21 selects
  a Node worker outside the Expo client rather than a render-triggered job; the concrete
  contract is `research/contracts/measurement-contract-v1.json`. DEC-33 amends the HTTP
  lifecycle: the route durably enqueues, returns HTTP 202, and registers the processing
  promise with Vercel `waitUntil`. The task still shares the bounded function invocation;
  a separately scheduled worker is not claimed (EVID-031/032; OBS-27).
- **Amendment (2026-08-31):** The executor/transport revision is part of the cache identity.
  Catalog and Process requests use the same `node-fetch` transport already used by CDSE
  OAuth, and runtime logs expose only bounded stage codes. This permits a repaired
  execution path to create a new durable job instead of reusing a failed max-attempt job,
  without changing measurement semantics (OBS-30; CODE).
- **Amendment (2026-09-01):** A production stage trace isolated the remaining failure
  between token acquisition and Catalog completion. Executor revision
  `cdse-node-fetch-v2` marks network/timeout failures and malformed successful
  Catalog/Process bodies as retryable, still bounded by the configured provider-attempt
  ceiling. The executor bump prevents reuse of exhausted `v1` jobs. This amendment is
  fixture-verified and deployed as `dpl_GsDPR8f2c8TwkDHxHXRAKR9etTC4`; it does not yet
  claim hosted measurement success because no post-deployment request has completed.
- **Research execution amendment (2026-09-15; DEC-51):** The Phase 3 research-only
  collector reuses the installed `node-fetch` transport after two failed global-fetch
  attempts. Its archived requests, source/grid audit and recovery history stay separate
  from production jobs. Production provider behavior and cache identity are unchanged.
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
- **Amendment (2026-09-07):** The versioned auth-profile trigger treats username and
  phone number as optional profile attributes. A uniqueness collision leaves the
  conflicting attribute unset and does not roll back the new Auth account; only those
  named uniqueness constraints are recovered, and other integrity failures still abort
  (`20260907000100_auth_signup_profile_collision.sql`, CODE; DEC-35).
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
- **Status:** Accepted and applied for weather on 2026-07-27; provider simplification
  applied on 2026-08-21 (DEC-20, ADR-04).
- **Context:** The home and weather screens duplicated direct provider access even though
  the backend `/weather` route owns the Open-Meteo contract. That bypass contradicted the
  documented integration boundary and duplicated provider semantics in the client.
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
- **Amendment (2026-09-07; OBS-32):** The local environment audit now checks both
  variable names and privileged Supabase key classes across client variables, rejects
  server-only credentials even without an Expo public prefix, and never prints values.
  Five fixture regressions exercise this boundary (`scripts/audit-env-boundaries.mjs`,
  `tests/env-boundaries.test.mjs`, CODE). This does not prove platform revocation or
  runtime secret availability.
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
- **Status:** Accepted as a reviewed contract in M1 and implemented locally by the M2
  migration/worker on 2026-08-30 (DEC-21/DEC-31). Hosted use was demonstrated for one
  scoped job (OBS-28); repeatable device completion remains open (OBS-30/31).
- **Context:** M2 could not be implemented reproducibly while physical schema, worker
  runtime, geometry hashing, and processing-version semantics were open.
- **Decision:** Use the contract and migration-ready draft in `research/contracts/`.
  `lahan_health` remains read-only legacy; M2 creates typed measurement and per-index
  records, uses the selected external Node worker, hashes canonical EPSG:4326 geometry,
  projects the exact boundary to a recorded local UTM CRS for metre-based grids, records
  source/valid counts independently per index, keeps nullable provider
  `geometryPixelCount` distinct from derived coverage, and performs non-destructive
  versioned reprocessing.
- **Consequences:** M2 has a settled input contract without falsely claiming that the
  draft schema is already installed or that any measurement exists.
- **Revisit trigger:** Advisor review rejects the physical model, or feasibility evidence
  requires a material processing/masking change before the M2 migration.

### ADR-13 · Pin Expo SDK 54 and make Expo Go the default device workflow
- **As-built amendment (2026-09-08):** Upstream commit `da0463e`, merged in `b4ba39f`,
  restores SDK 57 / React Native 0.86 / React 19.2 and compatible Router imports. This
  differs from the original SDK 54 decision and is retained as the incoming repository
  state, not an independently approved platform decision. Three obsolete
  `StyleSheet.absoluteFillObject` references were replaced with `absoluteFill`, and a
  duplicate Router import was consolidated. The installed lockfile passes type-check
  and an offline 1,807-module iOS export; device compatibility remains unverified
  (`package.json`, `app/_layout.tsx`, `app/detail-lahan-page.tsx`, `app/onboarding.tsx`,
  `app/splash.tsx`, CODE; scoped local build observation, 2026-09-08).
- **Status:** Historical for the SDK matrix. The Expo-Go-default workflow was first
  superseded by DEC-43 on 2026-09-09 and restored for the current SDK 57 implementation
  by DEC-44 on 2026-09-10.
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
- **Revisit outcome (2026-09-09, DEC-43):** The Google-only iOS map requires app-specific
  native configuration, so the native-module trigger fired. `expo-dev-client` and a
  development build are now the default map-capable workflow (EVID-033/034).
- **Revisit outcome (2026-09-10, DEC-44):** The developer confirmed Expo Go as the active
  physical-iPhone workflow. The default scripts target Expo Go, where a bundled WebView
  supplies a separate Google Maps JavaScript API route; `expo-dev-client` remains the
  optional native qualification path (EVID-038/039; OBS-40).

### ADR-14 · Padi-only, observation-first time-series product surface
- **Status:** Accepted and implemented on 2026-08-21 (DEC-24); advisor acceptance of the
  revised thesis title remains an external gate.
- **Context:** Multi-crop product scope and rule-derived health/severity labels conflicted
  with the rice-only evidence base and could imply diagnosis from unvalidated index
  thresholds. Synthetic histories also obscured the distinction between demonstration
  data and observations.
- **Decision:** New and active fields are padi-only. Existing non-padi category text is
  preserved in `lahan.legacy_category` while active `category` becomes null. Product
  surfaces display dated raw NDVI/NDMI observations and explicit data state; they do not
  classify, diagnose, predict yield, or synthesize missing values. Optional AI output is
  restricted to descriptive summaries of supplied values, dates, coverage, and state.
- **Consequences:** HYP-04 and HYP-06 are retired from the active thesis/product scope.
  The legacy `lahan_health` name and schema remain historical storage only and do not
  license health semantics. M2 still must implement exact-polygon, quality-gated,
  provenance-complete persistence.
- **Revisit trigger:** Advisor-approved research evidence and a new explicit decision
  justify a separately validated interpretive layer after the time-series thesis scope.

### ADR-15 · Same-response raster + metadata per native grid for M2 provenance
- **Status:** Accepted on 2026-08-29 and amended/implemented locally on 2026-08-30 after
  the provider request-level grid constraint was verified (DEC-28/DEC-31; EVID-028).
- **Context:** Catalog candidates cannot prove which product pixels a separate Statistical
  API request selected (EVID-026). The live probe demonstrated that CDSE Process API scene
  metadata identifies the selected provider scene/data path even when Catalog returned
  two candidates (OBS-20), and the provider supports raster plus `userdata` in one response
  (EVID-028).
- **Decision:** A field × acquisition uses two Process API requests so NDVI remains on a
  10 m output grid and NDMI on a 20 m output grid. Each request returns its raster and
  `userdata` together. Persistence is allowed only when scene IDs, data paths, `.SAFE`
  product IDs, acquisition interval, and provider service version match across both
  responses; missing or mismatched identity is unavailable. Catalog is discovery only.
- **Consequences:** Each raster remains tied to same-response source metadata while native
  output grids are preserved. Strict cross-response identity matching prevents combining
  different acquisitions. This is one production measurement operation, not the optional
  independent raster comparison retired by DEC-26. The bounded live smoke passed with one
  matching product and quality-passing 23/23 NDVI and 6/6 NDMI pixels (OBS-23).
- **Revisit trigger:** CDSE removes/changes required scene metadata, the same-response path
  cannot preserve per-index native grids and masking semantics, or measured workload
  triggers ADR-03.

### ADR-16 · Vercel backend project root for the colocated Express API
- **Status:** Accepted and deployment-verified on 2026-09-08 (DEC-36).
- **Context:** Multiple Vercel projects were connected to the same repository with
  inconsistent Root Directory settings. Repository-root builds could see the Expo package
  but not a conventional Express entrypoint: commit `38ac274` failed with `No entrypoint
  found`, and the root re-export in `26aa62c` then failed static detection because it did
  not itself import `express`.
- **Decision:** Keep backend ownership in `backend/`; configure every connected backend
  project with `backend/` as its Root Directory, let Vercel detect `backend/app.js` directly,
  retain the no-emit backend type-check, and remove the repository-root server shim.
- **Consequences:** Cloud installs use `backend/package.json` and its lockfile, the detected
  entrypoint directly imports Express and exports the app, and the Expo dependency tree is
  outside the backend build. Production reachability and fail-closed auth evidence remain
  recorded under OBS-34.
- **Revisit trigger:** The API moves out of `backend/`, or one Vercel project intentionally
  becomes a web deployment for the Expo application.

### ADR-17 · Bidirectional GeoJSON boundary and platform-native map fallback
- **Status:** Accepted for the GeoJSON round trip; map-provider and timed-overlay clauses
  superseded by ADR-18 / DEC-40 on 2026-09-09.
- **Context:** Raster comparison requires Copernicus Browser and Matani to use the exact
  same field boundary. Import alone still forced users to recreate Matani-drawn geometry
  elsewhere. The field map was also reported as an unexplained green surface while iOS
  forced the Google provider and local map-key variables contained placeholders.
- **Decision:** Serialize each pending or saved Matani polygon as one RFC 7946-style WGS84
  Polygon Feature in a `FeatureCollection`, without a deprecated `crs` member. Preview the
  exact longitude-latitude sequence before copy/share and enable post-save export by
  default. Use the platform map provider on iOS and Google Maps on Android; ignore placeholder
  keys at config resolution, and expose timeout, retry, and base-map switching in the field UI.
- **Consequences:** The geometry can round-trip through Matani's own parser without vertex
  changes; users can transfer the same boundary to Copernicus Browser. iOS no longer requires
  Google Maps configuration for this surface. Standalone Android still requires a restricted
  Maps SDK key at build time. Tile/provider availability remains external, but failure is visible
  and recoverable instead of appearing as a permanent blank map.
- **Revisit trigger:** The product adopts a common cross-platform tile provider, supports
  multi-feature/multipolygon imports, or needs direct browser workspace integration.

### ADR-18 · Google Maps on both native platforms; no timer overlay
- **Status:** Accepted and amended for iOS Expo Go on 2026-09-10. Local lint, TypeScript,
  34/34 tests, environment audit, and iOS JavaScript bundle export pass; live tiles and
  interaction on the physical iPhone remain pending (DEC-40/42/44; OBS-40).
- **Context:** The ten-second `onMapLoaded` timer could surface a blocking failure card
  when map readiness was merely delayed or the callback was inconsistent. The developer
  also requires the same Google Maps provider on Android and iOS and a direct field-detail
  path back to the corresponding polygon.
- **Decision:** Use `PROVIDER_GOOGLE` for both native platforms. Inject separate Android
  and iOS Maps SDK keys through the `react-native-maps` Expo config plugin, retaining
  per-platform app/API restrictions (EVID-019/033). Replace the timer overlay with the native map loading
  indicator. A detail-to-map route carries the owner-visible field ID and one request token;
  Ladang resolves that ID from its already owner-scoped field list, fits the camera to the
  polygon, and visually emphasizes its boundary. Keep the standard/satellite layer switch.
- **Amendment (2026-09-09, DEC-41):** Do not select `PROVIDER_GOOGLE` unconditionally on
  iOS. `app.config.ts` exposes a non-secret `iosGoogleMapsConfigured` boolean. Ladang selects
  Google on iOS only when that build flag is true; an unconfigured client leaves the provider
  undefined and uses its available MapKit implementation. Android remains Google. This
  prevents a missing native Google implementation/key from exposing only the map container.
- **Amendment (2026-09-09, DEC-42):** The developer rejected provider fallback. Restore
  unconditional `PROVIDER_GOOGLE` on Android and iOS and remove runtime MapKit selection.
  A valid platform key and native Google library are deployment prerequisites; absence of
  either does not authorize switching map providers.
- **Amendment (2026-09-09, DEC-43):** Install `expo-dev-client`, make the default Metro
  scripts target that client, and bind development/production EAS profiles to their named
  environments. A local gitignored `.env` is insufficient for a remote EAS build
  (EVID-034/036/037); its Maps values must be synchronized through an explicitly approved
  EAS environment workflow before building. Both values are now synchronized to
  `development`; the current build reached Apple signing and awaits the developer's direct
  Apple Developer authentication (OBS-38).
- **Amendment (2026-09-10, DEC-44):** Restore Expo Go as the default Metro workflow while
  retaining Google Maps exclusively. On iOS Expo Go, use `react-native-webview` 13.16.1
  to load the Maps JavaScript API from a stable HTTPS base origin with a dedicated Web
  key, then bridge map state and field interactions to React Native. Android and
  app-specific iOS builds keep native `PROVIDER_GOOGLE`; no path selects MapKit
  (EVID-038/039/040). Keep the development client as `start:dev-client` for native
  qualification.
- **Consequences:** Native iOS Google Maps still requires a custom build and
  `GOOGLE_MAPS_API_KEY_IOS` (EVID-033), but iOS Expo Go now has a Google-only browser
  implementation instead of the empty native placeholder. The Web route requires the
  Maps JavaScript API, a dedicated authorized-origin key, and network access. Actual
  configuration failures replace the map with bounded guidance; the removed timer card
  does not return. The focus route cannot reveal a field absent from the signed-in user's
  field list.
- **Revisit trigger:** Google Maps is replaced, a reliable native tile-error callback is
  adopted, or the app gains an explicit offline-map mode.

---

### ADR-19 · Estimated NDVI is a separate, read-only-to-clients data state
- **Status:** Accepted 2026-09-25 (DEC-55). The migration and pgTAP test exist locally; applying them to hosted Supabase needs explicit developer approval.
- **Context:** DEC-54 adds radar-based NDVI estimates. They are computed offline in Python (the reviewer trains RF/XGBoost) and must be shown in Matani without weakening measurement provenance.
- **Decision:**
  - **Storage:** table `public.ndvi_estimates` (`supabase/migrations/20260926000100_ndvi_estimates.sql`) with model, radar-source and evaluation provenance. It is never joined into `measurement_observations`. Owner-scoped RLS, select-only for `authenticated`.
  - **Writes:** only the service-role security-definer RPC `import_ndvi_estimates`, fed by `research/scripts/import-ndvi-estimates.mjs` (dry-run by default).
  - **Reads:** no new Express route; the app reads through RLS, exactly like observations.
  - **Display:** measured values within ±3 days win (`utils/estimate-timeline.ts`).
  - **2021 observations:** historical measured observations for the showcase field come from the existing worker (`research/scripts/queue-historical-measurements.mjs`).
- **Trigger for a later ADR:** live or scheduled inference, meaning a worker job that fetches Sentinel-1 and runs the model. That requires a model-serving decision (ONNX in Node versus a Python service) and is out of scope for the thesis deadline.

- **Import implementation amendment (2026-09-25; DEC-55):** The migration derives
  estimate ownership from `lahan` (`supabase/migrations/20260926000100_ndvi_estimates.sql:55`,
  CODE). Local pgTAP and hosted deployment remain unverified for this migration.
- **Execution:** Research scripts are dry-run by default and read environment values
  only when explicitly invoked with `--live`; callers load environment files.
  The historical script uses the existing admin/provider/worker constructors and
  sequential enqueue/process calls. Its supplied `historical:` key still passes through
  the worker's existing geometry/version cache identity; previously successful jobs
  are reused (`research/scripts/queue-historical-measurements.mjs:24`,
  `backend/measurement/worker.js:42`, CODE).
- **Consequences:** The admin exposes its existing request method without changing
  authentication or timeout behavior (`backend/measurement/supabase-admin.js:43`, CODE).
  Estimates cannot close measurement gaps in research availability results; this change
  makes no model-accuracy, thesis-readiness, or live-execution claim (DEC-55).

## 5 · Trust boundaries and security risks

### 5.1 Backend: protected provider boundary
The public root endpoint is a health check. `/ndvi`, `/weather`, `/ai/**`, and
`/measurements/**` pass through
Supabase access-token verification, per-user/per-endpoint rate limiting, route-specific
request bounds, an equivalent-request in-flight guard, and quota-admission accounting
before a provider router can run (`backend/app.js`, `backend/security.js`, CODE). Browser
origins use the `CORS_ALLOWED_ORIGINS` allowlist; missing production auth configuration
fails closed. Provider errors sent to clients are normalized, while structured request
logs contain request ID, route, status, duration, and authenticated user ID but no bearer
token or provider payload. Mobile provider calls attach the active Supabase access token
through `utils/backend-api.ts` (CODE).

The URL checked on 2026-08-26 redirected to Vercel SSO (OBS-16). After the Vercel root
directory was set to `backend` and the Express app export was corrected, the stable
production alias returned JSON with HTTP 200 at `/`, while `/weather` without a bearer
token returned HTTP 401 on 2026-08-31 (OBS-24). This verifies current reachability and
fail-closed authentication only. The client may use the current Metro LAN candidate
during Expo Go development; production measurement availability still requires the
hosted database, worker configuration, and authenticated device gates above.

The legacy `/ndvi` guard still validates bbox limits for compatibility. The M2 request
validates field UUID and a maximum 31-day window before quota admission; the worker then
loads only the authenticated owner's field and validates the exact polygon. Durable jobs
and database uniqueness provide M2 retry/idempotency state, while the HTTP rate limiter
remains single-instance (`backend/security.js`, `backend/measurement/`, CODE; OBS-22).

### 5.2 Supabase view `lahan_with_info`
The M0 versioned baseline migration creates `lahan_with_info` with
`security_invoker = true`, enables RLS on every exposed operational table, and supplies
cross-user SQL tests for the base tables and view
(`supabase/migrations/20260728000100_m0_baseline.sql`,
`supabase/tests/0001_m0_rls.sql`, CODE). The legacy `supabase_setup.sql` remains only as
historical input and is not the installation path.

On 2026-07-29, the linked hosted project was first inspected read-only (OBS-09), then
audited for data compatibility. Seven developer-authorized invalid test polygons had no
dependent records and were removed by the guarded incremental migration
`20260729000100_m0_hosted_reconciliation.sql`. The migration reconciled constraints,
functions, triggers, indexes, grants, policies, and the `security_invoker` view without
recreating the legacy tables. Post-apply hosted audits found 48 remaining field rows and
zero tested NULL/orphan/owner/invalid-geometry defects; RLS was enabled on all five
operational tables, the view option was present, hosted pgTAP passed 10/10, and migration
history synchronized (OBS-10).

The hosted PostGIS extension is non-relocatable in `public`, whereas a clean local install
places it in `extensions`. The reconciliation deliberately preserves the hosted extension
location and makes functions/tests schema-compatible; moving a non-relocatable production
extension is not an M0 requirement. This is a controlled compatibility decision, not
schema parity by destructive recreation.

### 5.3 Secrets posture
As of **2026-07-23**, `.env` and `backend/.env` are **untracked** (git-ignored) and only
the `*.env.example` templates are committed, listing **only variables the code actually
consumes** (`.env.example`, `backend/.env.example`). `app.config.ts` injects the Google
Maps keys into the native build and exposes the dedicated Web key to the Expo Go bundle
(`app.config.ts`, CODE); these are **client-visible by design** — the control is **key
restriction, not secrecy** (EVID-019/040, and the Expo rule
that build-inlined values are readable in the bundle, EVID-018). The Supabase anon key is
**client-safe conditional on RLS being correct on every exposed table** (EVID-020) — which
makes § 5.2 load-bearing.

> Rotation invalidates exposed server-side credentials; historical commits and existing
> clones still contain the old values and must continue to be treated as sensitive.

**Rotation ledger:**

| Credential | Class | Action | Owner / status |
|------------|-------|--------|-----------------|
| Sentinel Hub `client_secret` (`SENTINEL_CLIENT_SECRET`) | Server-side secret | **Rotate** (and reissue as a CDSE OAuth client under ADR-02) | New CDSE OAuth client configured and verified 2026-07-29 (OBS-11); revocation of any historical commercial credential still requires platform-side confirmation |
| Gemini key (`GOOGLE_GENERATIVE_AI_API_KEY`) | Server-side secret | **Rotate** | Local backend key present on 2026-09-07 (OBS-32); historical revocation/rotation still requires platform-side confirmation |
| Historical AccuWeather key (`ACCUWEATHER_API_KEY`) | No longer consumed after ADR-04 implementation | **Revoke** if it ever existed or was exposed | Variable removed from the runtime and env example; platform-side revocation remains unverified |
| Google Maps keys (Android/iOS/Web) | Client-visible by design | **Restrict per application** (Android package + SHA-1 / iOS bundle ID / authorized HTTPS referrer) **and per API**, then **monitor** usage (EVID-019/040) | Local variables detected without values; Google Cloud restriction and usage verification pending |
| Supabase client key | Publishable/anon | Safe in Expo only with RLS correct (EVID-020, § 5.2) | Local class verified publishable; hosted RLS re-audit required after M2 migration |
| Supabase backend admin key | Current `sb_secret_*` preferred; legacy `service_role` fallback | Configure only in backend hosting; never in Expo/client env (EVID-029) | Client-env placement found and corrected to backend-only on 2026-09-07 (OBS-32); earlier hosted configuration demonstrated by OBS-28, without proving current device repeatability |

---

## 6 · Free-tier and reproducibility constraints

Everything below is scoped to free / non-commercial tiers; perishable entries carry a
checked date and must be rechecked before any decision that depends on them.

| Concern | Constraint | Provenance |
|---------|-----------|------------|
| Satellite (CDSE Sentinel Hub) | Bounded live access on the free "General User" tier; monthly + per-minute quota. **Perishable — recheck before deployment.** | EVID-010 (checked 2026-08-28); auth EVID-011; capability EVID-012/026 |
| Weather (default) | Open-Meteo free tier: **non-commercial, rate-limited, CC BY 4.0 attribution**, no uptime guarantee. **Perishable.** | EVID-021 (checked 2026-07-23) |
| Supabase | **Local Supabase via CLI + Docker** for normal development; **hosted Supabase Free only** for shared device testing, demos, and pilots. | DEC-03/DEC-05 |
| Backend hosting | **Vercel Hobby**, within its personal / non-commercial usage limits. | DEC-03 |
| Mobile builds | **Expo local builds** for iteration; **EAS Free only** for tester distribution. | DEC-03 |
| AI summary | **Gemini Free, optional only**, disabled by default; never ground truth/labels. | ADR-05 / DEC-08 |
| CI | **GitHub Actions with no live paid-provider calls** — fixtures only. | ADR-09 / DEC-09 |

---

## 7 · Verification baseline

**Expo Go Google Maps route verification (2026-09-10; OBS-40).** The iOS Expo Go path now
uses the bundled WebView and Google Maps JavaScript API instead of the native Google
placeholder. The bridge, three-key configuration boundary, default Expo Go scripts,
lint, TypeScript, 34/34 tests, and iOS bundle export pass locally. This is not a claim
that Google accepted the configured Web key or served tiles: physical-iPhone rendering,
gestures, drawing, and detail-focus behavior remain the final runtime gate.

**Current iPhone map qualification (2026-09-10; OBS-39).** The failing session is confirmed
to use Expo Go, and the linked project has no iOS build records. The installed library's
native placeholder explains the blank container when Google SDK pods are missing.
Configuration and JavaScript checks do not close this issue: signing, installing a
Google-enabled Matani binary, and observing actual tiles and camera/drawing interaction
on the physical iPhone are still required. See OBS-38 for the signing blocker.

**iOS Google Maps development-build verification (2026-09-09; OBS-38).** The code and
build profiles now select an app-specific development client, both platform values are
configured as sensitive EAS `development` variables, and lint, TypeScript, the environment
audit, and 34/34 root tests pass. EAS CLI 23.2.0 loaded both values and reached Apple
signing. Direct Apple Developer authentication, native build completion, installation,
and physical-device tile rendering remain unverified.

**Current verification (2026-09-07; OBS-32).** Local fixture verification passes with the
supported Python override. Root tests now include five environment-boundary regressions;
provider credentials in client env and privileged values under misleading names fail
without printing secrets. The local backend publishable key now matches the same-project
client value. Current remote CI and DB/platform controls remain unverified; historical
checks below must not be reported as current runs. See the [dated audit](../docs/thesis-app-notion-alignment-audit-2026-09-07.md).


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

**Historical verification (2026-08-31).** The 2026-08-30 empty-DB migration application,
generated types, 26/26 pgTAP, and bounded provider smoke remain the latest local database
and live-adapter evidence (OBS-22/23). On 2026-08-31, lint, root/backend type-checks, 9/9
root tests, and 36/36 backend tests passed again; the public backend health endpoint
returned JSON HTTP 200 and a protected route without a token returned HTTP 401 (OBS-24).
Ordinary tests/CI remain network-free (ADR-09). Hosted migration, remote CI for this
delta, server-only worker configuration, and physical-device persistence remain unverified.

**SDK 54 compatibility verification (2026-07-28).** `npx expo install --check` reports
dependencies up to date, `npx expo-doctor@latest` passes 18/18, public config resolves as
SDK 54, strict lint and type-check pass, and Metro exports complete for both iOS and
Android (OBS-04). These are local config/bundle observations, not proof that every
physical iPhone has a matching Expo Go version (EVID-023).

The current SDK 54 dependency audit has 22 transitive development/toolchain findings
(12 moderate, 10 high) and no critical finding after the non-breaking audit fix
(OBS-15). npm's broad forced remediation upgrades the project to the SDK 57 family, so
it is not applied under DEC-22. Individual advisory remediation must preserve the
Expo-validated matrix; `npm audit fix --force` is prohibited for this state.

---

## 8 · Repository structure (as-built)

```text
matani-app/
├─ app/                     # Expo Router file-based routes
│  ├─ _layout.tsx           # root layout
│  ├─ (tabs)/               # index, explore (ladang), weather, education, profile
│  ├─ auth/                 # sign-in / sign-up screens
│  ├─ detail-lahan-page.tsx # dated stored NDVI/NDMI time series (§ 2)
│  ├─ detail-education-page.tsx, onboarding.tsx, notifications.tsx, splash.tsx, modal.tsx
├─ backend/                 # colocated Express API (Vercel), port 5001 local
│  ├─ index.js              # process entrypoint
│  ├─ app.js                # Express factory, protected route mounting, errors/logs
│  ├─ config.js             # environment configuration and safe defaults
│  ├─ security.js           # JWT, validation, rate/quota/idempotency guards
│  ├─ sentinelAuth.js       # Sentinel Hub OAuth token (cached)
│  ├─ api/{ndvi,weather,ai,measurements} # protected route handlers
│  └─ measurement/          # exact-polygon adapter, raster stats, admin persistence, worker
├─ components/              # shared UI components
├─ hooks/                   # React hooks
├─ constants/               # NDVI formatting, padi education, theme
├─ utils/                   # authenticated backend client and geometry helpers
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
- **Sentinel-1 (SAR) addition:** DEC-54/55 authorize the radar-estimate direction
  and separate import boundary in ADR-19. Live or scheduled inference requires the
  further architecture decision described there; persistence does not establish model accuracy.
- **Hosted vs local Supabase:** local (CLI + Docker) is the default for development; moving a
  workload to hosted Supabase Free (shared testing/demo/pilot) is a scoped decision bounded
  by that tier's limits.
- **EAS usage:** local builds are the default; EAS Free is used only for tester
  distribution, and any change to that boundary is a scoped decision.
- **Git-history rewrite:** deferred (DEC-13). Only undertaken if the developer **separately
  authorizes** it; until then, historically committed secrets are handled by rotation
  (§ 5.3), not history surgery.
