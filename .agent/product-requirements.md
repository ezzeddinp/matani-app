# Matani · Product Requirements Document

**Document type:** Product requirements document
**Audience:** The developer, thesis advisor, reviewers, and AI agents working in this repo
**Status:** Active
**Updated:** 2026-08-21
**Canonical for:** Feature behavior, scope tags, and product invariants
**Companion documents:** [`product-brief.md`](product-brief.md), [`project-architecture.md`](project-architecture.md), [`design-guidelines.md`](design-guidelines.md), [`research-protocol.md`](research-protocol.md), [`data-evaluation-plan.md`](data-evaluation-plan.md), [`implementation-plan.md`](implementation-plan.md)

> Companion documents named in [`../AGENTS.md`](../AGENTS.md) exist and remain canonical for their assigned topics. This PRD links to those homes and does not duplicate their canonical claims.

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
- **INV-09 — Observation only, never diagnosis.** NDVI/NDMI values may be shown by acquisition date and summarized descriptively, but the product may not convert them into crop-health, pest, disease, stress, harvest, yield, or improvement/decline labels. HYP-04 is retired from the active UI and research claim surface (DEC-24).

### Invariants the as-built app currently does not satisfy

DEC-24 closes the production synthetic-substitution and synthetic-detail defects: provider failure now yields unavailable, and the detail timeline plots only stored dated rows. The satellite path still does not satisfy **INV-03 or INV-04** because it has no provenance-complete writer or quality accounting. Stored legacy rows are not promoted to `measured`; the single source of truth is [`project-architecture.md`](project-architecture.md) § Current measurement provenance.

Concretely: Ladang cards show stored legacy values or a transient provider snapshot and render unavailable on failure; no simulation utility remains. Field detail reads `lahan_health`, requires a stored date for every plotted point, and contains no derived diagnosis. Nothing writes a `measured` provenance record, so INV-03/04 remain open until M2.

These remaining provenance/quality gaps are scheduled for M2 (see [`implementation-plan.md`](implementation-plan.md)).

**Home dashboard:** cards show only a latest NDVI value, record date, and fixture/prototype state; absence renders an unavailable state. No severity or health label is computed (DEC-24).

---

## 2 · Users and roles

Full positioning lives in [`product-brief.md`](product-brief.md) § 5; the operative roles for feature behavior are:

- **The thesis team / researchers (primary; DEC-17).** The thesis deliverable is the rice DSS with the measurement evaluation as its backbone (DEC-14, amending DEC-01); the developer is the primary operator of the acquisition worker, the feasibility study, and the research workspace. The "user" of the measurement pipeline is the research itself.
- **Test users.** Anyone using the app today. Matani has **no deployed farmer base** ([`product-brief.md`](product-brief.md) § 5) — every current user is a test user, not a served customer.
- **Farmer / *petani* (secondary — design audience).** Indonesian smallholder rice farmers whose sub-0.5-ha fields (EVID-013) are the population the product is designed toward (DEC-24).
- **Advisor / examiner (tertiary).** Evaluate the research on its own terms — the RQ set, methodology, and validity — not the app as a product.

---

## 3 · Feature specifications

### PRD-01 · Authentication (sign-up / login) · [As-built]

**Behavior.** Email/password auth through Supabase via `authService`. Login (`app/auth/login.tsx:50`) calls `authService.signIn({email,password})` and requires a returned `session.user` (`login.tsx:55`). Sign-up (`app/auth/signup.tsx`) collects username, email, password, and password confirmation, with client validation: email+password required (`signup.tsx:53`), passwords must match (`signup.tsx:63`), optional username 3–20 chars, alphanumeric/underscore only (`signup.tsx:69-75`). On signup a trigger back-fills `public.users` ([`project-architecture.md`](project-architecture.md) § 1.3; `supabase_setup.sql:268-295`). The client authenticates with the Supabase anon/publishable key — client-safe **conditional on RLS** (EVID-020).

**Acceptance criteria.**
- Invalid/empty credentials produce an inline error, never a session.
- A successful login yields a Supabase session and routes into the tab group.
- No password or token is logged or surfaced in a client-visible error.

