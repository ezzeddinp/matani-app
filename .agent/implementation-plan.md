# Matani · Implementation Plan

**Document type:** Implementation roadmap
**Audience:** The developer, thesis advisor, reviewers, and AI agents working in this repo
**Status:** Active
**Updated:** 2026-07-27
**Canonical for:** Milestone sequencing, milestone acceptance criteria, and the definition of done for thesis engineering work
**Companion documents:** [`project-architecture.md`](project-architecture.md), [`data-evaluation-plan.md`](data-evaluation-plan.md), [`research-protocol.md`](research-protocol.md), [`product-requirements.md`](product-requirements.md), [`evidence-register.md`](evidence-register.md), [`context-dump.md`](context-dump.md)

---

## How to read this document

This is the canonical **order of engineering work** for the Matani thesis. Read it this way:

- **Milestones are sequential gates, not parallel tracks.** M0 → M1 → M2 → M3 → M4. A later milestone assumes every earlier one has passed; starting it earlier means building on an unverified or dishonest foundation, which the sequencing rationale (end of document) exists to prevent.
- **A milestone is done only when *all* of its acceptance criteria pass** — each criterion is written to be concretely checkable (a command exits clean, a test proves a property, a request is rejected). A partially met milestone is not met.
- **This document owns *order and acceptance*, not the rules themselves.** The measurement contract lives in [`data-evaluation-plan.md`](data-evaluation-plan.md), the research standard in [`research-protocol.md`](research-protocol.md), the invariants and feature behavior in [`product-requirements.md`](product-requirements.md), the ADRs / trust boundaries / provider decisions in [`project-architecture.md`](project-architecture.md), and the decisions in [`context-dump.md`](context-dump.md). This roadmap cites those by ID and section; it never re-derives or restates them.
- **The documentation pass that produced this `.agent/` suite fixed nothing.** Writing these documents changed no code. The starting point for M0 is exactly the recorded debt in [`project-architecture.md`](project-architecture.md) § 7 (verification baseline) and § 5 (security risks) — a snapshot of debt, not a to-do already completed. Nothing in this repo is described as done except by linking that baseline.
- **No milestone may violate an invariant.** INV-01…INV-09 ([`product-requirements.md`](product-requirements.md) § 1) hold at every milestone boundary. The 2026-07-27 presentation hardening closes the prior INV-01/02 defect; the labeled production fixture fallback remains an explicit **INV-06 deviation** only until M2 removes it. No new violation may be introduced.

---

## M0 — Reproducible verification + security foundation

**Goal.** Turn the repository into a foundation that can be *trusted and re-run*: a clean clone verifies deterministically, the schema installs reproducibly, cross-user isolation is proven, and the backend rejects unauthenticated callers before it can spend a single unit of the developer's provider quota.

**Why it precedes the next.** Every later milestone runs code, migrations, and (in M1+) real provider calls against this base. Until lint/typecheck/tests are green and runnable, "it works" is unverifiable. Until the backend authenticates and rate-limits, opening the CDSE migration (M1) exposes the developer's quota and credentials to any caller who can reach the deployed proxy ([`project-architecture.md`](project-architecture.md) § 5.1). Security and verification are prerequisites to *any* live provider spend.

**Applied alignment hardening (2026-07-27; does not complete M0).** The duplicate
client-side Open-Meteo fallback was removed so provider data stays behind `/weather`;
`backend/index.ts` now mirrors the runtime route mounts; unsupported Profile statistics,
alert controls, and expertise claims now render as unavailable/preview; and AI summary
payloads/prompts preserve the input data state and forbid diagnosis/chemical directives
(DEC-20 / ADR-10). Authentication, rate limits, reproducible migrations, tests, CI, and
the Gemini disable flag remain open below.

**Work items.**

