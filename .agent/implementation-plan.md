# Matani · Implementation Plan

**Document type:** Implementation roadmap
**Audience:** The developer, thesis advisor, reviewers, and AI agents working in this repo
**Status:** Active
**Updated:** 2026-08-30
**Canonical for:** Milestone sequencing, milestone acceptance criteria, and the definition of done for thesis engineering work
**Companion documents:** [`project-architecture.md`](project-architecture.md), [`data-evaluation-plan.md`](data-evaluation-plan.md), [`research-protocol.md`](research-protocol.md), [`product-requirements.md`](product-requirements.md), [`evidence-register.md`](evidence-register.md), [`context-dump.md`](context-dump.md)

---

## How to read this document

This is the canonical **order of engineering work** for the Matani thesis. Read it this way:

- **Milestones are sequential gates, not parallel tracks.** M0 → M1 → M2 → M3 → M4. A later milestone assumes every earlier one has passed; starting it earlier means building on an unverified or dishonest foundation, which the sequencing rationale (end of document) exists to prevent.
- **A milestone is done only when *all* of its acceptance criteria pass** — each criterion is written to be concretely checkable (a command exits clean, a test proves a property, a request is rejected). A partially met milestone is not met.
- **This document owns *order and acceptance*, not the rules themselves.** The measurement contract lives in [`data-evaluation-plan.md`](data-evaluation-plan.md), the research standard in [`research-protocol.md`](research-protocol.md), the invariants and feature behavior in [`product-requirements.md`](product-requirements.md), the ADRs / trust boundaries / provider decisions in [`project-architecture.md`](project-architecture.md), and the decisions in [`context-dump.md`](context-dump.md). This roadmap cites those by ID and section; it never re-derives or restates them.
- **The original documentation pass fixed no code; later implementation did.** The
  historical baseline remains in [`project-architecture.md`](project-architecture.md)
  § 7, while the dated execution-status block below is authoritative for current gate
  progress. A claim is complete only when it cites current verification evidence.
- **No milestone may violate an invariant.** INV-01…INV-09 ([`product-requirements.md`](product-requirements.md) § 1) hold at every milestone boundary. DEC-24 removed the production fixture substitution and interpretive health labels before M2; this is an honesty/scope correction, not a claim that M2 measurement persistence exists. No new violation may be introduced.

**Execution status (2026-08-28).**

- **M0: current local/hosted gates pass; current remote CI and external credential
  confirmation remain.**
  The 2026-08-28 audit re-verified scoped lint, root and backend type-checks, 7/7 root
  tests, and 26/26 backend tests (OBS-17). The Python research suite could not be re-run
  because Python 3 is absent on the audit workstation; its earlier result is historical.
  Protected backend routes, disabled-by-default
  Gemini, clean DB reset/reapply, pgTAP, generated types, placeholder Expo config, and
  two earlier green remote `Verify` runs pass (OBS-02/08). The linked hosted project was audited,
  reconciled with an incremental migration, and re-audited: 48 field rows remain, the
  tested compatibility defects are zero, all operational tables have RLS enabled,
  `lahan_with_info` uses `security_invoker`, hosted pgTAP passes 10/10, and migration
  history is synchronized (OBS-10). Because this unit changes code, migrations, tests,
  and the workflow, it needs a new green `Verify` run after push; the earlier runs do not
  cover this delta. The local environment-boundary audit confirms server provider keys
  are not stored in the client env, but cannot classify the backend Supabase credential
  as a recognized publishable/anon format. Formal M0 closure therefore still requires
  the developer's platform-side confirmation that the backend key is non-privileged,
  historically exposed server credentials were revoked or absent, and Google Maps keys
  are platform/API restricted as specified in § 5.3 of `project-architecture.md`; no
  secret values belong in this evidence. Current remote CI remains unverified.