**Current-fidelity note.** Provider-backed mobile requests now attach the active Supabase
access token and the backend verifies it before quota admission
(`utils/backend-api.ts`, `backend/security.js`, CODE). Supabase table ownership remains
enforced separately by RLS.

### PRD-02 · Splash & session routing · [As-built]

**Behavior.** `app/index.tsx` redirects to `/splash`. The splash screen animates, then on continue checks `supabase.auth.getSession()` and routes to `/(tabs)` when a session exists, else `/auth/login` (`app/splash.tsx:111-121`); any error routes to login (`splash.tsx:121`).

**Acceptance criteria.** A returning authenticated user reaches the tabs without re-login; an unauthenticated user reaches login; a session-check failure fails safe to login.

### PRD-03 · Onboarding · [As-built]

**Behavior.** `app/onboarding.tsx` is a standalone intro screen whose CTA routes to `/auth/login` (`onboarding.tsx:16`).

**Current-fidelity note.** The onboarding screen is **orphaned** — no route navigates to it (the splash flow goes session-check → tabs/login directly; a repo-wide search finds no inbound reference). It exists in the codebase but is not in the live navigation flow. Wiring or removing it is a product decision, not a defect that blocks the thesis.

### PRD-04 · Home dashboard — weather card · [As-built]

**Behavior.** The home tab (`app/(tabs)/index.tsx`) renders a weather summary card from data fetched for the user's location through the Matani backend `/weather` route (`fetchWeatherData`, `index.tsx:490-538`). The backend uses Open-Meteo and returns WMO weather codes through one stable contract (PRD-12; ADR-04/10).

**Acceptance criteria.** The card shows current conditions for the resolved location; on total provider failure it shows an error/empty state (`weatherError`, `index.tsx:381`), never fabricated weather.

**Current-fidelity note.** Open-Meteo-only routing is implemented; provider failure returns an unavailable/error state with no direct-client bypass.

### PRD-05 · Home dashboard — latest observation cards · [As-built]

**Behavior.** Home field cards read the newest legacy `lahan_health` row and show only its NDVI value, stored observation date, and `fixture`/`prototype` state. No severity or health classification is computed. Absence renders an explicit unavailable state.

**Acceptance criteria.**
- A field with a dated persisted row shows its latest raw NDVI value and data state.
- A field without one shows the honest no-data state — **not** a synthesized value.
- No health, stress, improvement, or decline label is derived from the value (INV-09).

**Current-fidelity note.** No code writes provenance-complete measurement rows; `lahan_health` remains a read-only legacy source. A row is never called `measured`.

### PRD-06 · Field management — map, polygon drawing, search, geocode · [As-built]

**Behavior.** The ladang tab (`app/(tabs)/explore.tsx`) renders a Google Map (`react-native-maps`, `MapView`/`Polygon`/`Marker`) on which the user draws a field polygon by tapping vertices into `pendingPolygon` (`explore.tsx:409`); polygons persist as PostGIS geometry ([`project-architecture.md`](project-architecture.md) § 1.3). Place search queries **OpenStreetMap Nominatim** (`explore.tsx:720`, min 3 chars, debounced, limit 6), not a paid geocoder. Reverse geocoding of the user location and saved-field centroids uses **on-device `expo-location`** `Location.reverseGeocodeAsync` (`explore.tsx:662,778`), with a cache (`geocodeCacheRef`) and a rate-limit cooldown that falls back to a coordinate label rather than failing (`explore.tsx:487-496`).

**Acceptance criteria.**
- A drawn polygon of ≥3 vertices can be persisted (`explore.tsx:582` filters <3-vertex geometries).
- Outside drawing mode, the map accepts direct pan/drag and zoom gestures without handing the gesture to the surrounding page scroll.
- During drawing, place search is hidden and the Undo, Redo, Batal, and Simpan actions stay top-anchored inside the visible map area.
- Place search returns location suggestions or an empty state; it never blocks field creation.
- Reverse-geocode rate limiting degrades to a coordinate label, never to a fabricated place name.

