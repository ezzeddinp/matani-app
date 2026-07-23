# Matani · Product Requirements Document

**Document type:** Product requirements document
**Audience:** The developer, thesis advisor, reviewers, and AI agents working in this repo
**Status:** Active
**Updated:** 2026-07-23
**Canonical for:** Feature behavior, scope tags, and product invariants
**Companion documents:** [`product-brief.md`](product-brief.md), [`project-architecture.md`](project-architecture.md), [`design-guidelines.md`](design-guidelines.md), [`research-protocol.md`](research-protocol.md), [`data-evaluation-plan.md`](data-evaluation-plan.md), [`implementation-plan.md`](implementation-plan.md)

> Some companion documents (`design-guidelines.md`, `data-evaluation-plan.md`, `implementation-plan.md`) are named as canonical homes in [`../AGENTS.md`](../AGENTS.md) § Document precedence but are not yet written. Links to them are forward references to their planned canonical location; behavior owned by them is described here only by contract, never duplicated.

---

## How to read this document

This document is the single canonical home for **what each Matani feature does, what it must do, and what it must never do**. It does not restate system internals (that is [`project-architecture.md`](project-architecture.md)), research methodology ([`research-protocol.md`](research-protocol.md)), or the measurement engineering contract ([`data-evaluation-plan.md`](data-evaluation-plan.md)) — it links to them.

**Every feature and requirement carries a scope tag:**

- **[As-built]** — exists in the shipped code today, with the fidelity stated. A repository fact, cited to `file:line` against commit `d131c941bf0a260626324454825f51bbdc075f63` (re-verify before acting; line numbers drift).
- **[Thesis]** — required for the thesis milestones (M0–M3); decided but not yet built.
- **[Post-thesis]** — deferred to product hardening (M4) or a later, separately scoped decision.
- **[OUT]** — must **not** be implemented or claimed. A hard boundary, not a backlog item.

**Provenance markers** follow [`../AGENTS.md`](../AGENTS.md): external facts by `EVID-*` / `OBS-*` (see [`evidence-register.md`](evidence-register.md)); decisions by `DEC-*` (see [`context-dump.md`](context-dump.md)) and `ADR-*` (see [`project-architecture.md`](project-architecture.md)); hypotheses/unvalidated thresholds by `HYP-*` (see [`research-protocol.md`](research-protocol.md)); repository facts by `file:line`. The project owner is **the developer**. External wording is never re-copied — cited by ID with a short gloss.

**As-built ≠ target.** Where the shipped app differs from the intended behavior, a *current-fidelity note* states the gap plainly. Nothing here claims the current implementation is thesis-ready — per [`../AGENTS.md`](../AGENTS.md) honesty constraints, it is not.

---

## 1 · Scope language and non-negotiable invariants

The invariants below are **product-wide constraints** that no feature may violate. They are the honesty constraints of [`../AGENTS.md`](../AGENTS.md) expressed as testable product rules. Where the as-built app currently violates one, that is stated openly — a violation is a scheduled defect (M2), never an accepted behavior.

### Invariants (INV-*)