- **M1: PASS — closed under `M1-CLOSURE-2026-08-30` (DEC-30).**
  A valid CDSE OAuth client, CDSE endpoints, exact-polygon UTM metre grids, versioned SCL
  masking, separate NDVI/NDMI pixel accounting, bounded retry, and request/PU accounting
  are proven for `hi` and `sszs` (OBS-11). A checkpointed 12-month run completed 24/24
  field-months and 72 successful calls (OBS-12). The approved Teluknaga run subsequently
  completed 12/12 field-months and produced OBS-19.
  DEC-27 records the advisor's dated WhatsApp approval for Teluknaga, Banten as the single
  thesis study region and provisional valid-pixel floors of 9 NDVI / 3 NDMI. This amends
  the former multi-region expectation for the available thesis timeline while explicitly
  limiting every result and cadence statement to Teluknaga and its wet/dry labels. DEC-26
  keeps independent raster comparison outside M1 and active thesis acceptance.
  The 2026-08-28 implementation removes the study runner's former two-field limit and
  adds a tested `m1-study-input-v1` remote-assisted manifest, dynamic request/retry
  budgeting, no-network preflight, verification declaration gates, site-specific monthly
  season labels, and field plus site × season reporting. This makes the approved-input
  study executable. The ignored private manifest now contains one evidence-backed padi
  field, site-specific BMKG labels, approved scope, and approved provisional floors, and
  its no-network preflight passes. This does not independently prove the private evidence,
  supply exact Statistical API mosaic-selection provenance, or produce a cadence outcome. The
  current CDSE quota was rechecked (EVID-010), and the approved run totals are within that
  allowance. The advisor relayed approval of the final RQ1/RQ3 wording on 2026-08-30 (DEC-29).
  The synchronized worktree passes the complete local verification chain (OBS-21), and
  the canonical/Notion review record is complete. M1 acceptance is therefore closed by
  DEC-30. This does not close M0's remote-CI and external credential/platform controls;
  those remain prerequisite project gates before production M2 deployment.
- **M2: implementation complete locally; formal PASS blocked by hosted deployment.**
  The exact-polygon/native-grid Process adapter, strict source matching, SCL quality
  pipeline, durable job/provenance schema, privileged RPCs, RLS read view, authenticated
  worker route, and mobile request/read/detail flow are implemented (DEC-31). Empty-DB
  migration plus 26/26 pgTAP, generated DB types, fixture suites, lint/type-check, and the
  bounded live Teluknaga adapter smoke pass (OBS-22/23). M2 is not marked PASS because the
  CLI is not linked to hosted Supabase, the migration is not confirmed hosted, no backend
  Supabase admin key/CDSE secret deployment is available locally, the last configured
  backend was Vercel-protected (OBS-16), and no authenticated physical-app job has yet
  persisted/read a hosted measurement.

---

## M0 — Reproducible verification + security foundation

**Goal.** Turn the repository into a foundation that can be *trusted and re-run*: a clean clone verifies deterministically, the schema installs reproducibly, cross-user isolation is proven, and the backend rejects unauthenticated callers before it can spend a single unit of the developer's provider quota.

**Why it precedes the next.** Every later milestone runs code, migrations, and (in M1+) real provider calls against this base. Until lint/typecheck/tests are green and runnable, "it works" is unverifiable. Until the backend authenticates and rate-limits, opening the CDSE migration (M1) exposes the developer's quota and credentials to any caller who can reach the deployed proxy ([`project-architecture.md`](project-architecture.md) § 5.1). Security and verification are prerequisites to *any* live provider spend.

**Local implementation update (2026-07-28; gate status above remains authoritative).**
The backend now verifies Supabase access tokens before provider quota admission, applies
origin/request/rate/idempotency guards, sanitizes failures, and defaults Gemini off.
Mobile provider calls attach the session token. Versioned Supabase migrations, pgTAP
isolation tests, test commands, and fixture-only CI replace the previous missing
foundation (ADR-05/07/10/11; CODE).

**Work items.**

- **Finish the verification baseline** recorded historically in
  [`project-architecture.md`](project-architecture.md) § 7. The 2026-07-28 local run has
  zero lint errors/warnings and a clean root type-check; keep those gates clean.
- **Maintain runnable checks.** `lint`, `typecheck`, application artifact tests, backend
  security tests, research tests, and database tests are fixture-first per ADR-09 /
  DEC-09.
- **Maintain fixture-only CI** in GitHub Actions for install, lint, type-check, and tests,
  with no live or paid provider calls (ADR-09 / DEC-09). Every new code delta still
  requires its own green remote run; historical runs do not cover it.
- **Maintain versioned Supabase migrations and DB tests** (ADR-07 / DEC-05). The active
  installation path is `supabase/migrations/`; `supabase_setup.sql` remains historical
  input and must not return to the install path. Clean reset/reapply and pgTAP evidence
  must be refreshed when schema behavior changes.
- **Maintain cross-user RLS isolation** on every operational table and the
  `security_invoker` contract for `lahan_with_info`. Local/hosted evidence is OBS-10;
  it is dated and must be re-audited after relevant schema or policy changes.
- **Maintain the protected provider boundary** described in
  [`project-architecture.md`](project-architecture.md) § 5.1: Supabase JWT verification,
  per-user authorization, request bounds, per-user/per-endpoint rate limits,
  duplicate-request suppression, an origin allowlist, structured logging, and sanitized
  errors are implemented and covered by backend tests. Quota accounting remains part of
  the measurement worker/provider contract rather than a claim that production
  persistence exists.