- **Finish the verification baseline** recorded in [`project-architecture.md`](project-architecture.md) § 7. The Expo SDK 57 upgrade resolved TS5098 and `npx tsc --noEmit` now passes; clear the remaining **40 lint errors and 11 warnings** under the current Expo ESLint preset without suppressing valid diagnostics or changing behavior.
- **Establish runnable checks.** Working `lint`, `typecheck`, and `test` commands plus a minimal test runner — there is currently no test script, no test file, and no CI ([`project-architecture.md`](project-architecture.md) § 7). Tests are fixture-first per ADR-09 / DEC-09.
- **Basic CI** (GitHub Actions) running install + lint + typecheck + tests, with **no live or paid provider calls** (ADR-09 / DEC-09; [`project-architecture.md`](project-architecture.md) § 6 CI row).
- **Replace `supabase_setup.sql` with versioned migrations** (ADR-07 / DEC-05): a `supabase/` layout (`config.toml`, `migrations/`, `tests/`, `seed.sql`). This retires the 388-line legacy file with its documented defects — duplicated table/policy/view/function blocks, non-rerunnable (owner-rights) policy statements, and the trigger-before-function ordering bug where `update_lahan_thumbnails_updated_at` (`supabase_setup.sql:76-78`) references `update_updated_at_column()` defined later (`:98-104`), so a clean single-run install fails ([`project-architecture.md`](project-architecture.md) § 7, § 4 ADR-07).
- **DB + RLS tests proving cross-user isolation** on every table (ADR-07; ethics/access requirement [`research-protocol.md`](research-protocol.md) § 14; EVID-020).
- **Verify and fix `lahan_with_info`** ([`project-architecture.md`](project-architecture.md) § 5.2): confirm against the live hosted Postgres version and the view's actual owner/definition whether it bypasses `lahan` RLS; recreate as `security_invoker = true` where supported, otherwise revoke `SELECT` / relocate exposed columns behind an RLS-checked path; lock the guarantee with the cross-user isolation tests above. This is a **high-priority authorization risk requiring verification**, not a confirmed breach.
- **Authenticate and rate-limit every backend route** — the full § 5.1 list ([`project-architecture.md`](project-architecture.md)): Supabase **JWT verification**, **per-user authorization**, **request-schema validation**, **polygon vertex + area limits**, **acquisition-window limits**, **per-user / per-endpoint rate limits**, **quota accounting**, **idempotency** (no concurrent duplicate jobs — foundation for ADR-06), **privacy-conscious structured logging**, and **sanitized client errors** (the NDVI handler currently echoes `err.message`, `backend/api/ndvi/utils.js:171-174`). Replace the current permissive `app.use(cors())` with no options (`backend/index.js:13`) and the auth-less route mounting (`backend/index.js:17-25`).
- **Gemini disable-by-default flag** (ADR-05 / DEC-08; INV-07): the `/ai/summary` route currently runs whenever `GOOGLE_GENERATIVE_AI_API_KEY` is present (`backend/api/ai/route.js:87`) with no off switch — add the config flag that makes it disabled by default and never load-bearing.
- **Provider configuration boundaries and quota observability**: config so provider keys and endpoints are supplied per environment (not inlined), and per-endpoint quota accounting is observable — the accounting hooks the CDSE adapter will consume in M1/M2 ([`data-evaluation-plan.md`](data-evaluation-plan.md) § 3).

**Acceptance criteria.**

- **Clean-clone verification passes**, reproducibly:
  - `npm install` at the root and in `backend/` both succeed.
  - Expo config resolves with placeholder env values (`app.config.ts` does not throw on absent real keys).
  - The backend starts, and the health/root endpoint (`backend/index.js:27`) responds.
  - A local Supabase instance applies **all migrations from an empty database**, and a **reset + reapply** cycle succeeds (idempotent, ordered, no trigger-before-function failure).
  - RLS, view (`lahan_with_info`), geometry, and trigger tests pass.
  - TypeScript DB types are generated from the migrated schema.