- **INV-01 — No synthetic data shown as measured.** Synthetic, fixture, or simulated values are **never** displayed in the product as measured satellite data — no chart, card, badge, number, or date derived from a simulator may read as a real observation.
- **INV-02 — No silent substitution.** The product **never** silently substitutes a fixture or simulation for real data. If real data is absent, the substitution (if any test/fixture data is used at all) is labeled as such; a measured surface never quietly degrades into a synthesized one.
- **INV-03 — Every measured value carries provenance.** Any value presented as `measured` carries its origin — acquisition window, geometry, provider, quality flags, masking rule-set version — so `measured` is always distinguishable from `unavailable` and from synthetic (provenance contract: [`project-architecture.md`](project-architecture.md) § 3; engineering form: [`data-evaluation-plan.md`](data-evaluation-plan.md)).
- **INV-04 — Data availability and quality are visible.** The user can see whether an observation exists and how good it is — valid-pixel accounting per index, polygon-level cloud/shadow state — not just a bare number (RQ3, HYP-03; [`research-protocol.md`](research-protocol.md) §§ 8–9).
- **INV-05 — Displayed date is the observation date.** The acquisition date shown for any observation is the **satellite observation date**, never the fetch/render date or a synthesized "current" date ([`research-protocol.md`](research-protocol.md) § 8).
- **INV-06 — API unavailability never fabricates.** When a provider is unreachable, returns nothing usable, errors, or is rate-limited, the product shows an **honest unavailable state** — it must never fabricate a measurement to fill the gap.
- **INV-07 — Core thesis functionality works without Gemini.** The measurement pipeline, feasibility study, and all research-relevant surfaces function with the AI summary entirely absent; Gemini is optional UX only (ADR-05 / DEC-08).
- **INV-08 — Cadence claims require the feasibility study.** No monitoring-cadence promise (weekly/biweekly/monthly/etc.) is made anywhere in the product until the Indonesia feasibility study supports it, per site and season. Nominal 5-day revisit (EVID-006) is an acquisition cadence, not a usable one ([`research-protocol.md`](research-protocol.md) § 4; DEC-12).
- **INV-09 — Severity labels are HYP-04 heuristics until calibrated.** The NDVI severity bands and cutoffs in `constants/ndvi.ts:12-45,64-100` (0.60 / 0.20 / 0.00 boundaries) are an as-built UI heuristic, not calibrated science, and remain **HYP-04-tagged** until validated against field observations. They may not be presented as a crop-health diagnosis (HYP-04 / DEC-11).

### Invariants the as-built app currently VIOLATES

The shipped app violates **INV-01, INV-02, and INV-06** on the satellite path. The single source of truth for exactly how is [`project-architecture.md`](project-architecture.md) § 2 (Current measurement provenance) — the canonical, non-softened wording. One-line summary: *a prototype Sentinel Hub request is wired to the ladang field-list surface with a silent synthetic fallback the UI does not distinguish from a measured value, and the field-detail history is fully synthetic.*

Concretely (cited, not restated from § 2):
- The ladang field cards seed `createSyntheticNdviRecord(...)` on load (`app/(tabs)/explore.tsx:1146`) and fall back to it silently on empty result, missing bbox, or thrown error (`explore.tsx:1412,1420,1426`) — **violates INV-01, INV-02, INV-06**.
- The field-detail screen generates its entire NDVI history and derived analysis from `utils/ndvi-simulator.ts` with no live request (`app/detail-lahan-page.tsx:166`) — **violates INV-01, INV-05** (dates are synthesized, not acquisition dates).
- Nothing is persisted as a `measured` value with provenance — fetched results are transient UI overrides (`explore.tsx:1143-1150,1421,1426`) — so **INV-03 cannot yet be satisfied** on the satellite path.

These violations are **scheduled for removal in M2** — the provenance-complete pipeline that replaces the silent synthetic fallback with measured values and honest unavailable states (see [`implementation-plan.md`](implementation-plan.md); phased scope in [`product-brief.md`](product-brief.md) § 4).

**Where the app is already honest:** the **home dashboard** field cards read persisted `lahan_health` rows and fall back to an explicit "Belum Ada Data" (no-data) state rather than synthesizing (`app/(tabs)/index.tsx:782-824`, unknown config `constants/ndvi.ts:47-54`) — the synthetic-fallback violation is localized to the ladang tab and the detail screen, not app-wide.

---

## 2 · Users and roles

Full positioning lives in [`product-brief.md`](product-brief.md) § 5; the operative roles for feature behavior are:

- **The thesis team / researchers (primary; DEC-17).** The thesis deliverable is the rice DSS with the measurement evaluation as its backbone (DEC-14, amending DEC-01); the developer is the primary operator of the acquisition worker, the feasibility study, and the research workspace. The "user" of the measurement pipeline is the research itself.
- **Test users.** Anyone using the app today. Matani has **no deployed farmer base** ([`product-brief.md`](product-brief.md) § 5) — every current user is a test user, not a served customer.
- **Farmer / *petani* (secondary — design audience).** Indonesian smallholders growing the five supported crops, whose sub-0.5-ha fields (EVID-013) are the population the product is designed *toward*. They are the UX audience, not a current user base.
- **Advisor / examiner (tertiary).** Evaluate the research on its own terms — the RQ set, methodology, and validity — not the app as a product.

---

## 3 · Feature specifications

### PRD-01 · Authentication (sign-up / login) · [As-built]