- **Gemini disable-by-default flag** (ADR-05 / DEC-08; INV-07): retain the applied
  `AI_SUMMARY_ENABLED=false` default and its regression test.
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

**Explicitly out of scope for M0.** No CDSE measurement-worker migration or live study run; no claim that legacy/transient values are measured; no research analysis. DEC-24's removal of synthetic substitution and health interpretation is already complete as an invariant repair, while the exact-polygon quality/persistence work remains M2.

---

## M1 — Indonesia feasibility + measurement contract

**Goal.** Answer, with evidence, **what monitoring cadence is defensible for the advisor-approved Teluknaga site in wet and dry months** — before building the pipeline that would otherwise invent one — and finalize the engineering measurement contract so M2 builds against a settled specification. DEC-27 forbids generalizing this constrained result to Indonesia as a whole.

**Why it precedes the next.** A cadence claim made before this study is fabricated (INV-08 / OUT-02; DEC-12; [`research-protocol.md`](research-protocol.md) § 4). Building the persisted pipeline (M2) before the contract's open decisions are resolved would bake ad-hoc choices into a migration. The feasibility study also re-confirms CDSE is fit for purpose (quota) before M2 commits to it. Feasibility precedes pipeline so that cadence and capacity are *measured*, never assumed.

**Work items.**

- **CDSE account + OAuth credentials** (ADR-02 / DEC-04): register a CDSE Sentinel Hub free-tier OAuth client (new `client_id` + `client_secret`, CDSE token + statistics endpoints) — a real credential + endpoint migration off commercial `services.sentinel-hub.com`, not a URL swap ([`project-architecture.md`](project-architecture.md) § 1.2, ADR-02).
- **Execute the 12-month Teluknaga availability study exactly as specified** in [`research-protocol.md`](research-protocol.md) § 4 (design, per-field/site measures, outcome) over the approved region of § 3. This roadmap does not restate the measure list — it is owned there. Quality is assessed at the **polygon level, not tile level** (§ 8), consistent with the OBS-01 caveat, and results remain site-specific under DEC-27.
- **Build the study in the Python research workspace** (`research/` layout per [`project-architecture.md`](project-architecture.md) § 3): notebooks stay thin and call tested functions in `research/src/matani_rs/`; the study runs as scoped, out-of-band acquisition (ADR-09 — live calls never wired into default CI).
- **Maintain the closed [`data-evaluation-plan.md`](data-evaluation-plan.md) § 9 engineering decisions** recorded in DEC-21 / ADR-12: typed measurement/per-index records, external Node worker, canonical geometry hash, and explicit processing versions. Reopen them only through an ADR amendment.
- **Confirm CDSE quota suitability** — recheck EVID-010 at source (perishable) and validate it against the study's measured request/PU consumption (ADR-02 revisit trigger; [`data-evaluation-plan.md`](data-evaluation-plan.md) § 3 quota accounting).
- **Operate the closure checklist** in [`../docs/m1-closure-runbook-2026-08-28.md`](../docs/m1-closure-runbook-2026-08-28.md); it is an operator aid, while this roadmap and the research protocol remain canonical.

**Acceptance criteria.**

- A **feasibility report** exists with **per-site availability metrics** as required by [`research-protocol.md`](research-protocol.md) § 4 (usable observations/month, median and longest gap, wet- vs dry-season split, polygon-level cloud/shadow fraction, per-index valid-pixel counts, PU accounting).
- A **defensible cadence determination** is recorded — weekly / biweekly / monthly / event-based, stated for Teluknaga separately by wet/dry season. **A negative or non-uniform result is a valid outcome**; it licenses (or withholds) a Teluknaga-specific cadence claim elsewhere per INV-08 and never a national claim (DEC-27).
- The **provenance schema and processing contract are finalized and reviewed**: the § 9 open decisions are closed as ADR updates, and the logical required-fields list ([`data-evaluation-plan.md`](data-evaluation-plan.md) § 5) has a concrete physical realization ready to migrate in M2.
- **Quality parameters are recorded honestly:** the 9/3 values are provisional operational floors for the approved study, not universal thresholds; HYP-05 remains pending field validation. HYP-03's former cross-field size-effect claim is inactive after DEC-29, and HYP-04 remains retired.
- CDSE quota is confirmed sufficient for the study against a freshly rechecked EVID-010, or the ADR-02 revisit trigger is invoked and recorded.

