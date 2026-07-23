# Matani · Project Architecture

**Document type:** Architecture document
**Audience:** The developer, thesis advisor, reviewers, and AI agents working in this repo
**Status:** Active
**Updated:** 2026-07-23
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

Matani is a four-part system: an Expo mobile app, a colocated Express backend that proxies
all external providers, Supabase for identity and persistence, and three external
providers (Sentinel Hub, weather, Gemini) that the client never contacts directly.

### 1.1 Mobile app (Expo SDK 57 / React Native 0.86)

- Expo Router with **file-based routes** under `app/` (`app/_layout.tsx`, tab group
  `app/(tabs)/` = `index`, `explore`, `weather`, `education`, `profile`; plus
  `auth/`, `detail-lahan-page.tsx`, `detail-education-page.tsx`, `onboarding`,
  `notifications`, `splash`, `modal`). `typedRoutes` and `reactCompiler` are enabled
  (`app.config.ts:59-62`).
- Expo UI is installed as an available native/universal component foundation
  (`package.json:15`); no existing screen has been migrated to it.
- **Google Maps** renders the interactive polygon field-drawing surface (via
  `react-native-maps`). Map SDK keys are **injected at build time from environment** by
  `app.config.ts` — iOS from `GOOGLE_MAPS_API_KEY_IOS` (`app.config.ts:16`), Android from
  `GOOGLE_MAPS_API_KEY_ANDROID` (`app.config.ts:34`). These land in the compiled native
  config and are **client-visible in the shipped binary** (see § 5.3).
- The app reaches the backend over an `EXPO_PUBLIC_API_URL` / host+port candidate list;
  the NDVI call builds `/ndvi?bbox=…` against those candidates
  (`app/(tabs)/explore.tsx:862-891`).

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
| `POST /ai/summary` | `backend/api/ai/route.js` | Google Gemini (Generative Language API) | Accepts `{lahanCards, totals}`, builds an Indonesian agronomy prompt, and calls Gemini with an **env-configured model** `MATANI_GEMINI_MODEL` plus an **in-code fallback candidate list** (`route.js:117-127,158-214`); requires `GOOGLE_GENERATIVE_AI_API_KEY` (`route.js:87-93`). |

**As-built processing-location note (thesis-paper discrepancy):** the weather **risk score** — `min(100, max(0, Pavg×4 + H×0.4))`, HYP-07 / DEC-16 — is computed **client-side** in `app/(tabs)/weather.tsx:541-576`, not in the backend. The thesis paper's three-layer description assigns "heuristic risk-score calculation" to the application processing layer; that is target-architecture wording, not as-built fact (recorded in `thesis-paper-corrections.md`; PRD-17).

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

> A prototype Sentinel Hub request is connected to the field-list surface, with silent
> synthetic fallback. Results are not yet a provenance-safe, polygon-based, current,
> persisted monitoring pipeline. The detail analysis remains synthetic.

This is **the canonical measurement-provenance wording**. All other documents link here;
none may soften or restate it. The verified facts behind it (commit
`d131c941`, re-checked 2026-07-23):

- **Field-list surface seeds synthetic data first.** On load, every saved field without an
  override is seeded with `createSyntheticNdviRecord(lahan)` (`app/(tabs)/explore.tsx:1146`).
- **The one live call falls back to synthetic silently.** When a bounding box is available,
  the code calls `fetchNdviStatistic(bbox)` (`explore.tsx:1416`); if the API result is not
  usable it substitutes `createSyntheticNdviRecord(lahan)`
  (`explore.tsx:1419-1421`, `recordFromApi ?? createSyntheticNdviRecord(lahan)`), and on a
  thrown error it does the same (`explore.tsx:1423-1426`). A missing bbox also yields a
  synthetic record (`explore.tsx:1411-1413`). **The UI does not distinguish a fetched
  value from a synthesized one.**
- **The detail screen is fully synthetic.** NDVI history on the detail page is generated
  by `buildNdviSeries(…)` from `utils/ndvi-simulator.ts`
  (`app/detail-lahan-page.tsx:166`, imported at `detail-lahan-page.tsx:30-35`). No live
  request runs on this screen at all.
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
satellite path is **prototype** (partially wired, non-provenance-safe); the detail history
is **fixture-grade synthetic presented as real — the core defect** the thesis work must
close; **nothing is `measured`** yet (no persisted, provenance-complete value exists).

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

**Planned Python research workspace** (`research/`, added per DEC-05):