**Behavior.** Email/password auth through Supabase via `authService`. Login (`app/auth/login.tsx:50`) calls `authService.signIn({email,password})` and requires a returned `session.user` (`login.tsx:55`). Sign-up (`app/auth/signup.tsx`) collects username, email, password, and password confirmation, with client validation: email+password required (`signup.tsx:53`), passwords must match (`signup.tsx:63`), optional username 3–20 chars, alphanumeric/underscore only (`signup.tsx:69-75`). On signup a trigger back-fills `public.users` ([`project-architecture.md`](project-architecture.md) § 1.3; `supabase_setup.sql:268-295`). The client authenticates with the Supabase anon/publishable key — client-safe **conditional on RLS** (EVID-020).

**Acceptance criteria.**
- Invalid/empty credentials produce an inline error, never a session.
- A successful login yields a Supabase session and routes into the tab group.
- No password or token is logged or surfaced in a client-visible error.

**Current-fidelity note.** Client-side validation only; server-side authorization hardening (JWT verification on the backend, per-user checks) is M0 work ([`project-architecture.md`](project-architecture.md) § 5.1).

### PRD-02 · Splash & session routing · [As-built]

**Behavior.** `app/index.tsx` redirects to `/splash`. The splash screen animates, then on continue checks `supabase.auth.getSession()` and routes to `/(tabs)` when a session exists, else `/auth/login` (`app/splash.tsx:111-121`); any error routes to login (`splash.tsx:121`).

**Acceptance criteria.** A returning authenticated user reaches the tabs without re-login; an unauthenticated user reaches login; a session-check failure fails safe to login.

### PRD-03 · Onboarding · [As-built]

**Behavior.** `app/onboarding.tsx` is a standalone intro screen whose CTA routes to `/auth/login` (`onboarding.tsx:16`).

**Current-fidelity note.** The onboarding screen is **orphaned** — no route navigates to it (the splash flow goes session-check → tabs/login directly; a repo-wide search finds no inbound reference). It exists in the codebase but is not in the live navigation flow. Wiring or removing it is a product decision, not a defect that blocks the thesis.

### PRD-04 · Home dashboard — weather card · [As-built]

**Behavior.** The home tab (`app/(tabs)/index.tsx`) renders a weather summary card (`index.tsx:205-233`) from live weather fetched for the user's location (`fetchWeatherData`, `index.tsx:488`). Provider order is AccuWeather-if-key-set → Open-Meteo fallback (`index.tsx:500-582`), matching the weather screen (PRD-12).

**Acceptance criteria.** The card shows current conditions for the resolved location; on total provider failure it shows an error/empty state (`weatherError`, `index.tsx:381`), never fabricated weather.

**Current-fidelity note.** Target default provider is Open-Meteo (ADR-04 / DEC-07); AccuWeather is dropped from the target architecture.

### PRD-05 · Home dashboard — field status cards (NDVI) · [As-built]

**Behavior.** Home field cards read persisted health rows from `lahan_health` (`index.tsx:782-783`, selecting `ndvi_score,ndmi_score,status,captured_at,…`) and classify via `classifyNdviStatus` (`constants/ndvi.ts:64`). When no row exists, the card shows the explicit "Belum Ada Data" unknown state (`constants/ndvi.ts:47-54`).

**Acceptance criteria.**
- A field with a persisted health row shows its classified status.
- A field without one shows the honest no-data state — **not** a synthesized value.
- Severity labels are treated as HYP-04 heuristics (INV-09), not diagnoses.

**Current-fidelity note.** This surface is **honest by construction** (reads persisted data, falls back to unavailable). However, **no code writes measurement rows to `lahan_health`** — the table is only read (`index.tsx:782`, `explore.tsx:594`) and deleted-on-field-delete (`explore.tsx:1555`); nothing persists a fetched measurement. In practice the home cards therefore show "Belum Ada Data" until the M2 pipeline persists real measurements. The `status`/`ndvi_score` classification remains HYP-04 (INV-09).

### PRD-06 · Field management — map, polygon drawing, search, geocode · [As-built]