**Explicitly out of scope for M1.** No production persistence of measurements into the app (M2); no claim that PRD-08/PRD-11 are measured surfaces; no ground-truth agreement analysis or hypothesis evaluation (M3); no cadence claim written into product UI/copy until the outcome above licenses it. Synthetic substitution is already removed under DEC-24.
Independent raster comparison is not an M1 acceptance criterion (DEC-26).

---

## M2 — Real persisted measurement pipeline

**Goal.** Replace the transient bbox prototype with a **controlled, persisted, provenance-safe pipeline**: measurements are requested (never render-triggered), computed over the real field polygon, quality-gated, persisted with full provenance, and shown with acquisition date and quality — or shown as an honest `unavailable` state. DEC-24 already removed synthetic substitution; M2 makes INV-03/04/05 concretely satisfiable.

**Why it precedes the next.** M3's research validation consumes **persisted, provenance-complete measurements** ([`data-evaluation-plan.md`](data-evaluation-plan.md) § 8) — there is nothing to validate until they exist and carry the provenance that makes `measured` reproducible and distinguishable from `unavailable` and synthetic. The pipeline must exist and be honest before its outputs can be analyzed.

**Work items.**

- **CDSE provider adapter** with the stable internal contract, error taxonomy, and quota hooks ([`data-evaluation-plan.md`](data-evaluation-plan.md) § 3; ADR-08) — provider swap without semantic change.
- **Actual field polygon, never a bbox** ([`data-evaluation-plan.md`](data-evaluation-plan.md) § 2; [`research-protocol.md`](research-protocol.md) § 7): statistics computed over the drawn geometry, closing the as-built bbox / hard-coded Jakarta fallback defect (`backend/api/ndvi/utils.js:49`).
- **Dynamic acquisition windows**: caller-supplied, policy-bounded, replacing the fixed 2025-09-01 → 2025-09-05 window (`backend/api/ndvi/utils.js:65-77`).
- **Versioned SCL-based cloud/shadow/invalid-pixel masking** ([`data-evaluation-plan.md`](data-evaluation-plan.md) § 4; [`research-protocol.md`](research-protocol.md) § 8), including the **HYP-05 rice-water rule** (no blanket water masking inside padi polygons), using the masking-config versioning scheme decided in M1.
- **Explicit resolution / resampling**: NDVI at 10 m (B04/B08) and NDMI with B11 at 20 m native, resampling method recorded, **no claim of upsampled detail** (EVID-009; [`research-protocol.md`](research-protocol.md) § 9).
- **Persist measurements + provenance** — all § 5 required fields ([`data-evaluation-plan.md`](data-evaluation-plan.md)), via a versioned migration (ADR-07) using the physical schema decided in M1.
- **Idempotent controlled acquisition via the worker boundary** (ADR-06; [`data-evaluation-plan.md`](data-evaluation-plan.md) § 6): cache identity = geometry hash + acquisition window + processing-config version; no concurrent duplicate jobs; new acquisitions extend history, reprocessing under a new config version creates new records without overwriting old provenance.
- **Preserve the completed no-substitution invariant.** DEC-24 deleted `utils/ndvi-simulator.ts` and production imports; M2 retains the pass-or-reject-or-unavailable rule while replacing transient prototype output with persisted quality decisions ([`data-evaluation-plan.md`](data-evaluation-plan.md) § 2, § 4).
- **Retain labeled fixtures only for tests / demo mode** — the 12-fixture set ([`data-evaluation-plan.md`](data-evaluation-plan.md) § 7), always labeled test data, never presented as measured (DEC-10).
- **Wire the `lahan_health` successor** so cards/detail read typed M2 measurements and
  per-index rows; `lahan_health` stays read-only legacy. This is implemented locally and
  awaits the hosted deployment gate (OBS-22).
- **Gemini stays optional and disabled by default** (ADR-05; the flag from M0), never entering the measurement or labeling path (OUT-04).

**Acceptance criteria.**

- **No production fixture substitution remains** — INV-01/02/06 enforced by tests: no production import of `utils/ndvi-simulator.ts`; no surface substitutes a synthesized record on empty/missing/errored results; `utils/ndvi-simulator.ts` is deleted from production paths.
- **Every displayed measurement shows its acquisition date and quality**: the date is the satellite observation date (INV-05), per-index valid-pixel/quality state is visible (INV-04), and every stored value is reproducible from its provenance (INV-03).
- A field with **no quality-passing observation shows an honest `unavailable` state** (INV-06), never a fabricated number; rejections carry an enumerated reason ([`data-evaluation-plan.md`](data-evaluation-plan.md) § 4).
- **The fixture-first test suite is green without network** (ADR-09); an equivalent measurement request is idempotent (proven by the cache-identity uniqueness test).
- A **live smoke check** exists that is bounded to known test polygons + short date ranges, quota-counted, and kept out of default CI (ADR-09; [`data-evaluation-plan.md`](data-evaluation-plan.md) § 7).
- The **hosted path is demonstrated end-to-end**: versioned migration applied, server-only
  admin/CDSE credentials configured in a publicly callable backend, and one authenticated
  app request persists then reads a provenance-complete passed/rejected/unavailable row.