- **CI is green** on the above, with no live/paid provider call in the workflow.
- **Unauthenticated backend requests are rejected**: a request without a valid Supabase JWT to `/ndvi`, `/weather`, or `/ai/summary` fails authorization (proven by test); a caller cannot spend provider quota without authenticating; rate limits and schema/geometry/window validation reject out-of-bounds requests; no raw provider response or stack trace reaches the client.
- The Gemini route is **off unless explicitly enabled**, and the app functions with it absent (INV-07).

**Explicitly out of scope for M0.** No CDSE migration or any live satellite call (that is M1); no change to measurement provenance or removal of the labeled fixture fallback (that is M2 — the 2026-07-27 work changed presentation only, not what the path measures); no screen refactors or dependency pruning (M4); no research analysis. M0 hardens and verifies the *existing* behavior.

---

## M1 — Indonesia feasibility + measurement contract

**Goal.** Answer, with evidence, **what monitoring cadence is defensible for representative Indonesian smallholder sites** — before building the pipeline that would otherwise invent one — and finalize the engineering measurement contract so M2 builds against a settled specification.

**Why it precedes the next.** A cadence claim made before this study is fabricated (INV-08 / OUT-02; DEC-12; [`research-protocol.md`](research-protocol.md) § 4). Building the persisted pipeline (M2) before the contract's open decisions are resolved would bake ad-hoc choices into a migration. The feasibility study also re-confirms CDSE is fit for purpose (quota) before M2 commits to it. Feasibility precedes pipeline so that cadence and capacity are *measured*, never assumed.

**Work items.**

- **CDSE account + OAuth credentials** (ADR-02 / DEC-04): register a CDSE Sentinel Hub free-tier OAuth client (new `client_id` + `client_secret`, CDSE token + statistics endpoints) — a real credential + endpoint migration off commercial `services.sentinel-hub.com`, not a URL swap ([`project-architecture.md`](project-architecture.md) § 1.2, ADR-02).
- **Execute the 12-month representative-site availability study exactly as specified** in [`research-protocol.md`](research-protocol.md) § 4 (design, per-field/site measures, outcome) over the candidate regions of § 3. This roadmap does not restate the measure list — it is owned there. Quality is assessed at the **polygon level, not tile level** (§ 8), consistent with the OBS-01 caveat.
- **Build the study in the Python research workspace** (`research/` layout per [`project-architecture.md`](project-architecture.md) § 3): notebooks stay thin and call tested functions in `research/src/matani_rs/`; the study runs as scoped, out-of-band acquisition (ADR-09 — live calls never wired into default CI).
- **Resolve the [`data-evaluation-plan.md`](data-evaluation-plan.md) § 9 open engineering decisions as recorded ADR updates**: (1) **physical schema** for the measurement record, (2) **worker runtime** (Vercel-compatible job strategy vs external runner, bounded by Vercel Hobby limits — [`project-architecture.md`](project-architecture.md) § 6), (3) **geometry-hash definition** (canonical normalization, CRS, precision, buffer inside/outside the hash), and (4) **masking-config versioning scheme**. Each is decided and written down as an ADR update, not silently resolved inside code.
- **Confirm CDSE quota suitability** — recheck EVID-010 at source (perishable) and validate it against the study's measured request/PU consumption (ADR-02 revisit trigger; [`data-evaluation-plan.md`](data-evaluation-plan.md) § 3 quota accounting).

**Acceptance criteria.**

- A **feasibility report** exists with **per-site availability metrics** as required by [`research-protocol.md`](research-protocol.md) § 4 (usable observations/month, median and longest gap, wet- vs dry-season split, polygon-level cloud/shadow fraction, per-index valid-pixel counts, PU accounting).
- A **defensible cadence determination** is recorded — weekly / biweekly / monthly / event-based, stated per location and season, and **possibly differing across sites**. **A negative or non-uniform result is a valid outcome** (HYP-01 permits "no single fixed cadence is defensible nationwide"); it licenses (or withholds) any cadence claim elsewhere per INV-08.
- The **provenance schema and processing contract are finalized and reviewed**: the § 9 open decisions are closed as ADR updates, and the logical required-fields list ([`data-evaluation-plan.md`](data-evaluation-plan.md) § 5) has a concrete physical realization ready to migrate in M2.
- **Quality thresholds are recorded as HYP** (the reliability floors, severity bands HYP-04, rice-water rule HYP-05) pending M3 evaluation — registered, not asserted as validated.
- CDSE quota is confirmed sufficient for the study against a freshly rechecked EVID-010, or the ADR-02 revisit trigger is invoked and recorded.