```text
research/
  pyproject.toml           # packaged, dependency-pinned workspace
  src/matani_rs/           # tested core: acquisition, index computation, QA, comparison
  notebooks/               # analysis narratives that CALL tested package functions
  tests/                   # unit/integration tests over src/matani_rs
  data-manifests/          # declarative descriptions of inputs (sites, dates, products)
  outputs/                 # generated thesis figures/tables (reproducible artifacts)
```

Notebooks are **thin** — they call functions in `src/matani_rs/`, they do not embed the
algorithms. This keeps the analysis reproducible and lets the same tested code back both
research outputs and (if ADR-03 triggers) production processing.

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
- **Status:** Accepted (DEC-08).
- **Context:** The `/ai/summary` route generates an Indonesian advisory via an
  env-configured Gemini model (`backend/api/ai/route.js:117-127`). **As-built there is no
  disable flag** — it runs whenever `GOOGLE_GENERATIVE_AI_API_KEY` is present
  (`route.js:87-93`); adding the flag is target work.
- **Decision:** Gemini stays an **optional UX summary, disabled by default via a config
  flag**, and is **never** used as measurement, ground truth, or a research label.
- **Consequences:** Protects research validity (LLM output cannot enter the measurement or
  labeling path); the summary degrades to absent when disabled.
- **Revisit trigger:** A product requirement makes the summary load-bearing — even then it
  remains outside the measurement/labeling boundary.

### ADR-06 · Controlled acquisition worker/job boundary
- **Status:** Accepted (DEC-05).
- **Context:** As-built, rendering the field list triggers the live NDVI call and results
  are transient (§ 2). This couples cost and quota to UI rendering and yields no persisted,
  provenance-safe measurement.
- **Decision:** Introduce an **idempotent, controlled acquisition worker/job**. Measurement
  requests are explicit; the worker deduplicates concurrent jobs, validates and persists
  results with provenance, and mobile screens **read the stored result**.
- **Consequences:** Decouples satellite cost from screen rendering; enables quota
  accounting, idempotency, and honest `unavailable` states.
- **Revisit trigger:** Acquisition volume or latency requirements outgrow the chosen job
  mechanism.

### ADR-07 · Versioned Supabase migrations + DB tests replace `supabase_setup.sql`
- **Status:** Accepted (DEC-05).
- **Context:** `supabase_setup.sql` is a 388-line file with **duplicated table/policy/view/
  trigger/function blocks** and merge-marker comments; it is **not a reliable clean-install
  migration** (§ 7 — e.g. a thumbnail trigger references a function defined later in the
  file).
- **Decision:** Replace it with **versioned, ordered migrations** and **DB tests** (via the
  Supabase CLI), including tests that prove cross-user RLS isolation (§ 5.2).
- **Consequences:** Reproducible schema; regressions caught by tests; the legacy file is
  retired.
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

---

## 5 · Trust boundaries and security risks

### 5.1 Backend: unauthenticated, permissively CORS-open provider proxy
The Express app applies **permissive CORS with no options** (`backend/index.js:13`,
`app.use(cors())`) and **mounts every route with no authentication or authorization
middleware** (`backend/index.js:17-25`; the routers in `backend/api/**` contain no auth
check). Any caller who can reach the deployed backend can spend the developer's Sentinel
Hub, weather, and Gemini quota, and reach `/ndvi`, `/weather`, and `/ai/summary` directly.

**Required (roadmap M0 — see [`implementation-plan.md`](implementation-plan.md)):**
Supabase **JWT verification**, **per-user authorization**, **request-schema validation**,
**polygon vertex + area limits**, **acquisition-window limits**, **per-user / per-endpoint
rate limits**, **quota accounting**, **idempotency** (no concurrent duplicate jobs, tying
to ADR-06), **privacy-conscious structured logging**, and **sanitized client errors** — no
raw provider responses or stack traces returned to clients (the NDVI handler currently
echoes `err.message` to the client, `utils.js:171-174`).

### 5.2 Supabase view `lahan_with_info` — high-priority authorization risk (requires verification)
The view is defined `CREATE OR REPLACE VIEW lahan_with_info AS SELECT … FROM lahan`
(`supabase_setup.sql:111-123`, redefined `:250-262`) **without an explicit
`security_invoker = true`**. Postgres views may run with the **view owner's** privileges
and can therefore **bypass the underlying table's RLS** depending on Postgres version,
view ownership, and configuration. The base table `lahan` has RLS with an owner-scoped
policy (`:87-91`), but a `SECURITY DEFINER`-style (owner-rights) view over it could expose
**all users' fields** through `lahan_with_info`.