- No cadence claim appears in product UI/copy beyond what M1 licensed (INV-08).

**Explicitly out of scope for M2.** No hypothesis evaluation, agreement metrics, or ground-truth analysis (M3); no diagnosis/classification layer (DEC-24); no large-screen refactor or dependency pruning (M4); no Sentinel-1 (OUT-05).

---

## M3 — Research validation

**Goal.** Run the evaluation and **answer the research questions** — evaluate each hypothesis against its falsification criterion using the persisted measurements and available ground truth, and produce thesis-ready, reproducible analysis artifacts.

**Why it precedes the next.** The thesis is the point; product hardening (M4) is explicitly post-thesis. Validation must complete before effort moves to non-thesis polish, and it can only run on the honest, persisted measurements M2 produces.

**Work items.**

- **Execute [`research-protocol.md`](research-protocol.md) § 5–§ 13**: ground-truth collection (§ 5, honestly team-bounded — DEC-17), spatial/temporal alignment (§ 7), quality/masking application (§ 8), small-field and resolution analysis (§ 9), topography/mixed-cropping treatment (§ 10), missing-data policy (§ 11), agreement metrics + uncertainty/CIs respecting clustering (§ 12), and crop/phenology-stage stratification (§ 13).
- **Evaluate active HYP-01 / HYP-05** against their explicit falsification criteria ([`research-protocol.md`](research-protocol.md) § 12) and answer descriptive RQ3 without a cross-field size-effect inference. HYP-02/RQ2 remains optional future work under DEC-26; HYP-03's former inferential claim is inactive under DEC-29; HYP-04 and HYP-06 remain retired.
- **Produce reproducible tables and figures** from `research/`: notebooks call tested `src/matani_rs/` functions; outputs are generated artifacts, not hand-built.
- **Document threats to validity** ([`research-protocol.md`](research-protocol.md) § 15), including OBS-01 non-generalizability, non-random cloud-driven missingness, and perishable-provider risk.

**Acceptance criteria.**

- **Each active hypothesis is explicitly confirmed / refuted / inconclusive** with the evidence and the pre-registered criterion that decided it ([`research-protocol.md`](research-protocol.md) § 12) — a "cannot determine" outcome is reported as such, with the reason. Retired or set-aside IDs are not acceptance blockers.
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
- **Feasibility before pipeline, so cadence claims are never invented.** M1 measures the defensible cadence for the advisor-approved Teluknaga site before M2 builds the pipeline — because a cadence promised from nominal revisit (EVID-006) rather than from measured usable-observation rates is fabricated (INV-08 / OUT-02; DEC-12 as amended by DEC-27; [`research-protocol.md`](research-protocol.md) § 4). M1 also settles the § 9 open decisions so M2 migrates against a finalized contract.
- **Validation before hardening, because the thesis is the point.** M3 evaluates the hypotheses on the honest, persisted measurements M2 produces; M4 is explicitly post-thesis. Effort reaches product polish only after the research contribution is delivered.

## Standing rules

- **Every milestone updates the canonical documents it invalidates.** A change that makes a canonical claim stale ships with the document update — the AGENTS.md "documentation updates are part of done" ritual ([`../AGENTS.md`](../AGENTS.md) § Working rules). A claim lives in exactly one canonical home; this roadmap links, it does not duplicate.
- **No milestone may violate INV-01…INV-09.** The invariants ([`product-requirements.md`](product-requirements.md) § 1) hold at every milestone boundary. DEC-24 removed the production fixture substitution before M2; introducing any new substitution or invariant violation is a defect, not debt.
- **The platform-side rotation / restriction gate remains required for formal M0 closure.** The ledger in [`project-architecture.md`](project-architecture.md) § 5.3 covers current Sentinel/Gemini credentials, revocation of the no-longer-consumed historical AccuWeather key, Google Maps per-platform/per-API restrictions, and verification of the backend Supabase key class. Historically committed secrets remain sensitive (no git-history rewrite; DEC-13); rotation/revocation, not history surgery, is the control.