**Current-fidelity note.** Google Maps SDK keys are client-visible by design; the control
is per-platform + per-API key restriction, not secrecy (EVID-019;
[`project-architecture.md`](project-architecture.md) § 5.3). The M0 backend bounds the
current bbox prototype. Exact-polygon vertex/area/self-intersection validation applies to
the M2 measurement request, which does not exist yet
([`project-architecture.md`](project-architecture.md) § 5.1; valid-polygon requirement
[`research-protocol.md`](research-protocol.md) § 3).

### PRD-07 · Field creation — padi scope, area, thumbnail, save · [As-built]

**Behavior.** New fields are always persisted as `padi`; the crop picker and crop filters no longer exist (DEC-24). `lahanService.saveLahan` enforces the value, and migration `20260821000100_padi_only_scope.sql` constrains new rows to `padi` or null. Existing non-padi labels are copied to `legacy_category` and cleared from active `category`, never relabeled as rice. Area is estimated client-side and superseded by the authoritative PostGIS geography-based generated value.

**Acceptance criteria.**
- Save requires a valid polygon and name; crop is invariantly padi.
- The displayed area is the authoritative PostGIS geography-based hectare value when available.
- The database rejects new non-padi categories, and legacy labels are preserved without false conversion.

**Current-fidelity note.** Earlier project descriptions referred to "Turf area computation," but Turf was never used for area and its unused packages have now been removed from the root dependency set (`package.json:13-43`). The client estimate remains the hand-rolled planar shoelace formula (`explore.tsx:814-823`), which is **not equal-area** and is only a pre-save estimate; the authoritative value is the PostGIS geography column. Equal-area handling is a [Thesis] requirement ([`research-protocol.md`](research-protocol.md) § 7 — "area-in-hectares derived on an equal-area basis").

### PRD-08 · Ladang field cards — latest observation · [As-built]

**Behavior.** Each saved field shows the newest stored legacy value when available. If it lacks NDVI/NDMI, the screen may request the current bbox/fixed-window prototype and show the transient response as `prototype`. Missing geometry, empty provider data, and provider errors produce `unavailable`; there is no synthetic fallback and no severity classification (DEC-24).

**Acceptance criteria (as-built).** A card shows raw NDVI/NDMI, date, and state when available; otherwise it remains empty/unavailable. It never diagnoses or fabricates.

**Acceptance criteria ([Thesis], M2 target).**
- A field shows a `measured` value only when a provenance-complete observation exists; otherwise it shows an honest `unavailable` state (INV-01/02/06).
- The displayed date is the acquisition date (INV-05).
- Valid-pixel/quality state is visible (INV-04).

**Current-fidelity note.** INV-06 synthetic substitution is closed. The transient bbox/fixed-window response still lacks polygon-exact provenance and persistence, so INV-03/04 remain open. Canonical wording: [`project-architecture.md`](project-architecture.md) § Current measurement provenance.

### PRD-09 · Field edit / delete / notes · [As-built]

**Behavior.** A field can be renamed/edited, deleted, and annotated with notes. Notes are CRUD against `lahan_notes`: insert (`explore.tsx:1463`), update (`explore.tsx:1475`), delete (`explore.tsx:1508`), all owner-scoped by `user_id`. Deleting a field cascades: it removes the field's `lahan_health` and `lahan_notes` rows scoped to the user (`explore.tsx:1555-1556`).

**Acceptance criteria.**
- All note and field mutations are owner-scoped (RLS-enforced; [`project-architecture.md`](project-architecture.md) § 1.3, § 5.2).
- Deleting a field removes its dependent rows without affecting other users' data.

**Current-fidelity note.** The versioned M0 baseline recreates `lahan_with_info` with
`security_invoker = true` and includes cross-user pgTAP coverage
(`supabase/migrations/20260728000100_m0_baseline.sql`,
`supabase/tests/0001_m0_rls.sql`, CODE). Hosted deployment remains a separate
developer-controlled action ([`project-architecture.md`](project-architecture.md) § 5.2).

### PRD-10 · Optional AI data summary · [As-built]

**Behavior.** On the Ladang tab, "Ringkas Data" requests an optional summary from `/ai/summary`. The payload contains raw NDVI/NDMI values, dates, areas, and data-state counts; it contains no NDVI classification. The backend requires exactly three neutral `Catatan X:` items about coverage, recency, and missing data, and explicitly forbids health interpretation, diagnosis, improvement/decline claims, and agronomic recommendations (DEC-24).