**Explicitly out of scope for M1.** No production persistence of measurements into the app (M2); no removal of the labeled fixture fallback or claim that PRD-08/PRD-11 are measured surfaces (M2 — the study runs retrospectively in `research/`, not through the app's live path); no ground-truth agreement analysis or hypothesis evaluation (M3); no cadence claim written into product UI/copy until the outcome above licenses it.

---

## M2 — Real persisted measurement pipeline

**Goal.** Replace the labeled-fixture-fallback prototype with a **controlled, persisted, provenance-safe pipeline**: measurements are requested (never render-triggered), computed over the real field polygon, quality-gated, persisted with full provenance, and shown with acquisition date and quality — or shown as an honest `unavailable` state. This removes the remaining INV-06 deviation and makes INV-03/04/05 concretely satisfiable.

**Why it precedes the next.** M3's research validation consumes **persisted, provenance-complete measurements** ([`data-evaluation-plan.md`](data-evaluation-plan.md) § 8) — there is nothing to validate until they exist and carry the provenance that makes `measured` reproducible and distinguishable from `unavailable` and synthetic. The pipeline must exist and be honest before its outputs can be analyzed.

**Work items.**

- **CDSE provider adapter** with the stable internal contract, error taxonomy, and quota hooks ([`data-evaluation-plan.md`](data-evaluation-plan.md) § 3; ADR-08) — provider swap without semantic change.
- **Actual field polygon, never a bbox** ([`data-evaluation-plan.md`](data-evaluation-plan.md) § 2; [`research-protocol.md`](research-protocol.md) § 7): statistics computed over the drawn geometry, closing the as-built bbox / hard-coded Jakarta fallback defect (`backend/api/ndvi/utils.js:49`).
- **Dynamic acquisition windows**: caller-supplied, policy-bounded, replacing the fixed 2025-09-01 → 2025-09-05 window (`backend/api/ndvi/utils.js:65-77`).
- **Versioned SCL-based cloud/shadow/invalid-pixel masking** ([`data-evaluation-plan.md`](data-evaluation-plan.md) § 4; [`research-protocol.md`](research-protocol.md) § 8), including the **HYP-05 rice-water rule** (no blanket water masking inside padi polygons), using the masking-config versioning scheme decided in M1.
- **Explicit resolution / resampling**: NDVI at 10 m (B04/B08) and NDMI with B11 at 20 m native, resampling method recorded, **no claim of upsampled detail** (EVID-009; [`research-protocol.md`](research-protocol.md) § 9).
- **Persist measurements + provenance** — all § 5 required fields ([`data-evaluation-plan.md`](data-evaluation-plan.md)), via a versioned migration (ADR-07) using the physical schema decided in M1.
- **Idempotent controlled acquisition via the worker boundary** (ADR-06; [`data-evaluation-plan.md`](data-evaluation-plan.md) § 6): cache identity = geometry hash + acquisition window + processing-config version; no concurrent duplicate jobs; new acquisitions extend history, reprocessing under a new config version creates new records without overwriting old provenance.
- **Remove labeled synthetic fixture substitution.** The 2026-07-27 presentation hardening makes fixture/prototype states visible but does not make them measurements. M2 replaces substitution with the pass-or-reject-or-unavailable rule ([`data-evaluation-plan.md`](data-evaluation-plan.md) § 2, § 4): a measurement passes and is persisted, is recorded rejected with an enumerated reason, or is `unavailable`. This fixes the remaining INV-03/04/05/06 gaps at PRD-08 and PRD-11 ([`product-requirements.md`](product-requirements.md) § 1, PRD-08, PRD-11).
- **Characterization tests BEFORE removing `utils/ndvi-simulator.ts`**: capture current labeled-fixture behavior of PRD-08/PRD-11, then delete `utils/ndvi-simulator.ts` and `createSyntheticNdviRecord` / `buildNdviSeries` from production paths (`app/(tabs)/explore.tsx:1181,1445-1462`, `app/detail-lahan-page.tsx:166`).
- **Retain labeled fixtures only for tests / demo mode** — the 12-fixture set ([`data-evaluation-plan.md`](data-evaluation-plan.md) § 7), always labeled test data, never presented as measured (DEC-10).
- **Wire the `lahan_health` successor** so the home field cards (PRD-05) render real persisted measurements: today nothing writes measurement rows, so the honest-by-construction home cards show the unavailable state ([`product-requirements.md`](product-requirements.md) PRD-05 current-fidelity note). Whether the record extends or supersedes `lahan_health` follows the M1 physical-schema decision.
- **Gemini stays optional and disabled by default** (ADR-05; the flag from M0), never entering the measurement or labeling path (OUT-04).

**Acceptance criteria.**

- **No production fixture substitution remains** — INV-01/02/06 enforced by tests: no production import of `utils/ndvi-simulator.ts`; no surface substitutes a synthesized record on empty/missing/errored results; `utils/ndvi-simulator.ts` is deleted from production paths.
- **Every displayed measurement shows its acquisition date and quality**: the date is the satellite observation date (INV-05), per-index valid-pixel/quality state is visible (INV-04), and every stored value is reproducible from its provenance (INV-03).
- A field with **no quality-passing observation shows an honest `unavailable` state** (INV-06), never a fabricated number; rejections carry an enumerated reason ([`data-evaluation-plan.md`](data-evaluation-plan.md) § 4).
- **The fixture-first test suite is green without network** (ADR-09); an equivalent measurement request is idempotent (proven by the cache-identity uniqueness test).
- A **live smoke check** exists that is bounded to known test polygons + short date ranges, quota-counted, and kept out of default CI (ADR-09; [`data-evaluation-plan.md`](data-evaluation-plan.md) § 7).
- No cadence claim appears in product UI/copy beyond what M1 licensed (INV-08).

**Explicitly out of scope for M2.** No hypothesis evaluation, agreement metrics, or ground-truth analysis (M3); no removal of pest/disease/stress "diagnosis" beyond what INV-09/OUT-03 already forbid being shown as measurement (re-scoping the PRD-11 derived figures is done here only to the extent required to stop presenting non-measurements as measurements); no large-screen refactor or dependency pruning (M4); no Sentinel-1 (OUT-05).

---

## M3 — Research validation

**Goal.** Run the evaluation and **answer the research questions** — evaluate each hypothesis against its falsification criterion using the persisted measurements and available ground truth, and produce thesis-ready, reproducible analysis artifacts.

**Why it precedes the next.** The thesis is the point; product hardening (M4) is explicitly post-thesis. Validation must complete before effort moves to non-thesis polish, and it can only run on the honest, persisted measurements M2 produces.

**Work items.**

- **Execute [`research-protocol.md`](research-protocol.md) § 5–§ 13**: ground-truth collection (§ 5, honestly team-bounded — DEC-17), spatial/temporal alignment (§ 7), quality/masking application (§ 8), small-field and resolution analysis (§ 9), topography/mixed-cropping treatment (§ 10), missing-data policy (§ 11), agreement metrics + uncertainty/CIs respecting clustering (§ 12), and crop/phenology-stage stratification (§ 13).
- **Evaluate HYP-01 / HYP-02 / HYP-03 / HYP-04 / HYP-05 / HYP-06** against their explicit falsification criteria ([`research-protocol.md`](research-protocol.md) § 12), including the API-vs-independent raster comparison (HYP-02 / RQ2) computed over identical geometry/acquisition/masking ([`data-evaluation-plan.md`](data-evaluation-plan.md) § 8). HYP-06/RQ4 are contingent on advisor approval and ground-truth feasibility and may be reported as exploratory or dropped.
- **Produce reproducible tables and figures** from `research/`: notebooks call tested `src/matani_rs/` functions; outputs are generated artifacts, not hand-built.
- **Document threats to validity** ([`research-protocol.md`](research-protocol.md) § 15), including OBS-01 non-generalizability, non-random cloud-driven missingness, and perishable-provider risk.

**Acceptance criteria.**

- **Each hypothesis is explicitly confirmed / refuted / inconclusive** with the evidence and the pre-registered criterion that decided it ([`research-protocol.md`](research-protocol.md) § 12) — a "cannot determine" outcome is reported as such, with the reason.
- **Thesis-ready analysis artifacts are reproducible from dataset snapshots + checksums** ([`data-evaluation-plan.md`](data-evaluation-plan.md) § 8): re-running the notebooks against the same identified snapshot reproduces the reported tables and figures.
- All per-estimate uncertainty respects clustering ([`research-protocol.md`](research-protocol.md) § 2, § 12); reporting is per-stratum by default, and no pooled headline replaces its per-stratum breakdown.
- No LLM output is used as ground truth or a research label anywhere in the analysis (OUT-04 / ADR-05).

**Explicitly out of scope for M3.** No product refactor, dependency pruning, SDK upgrade, or design-token work (M4); no Sentinel-1 (OUT-05, requires its own scope decision); no new feature surfaces — M3 analyzes what M2 produced, it does not extend the pipeline.

---

## M4 — Product hardening [Post-thesis]

**Goal.** With the thesis complete, pay down product debt **behavior-preservingly**: decompose oversized screens, prune dead code and boilerplate, centralize design tokens, and address field-resilience and optional-UX polish.

**Why it precedes the next.** There is no next milestone — M4 is the terminal, explicitly post-thesis hardening pass. It follows M3 because none of it is thesis-load-bearing, and doing it earlier would churn code the thesis milestones are still changing.

**Work items.**

- **Break large screens into behavior-preserving boundaries**: `app/(tabs)/explore.tsx` (~3.7k lines), `app/(tabs)/index.tsx` (~2.4k), `app/detail-lahan-page.tsx` (~1.6k) — guarded by characterization tests so behavior is unchanged.
- **Remove remaining dead boilerplate**: the unused frontend-only Turf, Express, node-fetch, and AI SDK dependencies are already removed; the remaining Expo starter candidates are tracked in [`design-guidelines.md`](design-guidelines.md) § 6 (§ 6.3 — `app/modal.tsx`, unused `constants/theme.ts`, `expo-font`, and the `ThemedText` / `ThemedView` refactor-out), falling back to [`project-architecture.md`](project-architecture.md) § 8 for the repo-structure view.
- **Formalize design tokens** ([`design-guidelines.md`](design-guidelines.md)): unify the inconsistent brand green, tokenize the sampled type scale / spacing / radius, and fix the recorded contrast issues — centralized rather than hardcoded per screen.
- **Future Expo SDK maintenance** — keep framework upgrades separate from behavior-preserving refactors and validate them against characterization tests.
- **Offline / field-test resilience** for real field use.
- **Review optional Gemini UX** (still disabled by default, never ground truth — ADR-05).
- **Sentinel-1** only via a **separate thesis-scope decision** (OUT-05; [`context-dump.md`](context-dump.md) § 6) — SAR measures backscatter, not NDVI/NDMI reflectance, so it is a contingency, not a drop-in.
- **On-device ML** (e.g., quantized LiteRT camera-based leaf/pest classification) only via a **separate scope decision** (DEC-18). Satellite index computation stays server-side (DEC-18); on-device inference is reserved for phone-sensor features and never enters the measurement path.
- **Wire or remove the orphaned onboarding screen** (PRD-03) — a product decision, not a defect.

**Acceptance criteria.**

- **Behavior is unchanged**, proven by characterization tests written before each refactor and passing after.
- **Dependencies remain pruned**: unused frontend packages do not return, and the remaining boilerplate candidates are eliminated or refactored out without changing behavior.
- **Design tokens are centralized**: brand green, type scale, spacing, and radius come from a single token source, and the recorded contrast issues are resolved.

**Explicitly out of scope for M4.** Any behavior change presented as hardening; any Sentinel-1 work without its own scope decision (OUT-05); any reintroduction of a synthetic-as-measured path (OUT-01); any cadence claim beyond what M1 licensed (OUT-02).

---

## Thesis-paper evaluation mapping (DEC-14)

The thesis paper's system-evaluation track ([`research-protocol.md`](research-protocol.md) § 16) maps onto the milestones rather than adding new ones:

- **Functional testing + API response testing** → the M0 test/CI foundation (fixture-first, ADR-09) and the M2 pipeline tests. Functional tests of satellite surfaces must record which data state (fixture/prototype/measured/unavailable) they exercised.
- **Conceptual validation** (index ranges vs known rice phenology) → M2 acceptance checks and M3 analysis; it is a plausibility check, never a substitute for § 12 validation.
- **UAT** → M3, alongside research validation; it evaluates usability/comprehension, not measurement validity.
- The paper's rice scope (DEC-15) narrows M1/M3 strata to padi; the weather risk heuristic (HYP-07 / DEC-16) is documented, not calibrated, within thesis scope.

## Sequencing rationale

- **Security and verification before any live provider spend.** M0 comes first because opening the CDSE migration (M1) or running acquisition (M2) against an unauthenticated, un-rate-limited, un-quota-accounted backend ([`project-architecture.md`](project-architecture.md) § 5.1) exposes the developer's credentials and quota to any caller. A reproducible clean-clone verification and a reproducible schema (§ 7, ADR-07) are the base every later milestone is measured against.
- **Feasibility before pipeline, so cadence claims are never invented.** M1 measures the defensible cadence for representative Indonesian sites before M2 builds the pipeline — because a cadence promised from nominal revisit (EVID-006) rather than from measured usable-observation rates is fabricated (INV-08 / OUT-02; DEC-12; [`research-protocol.md`](research-protocol.md) § 4). M1 also settles the § 9 open decisions so M2 migrates against a finalized contract.
- **Validation before hardening, because the thesis is the point.** M3 evaluates the hypotheses on the honest, persisted measurements M2 produces; M4 is explicitly post-thesis. Effort reaches product polish only after the research contribution is delivered.

## Standing rules

- **Every milestone updates the canonical documents it invalidates.** A change that makes a canonical claim stale ships with the document update — the AGENTS.md "documentation updates are part of done" ritual ([`../AGENTS.md`](../AGENTS.md) § Working rules). A claim lives in exactly one canonical home; this roadmap links, it does not duplicate.
- **No milestone may violate INV-01…INV-09.** The invariants ([`product-requirements.md`](product-requirements.md) § 1) hold at every milestone boundary. The labeled production fixture fallback is the only recorded INV-06 deviation and only until M2 removes it; introducing any new violation is a defect, not debt.
- **The rotation / restriction gate must be completed by the developer before M0 backend work begins.** The rotation ledger in [`project-architecture.md`](project-architecture.md) § 5.3 — rotating the Sentinel Hub, Gemini, and AccuWeather server-side secrets, reissuing the Sentinel credential as a CDSE OAuth client (ADR-02), restricting the Google Maps keys per-platform and per-API, and verifying the Supabase key class — is a developer action that precedes touching the backend in M0. Historically committed secrets remain sensitive (no git-history rewrite; DEC-13); rotation, not history surgery, is the control.
