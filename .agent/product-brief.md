# Matani · Product Brief

**Document type:** Product brief
**Audience:** The developer, thesis advisor, reviewers, and AI agents working in this repo
**Status:** Active
**Updated:** 2026-09-25
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

Matani is a padi-only mobile decision support application for Indonesian smallholders that lets users map fields and inspect dated Sentinel-2 NDVI/NDMI values as a time series, together with weather context and field notes, without converting index values into crop-health diagnoses (DEC-24). The thesis evaluation asks whether provenance-safe observations can be delivered reliably for small tropical rice fields; GROW remains the paper-defined workflow framing (DEC-14).

The deployment qualification is load-bearing. See [`project-architecture.md`](project-architecture.md) § 2 for the sole current
measurement-provenance wording. The scoped hosted evidence and subsequent failed device
jobs do not establish repeatable delivery or formal M2 acceptance (OBS-28/30/31/32).

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
2. **Register the field as padi**; there is no multi-crop selector (DEC-24).
3. **View the field over time**: dated NDVI/NDMI records, local weather, notes, education content, and an optional non-diagnostic data summary.

The implementation connects saved polygons to explicit jobs and persisted observation
surfaces (DEC-31/33). Delivery must be described using [`project-architecture.md`](project-architecture.md) § 2; M0 and M2 acceptance
remain open under the [roadmap](implementation-plan.md) (OBS-32).

Throughout, the app distinguishes five data states (per [`../AGENTS.md`](../AGENTS.md) § Vocabulary), and this distinction is a product feature, not an implementation detail:

- **fixture** — labeled test data, deterministic.
- **prototype** — partially wired/non-provenance-safe research or legacy output.
- **measured** — persisted and provenance-complete through the M2 schema.
- **unavailable** — an honest, stated absence of data.
- **estimated** — a radar-model NDVI value, stored and shown separately from measurements with its model and evaluated error (DEC-55; the fifth state added 2026-09-25).

---

## 4 · Phased scope

| Phase | In scope | Provenance / references |
|-------|----------|-------------------------|
| **[As-built local]** | Interactive padi polygon capture; authenticated explicit M2 jobs; exact-polygon/native-grid CDSE adapter; typed provenance/quality persistence; owner-scoped observation cards and detail timeline; honest unavailable states; weather, notes, education, and optional non-diagnostic AI summary. Hosted evidence and remaining device-flow gates are qualified in architecture § 2 (OBS-28/30/31). | DEC-03/20/24/31; OBS-22/23; canonical qualification in [`project-architecture.md`](project-architecture.md) |
| **[Thesis]** | The padi-only observation-first DSS (DEC-14/24) plus M0–M3 outcomes: **M0** verification/security; **M1** Teluknaga feasibility; **M2** hosted persisted pipeline acceptance; **M3** research and system evaluation. | DEC-12/14/24/30/31; roadmap in [`implementation-plan.md`](implementation-plan.md); methodology in [`research-protocol.md`](research-protocol.md) |
| **[Post-thesis]** | Product hardening (**M4**); Sentinel-1 (SAR) as a cloud-independent contingency **only via a separate scope decision** (SAR measures backscatter, not the NDVI/NDMI reflectance this thesis evaluates — EVID-017); programme / partner exploration. | [`context-dump.md`](context-dump.md) § 6; EVID-017 |
| **[OUT]** | No synthetic substitution, cadence promise before M1, NDVI severity/health classification, agronomic diagnosis, Gemini ground truth/research labels, paid-provider dependence in the target default, or present thesis-readiness claim. | DEC-08/10/12/24; DEC-04/07; [`../AGENTS.md`](../AGENTS.md) honesty constraints |

---

## 5 · Target users

- **Primary — the thesis team as researchers (DEC-17).** The thesis deliverable is the rice DSS, and its evaluation backbone is the measurement evaluation (DEC-14); Matani is first an instrument for producing and validating provenance-complete observations. The primary "user" of the measurement pipeline is the research itself.
- **Secondary — Indonesian smallholder rice farmers** (product and thesis scope; DEC-24). Sub-0.5-ha fields (EVID-013) are the population the evaluation is built around.
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
- The work **validates against the active research protocol metrics** ([`research-protocol.md`](research-protocol.md) § 12): usable-observation cadence (RQ1) and field-size vs valid-pixel sufficiency (RQ3), with uncertainty that respects clustering. API-vs-independent raster agreement (retired RQ2/HYP-02) is optional M3/future work, not active thesis acceptance (DEC-26).

**For the product:**

- **Honest UX** — no fabricated data presented as measured, at any point, on any screen.
- A **field-usable app** that captures real padi-field polygons and surfaces dated measurements, weather context, notes, and education without diagnosing crop health.

The thesis and the product share one bar: it is better to honestly report that monitoring does not work at a useful cadence for the smallest fields than to ship a confident number that the data does not support.