**Behavior.** The ladang tab (`app/(tabs)/explore.tsx`) renders a Google Map (`react-native-maps`, `MapView`/`Polygon`/`Marker`) on which the user draws a field polygon by tapping vertices into `pendingPolygon` (`explore.tsx:409`); polygons persist as PostGIS geometry ([`project-architecture.md`](project-architecture.md) § 1.3). Place search queries **OpenStreetMap Nominatim** (`explore.tsx:720`, min 3 chars, debounced, limit 6), not a paid geocoder. Reverse geocoding of the user location and saved-field centroids uses **on-device `expo-location`** `Location.reverseGeocodeAsync` (`explore.tsx:662,778`), with a cache (`geocodeCacheRef`) and a rate-limit cooldown that falls back to a coordinate label rather than failing (`explore.tsx:487-496`).

**Acceptance criteria.**
- A drawn polygon of ≥3 vertices can be persisted (`explore.tsx:582` filters <3-vertex geometries).
- Place search returns location suggestions or an empty state; it never blocks field creation.
- Reverse-geocode rate limiting degrades to a coordinate label, never to a fabricated place name.

**Current-fidelity note.** Google Maps SDK keys are client-visible by design; the control is per-platform + per-API key restriction, not secrecy (EVID-019; [`project-architecture.md`](project-architecture.md) § 5.3). [Thesis] geometry hardening — vertex/area limits, self-intersection rejection — is M0 ([`project-architecture.md`](project-architecture.md) § 5.1; valid-polygon requirement [`research-protocol.md`](research-protocol.md) § 3).

### PRD-07 · Field creation — crop category, area, thumbnail, save · [As-built]

**Behavior.** On save (`explore.tsx:1057`) the user must pick a crop category from the five supported: **jagung, padi, kedelai, teh, kopi** (`LAHAN_CATEGORIES`, `explore.tsx:56-78`); a missing category blocks save (`explore.tsx:1057`). A per-crop thumbnail asset is resolved and stored (`explore.tsx:1076-1083`). Area is estimated client-side and then superseded by the server value: `calculateArea` computes a **planar shoelace area in degrees × 10000** (`explore.tsx:814-823`), but the persisted/displayed hectare figure is `savedEntry?.area_ha ?? area` (`explore.tsx:1086`), where `area_ha` is the **PostGIS generated column** `ST_Area(geom::geography)/10000` (`supabase_setup.sql:10`).

**Acceptance criteria.**
- Save requires a valid polygon, a name, and a crop category.
- The displayed area is the authoritative PostGIS geography-based hectare value when available.
- The crop category is one of the five supported values.

**Current-fidelity note.** Earlier project descriptions referred to "Turf area computation," but Turf was never used for area and its unused packages have now been removed from the root dependency set (`package.json:13-43`). The client estimate remains the hand-rolled planar shoelace formula (`explore.tsx:814-823`), which is **not equal-area** and is only a pre-save estimate; the authoritative value is the PostGIS geography column. Equal-area handling is a [Thesis] requirement ([`research-protocol.md`](research-protocol.md) § 7 — "area-in-hectares derived on an equal-area basis").

### PRD-08 · Ladang field cards — NDVI status · [As-built] · **INV-01/02/06 VIOLATION**

**Behavior.** Each saved field on the ladang tab shows an NDVI status card. On load, every field without an override is seeded with `createSyntheticNdviRecord(...)` (`explore.tsx:1146`). When a bounding box is available the code calls `fetchNdviStatistic(bbox)` (`explore.tsx:1416`) against the backend `/ndvi` endpoint, but substitutes a synthetic record on empty/unusable result, missing bbox, or thrown error (`explore.tsx:1412,1420,1426`). The UI does not distinguish a fetched value from a synthesized one.

**Acceptance criteria (as-built — describes the defect).** Card renders a classified NDVI status for every field, always populated.

**Acceptance criteria ([Thesis], M2 target).**
- A field shows a `measured` value only when a provenance-complete observation exists; otherwise it shows an honest `unavailable` state (INV-01/02/06).
- The displayed date is the acquisition date (INV-05).
- Valid-pixel/quality state is visible (INV-04).

**Current-fidelity note.** This is the primary INV-01/02/06 violation. Canonical wording: [`project-architecture.md`](project-architecture.md) § 2. Removal is M2 ([`implementation-plan.md`](implementation-plan.md)).