**Acceptance criteria.**
- [As-built] The summary runs whenever the backend Gemini key is present; its absence yields an empty/error state, and the rest of the app is unaffected (INV-07).
- The AI output is never treated as measurement, ground truth, or a research label (ADR-05 / DEC-08).
- The UI states that Gemini only summarizes values, dates, and data states.
- The backend may not issue crop diagnosis, trend meaning, or chemical/budidaya instructions (DEC-24).

**Current-fidelity note.** Earlier project descriptions placed the AI priority summary on
the home dashboard; in code it lives on the ladang tab. The backend now requires the
explicit `AI_SUMMARY_ENABLED=true` flag in addition to the key; false is the default and
the mobile surface remains non-blocking when the summary is unavailable
(`backend/config.js`, `backend/api/ai/route.js`, CODE; ADR-05).

### PRD-11 · Field detail — NDVI/NDMI time series · [As-built]

**Behavior.** The field-detail screen reads all stored legacy rows for one field, orders them by `captured_at`, and provides an NDVI/NDMI segmented time-series chart, raw latest/minimum/maximum values, and a dated chronology. Rows without a valid observation date or index value are omitted. Empty history renders an unavailable state.

**Current-fidelity note.** The simulator module and all derived pest/disease/stress/harvest logic are deleted (DEC-24). Legacy rows remain `fixture` or `prototype`, never `measured`, because the M2 provenance writer does not exist.

**Acceptance criteria.** Plot only stored values with their observation dates; do not interpolate gaps; label fixture/prototype state; show honest empty state; derive no diagnosis or condition class. M2 replaces legacy rows with provenance-complete `measured` observations without changing this observation-first interaction.

### PRD-12 · Weather · [As-built]

**Behavior.** The weather tab (`app/(tabs)/weather.tsx`) shows current conditions and a multi-day forecast for the user location or a selected location. The mobile app calls the backend `/weather` endpoint only; the backend uses Open-Meteo and returns WMO weather codes mapped to the bundled icon set. Weather is never synthesized—when the backend/provider path fails, the UI surfaces an error/unavailable state.

**Acceptance criteria.** Current + forecast render for the resolved location; total provider failure yields an honest error state (INV-06), never fabricated weather.

**Current-fidelity note.** Open-Meteo-only routing implements ADR-04 / DEC-07 and carries the attribution/non-commercial constraints recorded in EVID-021. The weather tab's heuristic context card is specified separately (PRD-17).

### PRD-13 · Education articles · [As-built]

**Behavior.** The education tab (`app/(tabs)/education.tsx`) lists articles from the static `EDUCATION_ARTICLES` constant (`constants/education.ts:24`), each with a category and a priority badge (Kritis/Tinggi/…, `education.tsx:212-251`); a detail view renders the full article (`app/detail-education-page.tsx`). Content is static, bundled, and labeled as editorial guidance — not measurement.

**Acceptance criteria.** Articles list, filter/sort, and open to detail; content is clearly editorial and carries no measurement claims.

### PRD-14 · Notifications · [As-built]

**Behavior.** `app/notifications.tsx` renders a header and a static **empty state** that explicitly says notification generation, storage, and delivery are unavailable. The Profile notification tab likewise shows an unavailable explanation rather than functional-looking WhatsApp/SMS/alert/report switches (`app/(tabs)/profile.tsx`, DEC-20).

**Acceptance criteria.** Screen renders an honest empty state; it makes no claim of alerts that do not exist.

**Current-fidelity note.** A real notifications/alerting system (e.g. field-status or availability alerts) is **[Post-thesis]** and, if built, is gated by INV-08 (no cadence/alert promise pre-feasibility-study).

### PRD-15 · Profile · [As-built]

**Behavior.** The profile tab (`app/(tabs)/profile.tsx`) shows the authenticated user's profile and their actual saved-field count/area, and offers sign-out. Notification capability is explicitly unavailable. The statistics tab does not display metadata-derived NDVI, alert, health, productivity, or monitoring-efficiency figures because no verified event/measurement writer exists. Achievement cards are labeled product previews based only on account age and saved-field count; they are not persisted credentials or agronomic assessments (DEC-20).