State this as a **high-priority authorization risk requiring verification** against the
**live hosted Postgres version and the view's actual owner/definition** — it is **not a
confirmed breach** until reproduced. **Remedies:** recreate as a `security_invoker = true`
view where the hosted Postgres version supports it; otherwise revoke `SELECT` /
relocate the exposed columns behind an RLS-checked path; and add **DB tests proving
cross-user isolation** (ADR-07) so the guarantee is enforced, not assumed.

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
| Satellite (CDSE Sentinel Hub) | Bounded live access on the free "General User" tier; monthly + per-minute quota. **Perishable — recheck before deployment.** | EVID-010 (checked 2026-07-23); auth EVID-011; capability EVID-012 |
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
fixes none of these** — the baseline is a snapshot of debt, not a to-do completed.

| Check | Command | Exit | Counts / result | Representative categories |
|-------|---------|------|-----------------|----------------------------|
| Lint | `npm run lint` (expo lint) | **1** | 8 errors, 11 warnings | `react/no-unescaped-entities` in `app/(tabs)/explore.tsx` (1946, 2211) and `app/(tabs)/index.tsx` (1456, 1494); `@typescript-eslint/no-unused-vars` in `explore.tsx`, `index.tsx`, `profile.tsx`, `detail-lahan-page.tsx` |
| Type-check (root) | `npx tsc --noEmit` | **2** | 1 error | **TS5098** at `tsconfig.json(3,3)`: `customConditions` (inherited from `expo/tsconfig.base`) requires `moduleResolution` = `node16`/`nodenext`/`bundler`, but the local config sets `"node"` (`tsconfig.json:15`) |
| Type-check (backend) | `npx tsc --noEmit` (after `npm ci` — `node_modules` was absent) | **0** | clean | — |
| Tests / CI | — | — | **none** | no test scripts (`package.json` scripts: `start`, `reset-project`, `android`, `ios`, `web`, `lint`), no test files, no `.github/workflows/` |
| Schema install | inspect `supabase_setup.sql` | — | **not a reliable clean-install migration** | 388 lines; **duplicated** table/policy/view/trigger/function blocks with `-- ...existing code...` merge markers; trigger `update_lahan_thumbnails_updated_at` (`:76-78`) references `update_updated_at_column()` which is **defined later** (`:98-104`), so a clean single-run install fails at that trigger; `lahan` table (`:5`, `:168`), `lahan_with_info` view (`:111`, `:250`), and the timestamp function (`:98`, `:234`) are each defined twice |

**Current upgrade verification (2026-07-23).** The developer directed the Expo upgrade
before M4. Expo SDK 57 / React Native 0.86 / TypeScript 6 and Expo UI are now installed
(`package.json:15,18,33,35,51`). `npx expo-doctor@latest` passes 20/20 checks,
`npx tsc --noEmit` exits 0, and Expo exports succeed for web, Android, and iOS. Lint
remains failing with 40 errors and 11 warnings: the original unescaped-entity debt plus
stricter React Hooks diagnostics introduced by the current Expo ESLint preset. No device
or store binary was built in this upgrade pass.

**Dependency modernization verification (2026-07-23).** Unused frontend-only Turf,
Express, node-fetch, and AI SDK packages were removed from the root package. All
independently managed backend packages are current; `npm run build` passes, the Express 5
root endpoint responds locally, and the backend production dependency audit reports zero
vulnerabilities. The root production audit retains 11 moderate advisories solely through
Expo's transitive `xcode` → `uuid` tooling chain; npm's proposed forced resolution would
downgrade the SDK-pinned `expo-splash-screen`, so it was not applied.

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
│  ├─ index.js              # app, CORS, route mounting
│  ├─ sentinelAuth.js       # Sentinel Hub OAuth token (cached)
│  └─ api/{ndvi,weather,ai} # provider proxy handlers
├─ components/              # shared UI components
├─ hooks/                   # React hooks
├─ constants/               # ndvi.ts (severity thresholds — HYP, DEC-11), education.ts, theme.ts
├─ utils/                   # ndvi-simulator.ts (synthetic NDVI), weather-icons.ts
├─ assets/                  # images / fonts
├─ supabase_setup.sql       # legacy schema (to be replaced — ADR-07)
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