### PRD-09 · Field edit / delete / notes · [As-built]

**Behavior.** A field can be renamed/edited, deleted, and annotated with notes. Notes are CRUD against `lahan_notes`: insert (`explore.tsx:1463`), update (`explore.tsx:1475`), delete (`explore.tsx:1508`), all owner-scoped by `user_id`. Deleting a field cascades: it removes the field's `lahan_health` and `lahan_notes` rows scoped to the user (`explore.tsx:1555-1556`).

**Acceptance criteria.**
- All note and field mutations are owner-scoped (RLS-enforced; [`project-architecture.md`](project-architecture.md) § 1.3, § 5.2).
- Deleting a field removes its dependent rows without affecting other users' data.

**Current-fidelity note.** The `lahan_with_info` view is a high-priority authorization risk requiring verification (missing `security_invoker`; [`project-architecture.md`](project-architecture.md) § 5.2). Cross-user RLS isolation must be proven by DB tests (ADR-07) — M0.

### PRD-10 · AI advisory — priority summary · [As-built]

**Behavior.** On the **ladang tab** (not the home dashboard), tapping "Analisis Sekarang" requests an advisory from the backend `/ai/summary` endpoint (`explore.tsx:1330-1333`), which builds an Indonesian agronomy prompt and calls Gemini via an env-configured model ([`project-architecture.md`](project-architecture.md) § 1.2; `backend/api/ai/route.js:117-127`). The returned text is parsed into numbered priority items (`explore.tsx:520-531`) and rendered as a priority list (`explore.tsx:2185-2211`); the empty state prompts the user to run an analysis (`explore.tsx:2211`).

**Acceptance criteria.**
- [As-built] The summary runs whenever the backend Gemini key is present; its absence yields an empty/error state, and the rest of the app is unaffected (INV-07).
- The AI output is never treated as measurement, ground truth, or a research label (ADR-05 / DEC-08).

**Current-fidelity note.** Earlier project descriptions placed the AI priority summary on the home dashboard; in code it lives on the ladang tab (CODE: `explore.tsx:1330`). [Thesis] requirement: an explicit **disable-by-default config flag** — as-built there is **no disable flag**, the route runs whenever `GOOGLE_GENERATIVE_AI_API_KEY` is set (`backend/api/ai/route.js:87`); adding the flag is target work (ADR-05).

### PRD-11 · Field detail — NDVI history chart & analysis · [As-built] · **INV-01/05 VIOLATION**

**Behavior.** The field-detail screen (`app/detail-lahan-page.tsx`) shows an NDVI history mini-chart (`MiniAreaChart`, `detail-lahan-page.tsx:346`) plus a derived analysis panel: current NDVI, trend %, pest pressure, disease risk, stress index, days-to-harvest, and harvest progress (`detail-lahan-page.tsx:537-586`).

**Current-fidelity note (the core defect).** The **entire screen is synthetic**. The NDVI history is generated by `buildNdviSeries(lat,lon,areaHa,today)` from `utils/ndvi-simulator.ts` (`detail-lahan-page.tsx:166`, imported `:30-35`); the harvest and risk figures are all deterministic functions of coordinates/area/date (`detail-lahan-page.tsx:150-186`). **No live request runs on this screen, and no `lahan_health` read occurs.** Dates on the chart are synthesized, not acquisition dates. This violates INV-01 and INV-05 and is fixture-grade synthetic presented as real — the core defect the thesis work must close ([`project-architecture.md`](project-architecture.md) § 2).

**Acceptance criteria ([Thesis], M2 target).**
- History renders only persisted `measured` observations, each on its true acquisition date (INV-03, INV-05).
- Gaps render as honest missing intervals, not interpolated values ([`research-protocol.md`](research-protocol.md) § 11).
- Pest/disease/stress "diagnosis" figures are removed or re-scoped — they are not derivable from NDVI/NDMI and must not be presented as measurements or diagnoses (INV-09, HYP-04). Severity remains HYP-04.

### PRD-12 · Weather · [As-built]