**Acceptance criteria.** Profile reflects the current session's user; sign-out clears the session and returns to the auth flow; a signed-out user cannot read another user's profile or fields (RLS; EVID-020). Unsupported notifications, usage events, measurement averages, productivity metrics, and expertise badges are unavailable or explicitly preview-only.

### PRD-16 · Measurement pipeline · [Thesis]

**Behavior (contract only — engineering detail in [`data-evaluation-plan.md`](data-evaluation-plan.md)).** The target replaces the labeled-fixture-fallback prototype (PRD-08, PRD-11) with a controlled, persisted, provenance-safe pipeline. Product-level behavior contract:

- **Request/refresh, not render-triggered.** Opening a screen never triggers satellite processing; measurement is an explicit request served by an idempotent controlled worker, and screens **read the persisted result** (ADR-06; [`project-architecture.md`](project-architecture.md) § 3 governing principle).
- **Provenance-complete persistence.** Every stored measurement carries acquisition window, polygon geometry, provider, quality flags, valid-pixel counts per index, and masking rule-set version (INV-03; [`project-architecture.md`](project-architecture.md) § 3 provenance contract).
- **Honest unavailable states.** When no quality-passing polygon-level observation exists for a field/window, the product shows an explicit `unavailable` state — replacing the labeled synthetic fixture fallback (INV-01/02/06; [`research-protocol.md`](research-protocol.md) § 8).
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

**Current-fidelity note.** The code computes the score in the **presentation layer** (`weather.tsx:541-576`). The 2026-07-27 UI now labels it “Indikator Risiko Cuaca (Prototipe),” “skor heuristik,” and HYP-07 with an explicit uncalibrated notice (`weather.tsx:694-730`). The point-21 revised thesis corrects the architecture description to match this placement. Calibration against local agronomic data is [Post-thesis] unless the advisor pulls it into scope.

---

## 4 · Out of scope · [OUT]

These are hard boundaries. Building or claiming any of them is a defect, regardless of stated purpose.

- **[OUT-01] No synthetic substitution — ever again.** Synthesized values are never presented as measured, and an observation surface never degrades into a synthetic one (INV-01/02; DEC-10/24). Production substitution is removed; M2 must preserve this invariant.
- **[OUT-02] No cadence promises before the feasibility study.** No weekly/biweekly/monthly (or any) monitoring-cadence claim in UI, copy, or docs until the Indonesia feasibility study supports it per site and season. Nominal revisit (EVID-006) is never the answer (INV-08; DEC-12; [`research-protocol.md`](research-protocol.md) § 4).
- **[OUT-03] No crop-health diagnosis or index severity classes.** HYP-04 and the former field-detail pest/disease/stress figures are retired, not merely caveated (INV-09; DEC-24).
- **[OUT-04] No Gemini as ground truth or research label.** LLM output never enters the measurement or labeling path, and is never a research label or ground truth (INV-07; ADR-05 / DEC-08).
- **[OUT-05] No Sentinel-1 without a separate scope decision.** SAR (EVID-017) measures backscatter, not NDVI/NDMI reflectance; it is a set-aside post-thesis contingency requiring its own scope decision, not current scope ([`context-dump.md`](context-dump.md) § 6).
- **[OUT-06] No paid-provider dependence in ordinary dev/CI.** Ordinary development and CI never call live satellite or paid providers; fixture-first only (ADR-09 / DEC-09). Live/paid calls are explicit, out-of-band acquisition runs.
- **[OUT-07] No claim of thesis-readiness today.** The current implementation is not thesis-ready and is never described as such ([`../AGENTS.md`](../AGENTS.md) honesty constraints).

---

## 5 · Acceptance summary and traceability

Milestones (from [`product-brief.md`](product-brief.md) § 4; roadmap in [`implementation-plan.md`](implementation-plan.md)): **M0** verification & security foundation · **M1** Indonesia feasibility study · **M2** provenance-complete measurement pipeline · **M3** research validation · **M4** post-thesis product hardening.

