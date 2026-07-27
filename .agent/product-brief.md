# Matani · Product Brief

**Document type:** Product brief
**Audience:** The developer, thesis advisor, reviewers, and AI agents working in this repo
**Status:** Active
**Updated:** 2026-07-27
**Canonical for:** The product thesis, positioning, target user, and phased scope
**Companion documents:** [`product-requirements.md`](product-requirements.md), [`project-architecture.md`](project-architecture.md), [`research-protocol.md`](research-protocol.md), [`evidence-register.md`](evidence-register.md), [`context-dump.md`](context-dump.md), [`implementation-plan.md`](implementation-plan.md)

---

## How to read this document

This brief explains **why Matani exists and how it is scoped** — the product thesis, who it is for, what makes its approach distinct, and which work belongs to which phase. It does not specify behavior, system internals, or research methodology:

- **Feature behavior and invariants** live in [`product-requirements.md`](product-requirements.md).
- **System detail** — trust boundaries, the as-built vs target architecture, and the canonical measurement-provenance wording — lives in [`project-architecture.md`](project-architecture.md).
- **Research questions, hypotheses, and validity** live in [`research-protocol.md`](research-protocol.md).

Where this brief and a more canonical companion disagree, the companion wins (see [`../AGENTS.md`](../AGENTS.md) § Document precedence). External facts are cited by `EVID-*` / `OBS-*` ID from the evidence register and never restated; decisions by `DEC-*` from the context dump; unvalidated thresholds by `HYP-*` from the research protocol. The project owner is **the developer**.

---

## 1 · One-sentence pitch

Matani is a mobile decision support application for Indonesian smallholder **rice** farming — the thesis deliverable (DEC-14) — that lets farmers map their fields and, once the measurement pipeline is built, receive provenance-safe Sentinel-2 NDVI/NDMI observations, weather-based risk classification, and optional advisory support, structured by the thesis paper's GROW workflow (Gather → Recognize → Offer → Warn). Thesis scope is rice; the app's five crop categories remain product scope (DEC-15).

The qualifier is load-bearing. Today the satellite path is a **prototype**, not a working measurement pipeline; its exact behavior is described only by the canonical wording in [`project-architecture.md`](project-architecture.md) § Current measurement provenance. One-line summary: a prototype Sentinel Hub request still substitutes a visibly labeled synthetic fixture, and the detail analysis is also labeled synthetic — see that section for the precise, non-softened statement.

---

## 2 · Problem

Indonesian smallholder agriculture is dominated by very small fields: in the 2023 Agricultural Census, ≈62% of individual land-using farmers are *petani gurem* controlling less than 0.5 ha (EVID-013). That is the population Matani serves, and it is exactly the population that makes satellite monitoring hard.

Two constraints collide over these fields:

- **Optical monitoring is cloud-limited in the tropics.** Persistent tropical cloud cover substantially reduces the availability of cloud-free optical observations (EVID-015). A nominal high revisit — Sentinel-2's 5-day cadence at the Equator under cloud-free conditions (EVID-006) — is an *acquisition* cadence, not a *usable-observation* cadence; the two diverge, and by how much for Indonesia is unknown until measured (OBS-01 is a single, non-reproduced data point, not an answer).
- **Small fields strain the measurement itself.** Sub-0.5-ha polygons carry few valid pixels, especially for the coarser 20 m SWIR band NDMI depends on, and boundary mixing contaminates the signal.

The product problem is therefore also the thesis question: **can accessible, honest, provenance-safe satellite monitoring work for very small tropical fields at all — and if so, at what cadence?** The brief states the question; [`research-protocol.md`](research-protocol.md) owns how a defensible answer is judged.

---

## 3 · Product

Matani is a field-first mobile app. The core loop, as built:

1. **Draw the field polygon** on the map — the actual field boundary, not a bounding box.
2. **Pick the crop** from the five supported categories: padi (rice), jagung (maize), kedelai (soybean), teh (tea), kopi (coffee).
3. **View the field**: status card, local weather, education content, and an optional AI advisory surface.

What the loop captures today is real: polygon geometry is persisted to Supabase (PostGIS), area is computed, weather and education surfaces work. What it does **not** yet have is a trustworthy satellite measurement — the status card is a **prototype** with a labeled synthetic fixture fallback (§ 1).

The target adds two things the prototype lacks: **persisted, provenance-complete measurements** — every NDVI/NDMI value carrying its acquisition date, valid-pixel accounting, and masking rule-set version — and **honest unavailable states** that admit absence rather than papering over it with synthesized data.

Throughout, the app distinguishes four data states (per [`../AGENTS.md`](../AGENTS.md) § Vocabulary), and this distinction is a product feature, not an implementation detail:

- **fixture** — labeled test data, deterministic.
- **prototype** — partially wired and non-provenance-safe (today's satellite path).
- **measured** — persisted and provenance-complete (the target).
- **unavailable** — an honest, stated absence of data.

---

## 4 · Phased scope

| Phase | In scope | Provenance / references |
|-------|----------|-------------------------|
| **[As-built hackathon]** | Interactive polygon field drawing persisted to Supabase; Supabase auth with Row Level Security; a **prototype** Sentinel Hub satellite request with a **labeled synthetic fixture fallback** (one-line summary in § 1; canonical wording in architecture § Current measurement provenance); weather; education articles; optional AI advisory. The fixture-fallback history — seeded synthetic records, bbox-not-polygon queries, a fixed date window — is recorded historically. | DEC-03; RLS client-safety conditional on EVID-020; history in [`context-dump.md`](context-dump.md) § 2 |
| **[Thesis]** | The rice-focused DSS as described in the thesis paper (DEC-14, DEC-15, DEC-19) — GROW workflow, NDVI/NDMI condition display, weather risk classification (HYP-07), advisory surfaces — plus the M0–M3 outcomes that make it defensible: **M0** verification & security foundation (secrets hygiene, RLS, fixture-first testing); **M1** the Indonesia feasibility study (12-month retrospective availability analysis that determines defensible cadence); **M2** a real, persisted, **provenance-complete** measurement pipeline replacing the labeled fixture fallback with measured values and honest unavailable states; **M3** research validation against the protocol's metrics and the paper's system-evaluation track ([`research-protocol.md`](research-protocol.md) § 16). | DEC-14/DEC-15/DEC-19; DEC-12 (feasibility precedes pipeline); DEC-09; roadmap in [`implementation-plan.md`](implementation-plan.md); methodology in [`research-protocol.md`](research-protocol.md) |
| **[Post-thesis]** | Product hardening (**M4**); Sentinel-1 (SAR) as a cloud-independent contingency **only via a separate scope decision** (SAR measures backscatter, not the NDVI/NDMI reflectance this thesis evaluates — EVID-017); programme / partner exploration. | [`context-dump.md`](context-dump.md) § 6; EVID-017 |
| **[OUT]** | **No silent synthetic data, ever again** — synthesized values are never presented as measured. **No cadence promises** ahead of the feasibility study (nominal revisit EVID-006 ≠ usable cadence). **No crop-health "diagnosis"** claims from the unvalidated as-built severity thresholds (HYP-04). **No Gemini as ground truth** or research label. **No paid-provider dependence** in the default architecture. **No claim of thesis-readiness today.** | DEC-10; DEC-12; HYP-04 / DEC-11; DEC-08; DEC-04 & DEC-07; [`../AGENTS.md`](../AGENTS.md) honesty constraints |

---

## 5 · Target users

- **Primary — the thesis team as researchers (DEC-17).** The thesis deliverable is the rice DSS, and its evaluation backbone is the measurement evaluation (DEC-14); Matani is first an instrument for producing and validating provenance-complete observations. The primary "user" of the measurement pipeline is the research itself.
- **Secondary — Indonesian smallholder rice farmers** (thesis scope; DEC-15). The app's five crop categories (padi, jagung, kedelai, teh, kopi) remain its product design audience, and sub-0.5-ha fields (EVID-013) are the population the whole evaluation is built around.
- **Tertiary — the thesis advisor and examiners** evaluating the research on its own terms — the RQ set, methodology, and validity of the feasibility and measurement work.

**Honest note on the user base.** Matani has no deployed farmer base. Anyone using the app today is a **test user**, not a served customer; the secondary users are a design audience the product is being built *toward*, not a population it currently serves.

---

## 6 · Positioning

What makes Matani's approach distinct is not a feature list — it is a stance:

- **Measurement provenance and honesty as the core product value.** Every measured value carries its origin: the actual acquisition date is shown (never a synthesized "current" date), valid pixels are accounted for per index, and when no quality-passing observation exists the product says so. Unavailability is a first-class state, not a gap to be hidden. This is the opposite of the as-built silent fallback, and it is the product's differentiator (DEC-10; [`../AGENTS.md`](../AGENTS.md) honesty constraints).
- **A free-tier, reproducible stack.** Satellite data from the Copernicus Data Space Ecosystem Sentinel Hub free tier (DEC-04), weather from Open-Meteo (DEC-07), storage and auth on Supabase with versioned migrations and fixture-first testing (DEC-05, DEC-09). No commercial-provider lock-in, and the measurement path is reproducible by design.
- **Small fields as the population, not the edge case.** Because *petani gurem* <0.5 ha dominate Indonesian smallholding (EVID-013), small-field reliability is the central question (research-protocol RQ3), not a corner case to be excluded.

Competitor comparison lives in the thesis paper (Table V — Open-Meteo, Sentinel Hub EO Browser, OneSoil, EOSDA, CropX, Climate FieldView, SIPINDO, KATAM Terpadu-SC, Plantix) under the paper's own citations; it is not duplicated here, and no competitor claim is made in this suite without an evidence-register entry.

---

## 7 · Success criteria

**For the thesis:**

- The Indonesia feasibility study (DEC-12) yields a **defensible cadence answer**, stated per site and season — and this is the criterion even if the answer is negative. A finding that satellite monitoring is **not viable at a useful cadence for <0.5 ha fields** is a valid, successful thesis outcome; a false promise of viability would be a failure. The nominal 5-day revisit (EVID-006) is never the answer; the study is.
- The measurement pipeline produces **provenance-complete measured observations** — every value carrying acquisition date, valid-pixel accounting, and masking rule-set version — with the labeled synthetic fixture fallback removed.
- The work **validates against the research protocol's metrics** ([`research-protocol.md`](research-protocol.md) § 12): usable-observation cadence (RQ1), API-vs-independent agreement (RQ2), and field-size vs valid-pixel sufficiency (RQ3), with uncertainty that respects clustering.

**For the product:**

- **Honest UX** — no fabricated data presented as measured, at any point, on any screen.
- A **field-usable app** that captures real field polygons and surfaces measured status, weather, and education content the farmer can act on.

The thesis and the product share one bar: it is better to honestly report that monitoring does not work at a useful cadence for the smallest fields than to ship a confident number that the data does not support.