**Behavior.** The weather tab (`app/(tabs)/weather.tsx`) shows current conditions and a multi-day forecast for the user location or a selected location. Provider order: AccuWeather (if `ACCUWEATHER_API_KEY` set) via the backend `/weather` endpoint → Open-Meteo fallback (`weather.tsx:226-306`; `OPEN_METEO_URL` `weather.tsx:23`; backend order [`project-architecture.md`](project-architecture.md) § 1.2). Weather is never synthesized — on total failure it surfaces an error.

**Acceptance criteria.** Current + forecast render for the resolved location; total provider failure yields an honest error state (INV-06), never fabricated weather.

**Current-fidelity note.** [Thesis] target: **Open-Meteo as default**, AccuWeather dropped (ADR-04 / DEC-07); obliges CC BY 4.0 attribution and the non-commercial constraint (EVID-021). The thesis paper reports the **as-built** AccuWeather→Open-Meteo fallback order, which is accurate today; the Open-Meteo-only default remains the target. The weather tab's risk-score card is specified separately (PRD-17).

### PRD-13 · Education articles · [As-built]

**Behavior.** The education tab (`app/(tabs)/education.tsx`) lists articles from the static `EDUCATION_ARTICLES` constant (`constants/education.ts:24`), each with a category and a priority badge (Kritis/Tinggi/…, `education.tsx:212-251`); a detail view renders the full article (`app/detail-education-page.tsx`). Content is static, bundled, and labeled as editorial guidance — not measurement.

**Acceptance criteria.** Articles list, filter/sort, and open to detail; content is clearly editorial and carries no measurement claims.

### PRD-14 · Notifications · [As-built]

**Behavior.** `app/notifications.tsx` renders a header and a static **empty state** ("Notifikasi", empty-state icon) — there is no notification generation, storage, or delivery system.

**Acceptance criteria.** Screen renders an honest empty state; it makes no claim of alerts that do not exist.

**Current-fidelity note.** A real notifications/alerting system (e.g. field-status or availability alerts) is **[Post-thesis]** and, if built, is gated by INV-08 (no cadence/alert promise pre-feasibility-study).

### PRD-15 · Profile · [As-built]

**Behavior.** The profile tab (`app/(tabs)/profile.tsx`) shows the authenticated user's profile (from `profileService.getProfile` + Supabase user metadata, `profile.tsx:134-151`) and their fields (`lahanService.getLahanByUser`, `profile.tsx:136`), and offers sign-out (`authService.signOut`, `profile.tsx:90`).

**Acceptance criteria.** Profile reflects the current session's user; sign-out clears the session and returns to the auth flow; a signed-out user cannot read another user's profile or fields (RLS; EVID-020).

### PRD-16 · Measurement pipeline · [Thesis]

**Behavior (contract only — engineering detail in [`data-evaluation-plan.md`](data-evaluation-plan.md)).** The target replaces the silent-fallback prototype (PRD-08, PRD-11) with a controlled, persisted, provenance-safe pipeline. Product-level behavior contract:

- **Request/refresh, not render-triggered.** Opening a screen never triggers satellite processing; measurement is an explicit request served by an idempotent controlled worker, and screens **read the persisted result** (ADR-06; [`project-architecture.md`](project-architecture.md) § 3 governing principle).
- **Provenance-complete persistence.** Every stored measurement carries acquisition window, polygon geometry, provider, quality flags, valid-pixel counts per index, and masking rule-set version (INV-03; [`project-architecture.md`](project-architecture.md) § 3 provenance contract).
- **Honest unavailable states.** When no quality-passing polygon-level observation exists for a field/window, the product shows an explicit `unavailable` state — replacing the silent synthetic fallback (INV-01/02/06; [`research-protocol.md`](research-protocol.md) § 8).
- **Valid-pixel visibility.** The user can see per-index valid-pixel sufficiency and polygon-level cloud/shadow state (INV-04; [`research-protocol.md`](research-protocol.md) §§ 8–9); NDVI (10 m, B04/B08) and NDMI (SWIR B11 at 20 m) valid-pixel counts are surfaced independently (EVID-009).
- **True acquisition dates only.** The displayed date is always the satellite observation date (INV-05).

**Acceptance criteria.**
- No screen shows a synthetic value as measured (INV-01), and no surface silently substitutes (INV-02).
- A field with no quality-passing observation shows `unavailable`, never a fabricated number (INV-06).
- Every `measured` value is reproducible from its stored provenance (INV-03).
- No cadence claim appears anywhere until the feasibility study licenses it (INV-08; [`research-protocol.md`](research-protocol.md) § 4).