| PRD | Scope | Invariants | Decisions / ADRs | Milestone | Key files |
|-----|-------|-----------|------------------|-----------|-----------|
| PRD-01 Auth | [As-built] | INV-07 | DEC-03; EVID-020 | M0 (authz hardening) | `app/auth/login.tsx`, `app/auth/signup.tsx`, `hooks/supabase`, `supabase_setup.sql:268-295` |
| PRD-02 Splash/routing | [As-built] | — | DEC-03 | M0 | `app/index.tsx`, `app/splash.tsx:111-121` |
| PRD-03 Onboarding | [As-built] | — | — | M4 (wire or remove) | `app/onboarding.tsx` |
| PRD-04 Home weather card | [As-built] | INV-06 | ADR-04 / DEC-07; ADR-10 / DEC-20 | Implemented | `app/(tabs)/index.tsx`, `backend/api/weather/route.js` |
| PRD-05 Home field cards | [As-built] | INV-01, INV-03, INV-05, INV-09 | DEC-24 | M2 persistence | `app/(tabs)/index.tsx`, `constants/ndvi.ts` |
| PRD-06 Field map/draw/search | [As-built] | — | ADR-01 / DEC-03; EVID-019 | M0 (geometry limits) | `app/(tabs)/explore.tsx` (map, `:720` Nominatim, `:662,778` geocode) |
| PRD-07 Field creation/area | [As-built] | INV-03 | DEC-03; DEC-24 | M2 (equal-area) | `app/(tabs)/explore.tsx`, `supabase/migrations/20260821000100_padi_only_scope.sql` |
| PRD-08 Ladang NDVI cards | [As-built] | **INV-03, INV-04, INV-05, INV-06** | ADR-02/06/14; DEC-24 | **M2 persistence** | `app/(tabs)/explore.tsx`; arch § 2 |
| PRD-09 Edit/delete/notes | [As-built] | — | ADR-07; EVID-020 | M0 (RLS tests) | `app/(tabs)/explore.tsx:1463,1475,1508,1555`, `supabase_setup.sql` |
| PRD-10 AI data summary | [As-built] | INV-07, INV-09 | ADR-05/14; DEC-08/24 | Implemented; remains outside measurement | `app/(tabs)/explore.tsx`, `backend/config.js`, `backend/api/ai/route.js` |
| PRD-11 Field detail | [As-built] | **INV-03, INV-05, INV-06, INV-09** | ADR-06/14; DEC-24 | **M2 persistence** | `app/detail-lahan-page.tsx` |
| PRD-12 Weather | [As-built] | INV-06 | ADR-04 / DEC-07; ADR-10 / DEC-20; EVID-021 | Implemented provider path | `app/(tabs)/weather.tsx`, `backend/api/weather/route.js` |
| PRD-13 Education | [As-built] | — | — | — | `app/(tabs)/education.tsx`, `constants/education.ts:24`, `app/detail-education-page.tsx` |
| PRD-14 Notifications | [As-built] | INV-08 | DEC-12 | M4 (post-thesis) | `app/notifications.tsx` |
| PRD-15 Profile | [As-built] | — | DEC-20; EVID-020 | M0 | `app/(tabs)/profile.tsx` |
| PRD-16 Measurement pipeline | [Thesis] | **INV-01–INV-06, INV-08** | ADR-02/06/08/09; DEC-04/05/09/12 | **M1→M2→M3** | target — `research/`, backend worker; [`data-evaluation-plan.md`](data-evaluation-plan.md) |
| PRD-17 Weather risk score | [As-built] | INV-06 | DEC-16; HYP-07 | M4 (calibration post-thesis) | `app/(tabs)/weather.tsx:474-510` |

**Invariant coverage.** INV-01/02/06/09 hold because prototype/fixture surfaces are
explicitly labeled, missing data is never synthesized, and no health diagnosis is
derived. INV-03/04/05 remain unsatisfied on PRD-08/11 until PRD-16 persists
provenance-complete quality-gated measurements. INV-07 holds: Gemini is non-blocking and disabled by
default. INV-08 holds because no cadence claim is made; the fixture-only M1 run does not
license one. INV-09 holds because health/severity labels and diagnostic derivations are
absent from the observation surfaces.