**Current-fidelity note.** None built yet. This is the central [Thesis] deliverable (M2), gated by M0 (security/verification foundation) and M1 (feasibility study). The satellite provider migrates to CDSE Sentinel Hub free tier (ADR-02 / DEC-04); acquisition runs behind a controlled worker (ADR-06); fixtures stand in for providers in dev/CI (ADR-09 / DEC-09).

### PRD-17 · Weather risk score card · [As-built] · HYP-07

**Behavior.** The weather tab renders a "Skor Risiko Cuaca" card computed **client-side** in `app/(tabs)/weather.tsx:541-576`: average forecast precipitation and a representative humidity value are combined as `min(100, max(0, round(Pavg×4 + H×0.4)))`, banded **Rendah** (<40) / **Sedang** (40–69) / **Tinggi** (≥70), with a progress bar and a precipitation description. When no forecast exists it shows an honest "Tidak tersedia" state.

**Acceptance criteria.**
- The score renders only when forecast data exists; absence yields the unavailable state, never a fabricated score (INV-06).
- The card is presented as a heuristic weather-risk indicator, never as a validated agronomic risk model or a crop-damage prediction (HYP-07 / DEC-16).

**Current-fidelity note.** The thesis paper describes heuristic risk-score calculation as a **backend** responsibility (three-layer architecture, application processing layer); in code it is computed **in the presentation layer** (`weather.tsx:541`). This discrepancy is recorded in [`thesis-paper-corrections.md`](thesis-paper-corrections.md) — either the paper's architecture description is corrected or the computation moves server-side; until then this PRD documents the code as-built. The formula's weights/bands are uncalibrated (HYP-07); calibration against local agronomic data is [Post-thesis] unless the advisor pulls it into scope.

---

## 4 · Out of scope · [OUT]

These are hard boundaries. Building or claiming any of them is a defect, regardless of stated purpose.

- **[OUT-01] No silent synthetic substitution — ever again.** Synthesized values are never presented as measured, and a measured surface never silently degrades into a synthetic one (INV-01/02; DEC-10). The as-built violations (PRD-08, PRD-11) are the *only* permitted instances, and only until M2 removes them.
- **[OUT-02] No cadence promises before the feasibility study.** No weekly/biweekly/monthly (or any) monitoring-cadence claim in UI, copy, or docs until the Indonesia feasibility study supports it per site and season. Nominal revisit (EVID-006) is never the answer (INV-08; DEC-12; [`research-protocol.md`](research-protocol.md) § 4).
- **[OUT-03] No crop-health diagnosis from HYP thresholds.** The `constants/ndvi.ts` severity bands (HYP-04) may not be presented as a validated crop-health diagnosis; the field-detail pest/disease/stress figures (PRD-11) are not measurements and must not be shown as such (INV-09; DEC-11).
- **[OUT-04] No Gemini as ground truth or research label.** LLM output never enters the measurement or labeling path, and is never a research label or ground truth (INV-07; ADR-05 / DEC-08).
- **[OUT-05] No Sentinel-1 without a separate scope decision.** SAR (EVID-017) measures backscatter, not NDVI/NDMI reflectance; it is a set-aside post-thesis contingency requiring its own scope decision, not current scope ([`context-dump.md`](context-dump.md) § 6).
- **[OUT-06] No paid-provider dependence in ordinary dev/CI.** Ordinary development and CI never call live satellite or paid providers; fixture-first only (ADR-09 / DEC-09). Live/paid calls are explicit, out-of-band acquisition runs.
- **[OUT-07] No claim of thesis-readiness today.** The current implementation is not thesis-ready and is never described as such ([`../AGENTS.md`](../AGENTS.md) honesty constraints).

---

## 5 · Acceptance summary and traceability

Milestones (from [`product-brief.md`](product-brief.md) § 4; roadmap in [`implementation-plan.md`](implementation-plan.md)): **M0** verification & security foundation · **M1** Indonesia feasibility study · **M2** provenance-complete measurement pipeline (removes the synthetic fallback) · **M3** research validation · **M4** post-thesis product hardening.

| PRD | Scope | Invariants | Decisions / ADRs | Milestone | Key files |
|-----|-------|-----------|------------------|-----------|-----------|
| PRD-01 Auth | [As-built] | INV-07 | DEC-03; EVID-020 | M0 (authz hardening) | `app/auth/login.tsx`, `app/auth/signup.tsx`, `hooks/supabase`, `supabase_setup.sql:268-295` |
| PRD-02 Splash/routing | [As-built] | — | DEC-03 | M0 | `app/index.tsx`, `app/splash.tsx:111-121` |
| PRD-03 Onboarding | [As-built] | — | — | M4 (wire or remove) | `app/onboarding.tsx` |
| PRD-04 Home weather card | [As-built] | INV-06 | ADR-04 / DEC-07 | M4 (Open-Meteo default) | `app/(tabs)/index.tsx:205-233,488-582` |
| PRD-05 Home field cards | [As-built] | INV-01, INV-03, INV-05, INV-09 | DEC-11; HYP-04 | M2 | `app/(tabs)/index.tsx:782-824`, `constants/ndvi.ts` |
| PRD-06 Field map/draw/search | [As-built] | — | ADR-01 / DEC-03; EVID-019 | M0 (geometry limits) | `app/(tabs)/explore.tsx` (map, `:720` Nominatim, `:662,778` geocode) |
| PRD-07 Field creation/area | [As-built] | INV-03 | DEC-03 | M2 (equal-area) | `app/(tabs)/explore.tsx:814-823,1057-1094`, `supabase_setup.sql:10` |
| PRD-08 Ladang NDVI cards | [As-built] | **INV-01, INV-02, INV-04, INV-05, INV-06** | ADR-02/04-06; DEC-04/DEC-10/DEC-12 | **M2 (removes violation)** | `app/(tabs)/explore.tsx:1146,1412,1416,1420,1426`; arch § 2 |
| PRD-09 Edit/delete/notes | [As-built] | — | ADR-07; EVID-020 | M0 (RLS tests) | `app/(tabs)/explore.tsx:1463,1475,1508,1555`, `supabase_setup.sql` |
| PRD-10 AI advisory | [As-built] | INV-07 | ADR-05 / DEC-08 | M2 (disable-by-default flag) | `app/(tabs)/explore.tsx:520-531,1330,2185-2211`, `backend/api/ai/route.js:87` |
| PRD-11 Field detail | [As-built] | **INV-01, INV-05, INV-09** | HYP-04 / DEC-11; ADR-06 | **M2 (removes violation)** | `app/detail-lahan-page.tsx:166,346,537-586`, `utils/ndvi-simulator.ts` |
| PRD-12 Weather | [As-built] | INV-06 | ADR-04 / DEC-07; EVID-021 | M4 (Open-Meteo default) | `app/(tabs)/weather.tsx:23,226-306` |
| PRD-13 Education | [As-built] | — | — | — | `app/(tabs)/education.tsx`, `constants/education.ts:24`, `app/detail-education-page.tsx` |
| PRD-14 Notifications | [As-built] | INV-08 | DEC-12 | M4 (post-thesis) | `app/notifications.tsx` |
| PRD-15 Profile | [As-built] | — | EVID-020 | M0 | `app/(tabs)/profile.tsx:90,134-151` |
| PRD-16 Measurement pipeline | [Thesis] | **INV-01–INV-06, INV-08** | ADR-02/06/08/09; DEC-04/05/09/12 | **M1→M2→M3** | target — `research/`, backend worker; [`data-evaluation-plan.md`](data-evaluation-plan.md) |
| PRD-17 Weather risk score | [As-built] | INV-06 | DEC-16; HYP-07 | M4 (calibration post-thesis) | `app/(tabs)/weather.tsx:541-576` |

**Invariant coverage.** INV-01/02/06 are actively violated by PRD-08 and PRD-11 today and are the load-bearing acceptance gate for M2. INV-03/04/05 are unsatisfiable until PRD-16 persists provenance-complete measurements. INV-07 holds today (Gemini is non-blocking) but the disable-by-default flag (PRD-10) is outstanding. INV-08 holds (no cadence claim is made anywhere) and must continue to hold until M1. INV-09 holds as a documented constraint and governs every surface that renders `constants/ndvi.ts` classifications.
