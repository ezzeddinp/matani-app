# Matani · Context Dump

**Document type:** Historical decision record
**Audience:** The developer, thesis advisor, reviewers, and AI agents working in this repo
**Status:** Active
**Updated:** 2026-07-23
**Canonical for:** Project history, the hackathon→thesis pivot, superseded ideas, the decisions index (DEC-*), and the EN↔ID glossary
**Companion documents:** [`evidence-register.md`](evidence-register.md), [`project-architecture.md`](project-architecture.md), [`research-protocol.md`](research-protocol.md), [`product-brief.md`](product-brief.md), [`implementation-plan.md`](implementation-plan.md)

---

## How to read this document

This is a **historical record**, not a current specification. It explains how Matani
came to be, what was tried, what was set aside, and which decisions were taken and
when. It is deliberately **not** the source of truth for how the system behaves today.

For **current behavior**, follow the companion documents in the precedence order
defined in [`../AGENTS.md`](../AGENTS.md) (§ Document precedence). In particular:

- Canonical NDVI/NDMI measurement provenance lives in
  [`project-architecture.md`](project-architecture.md) (§ Current measurement
  provenance) — this document only gives the short historical summary and links out.
- Research questions, methodology, and validity live in
  [`research-protocol.md`](research-protocol.md).
- External factual claims (quota, coverage, revisit) live in
  [`evidence-register.md`](evidence-register.md) as EVID-* entries.

Where this document and a more canonical companion disagree, the companion wins.

This document follows the provenance taxonomy from [`../AGENTS.md`](../AGENTS.md):
**EVID-\*** (external claims), **CODE-\*** / `file:line` (repository facts),
**DEC-\*** (the developer's decisions), **OBS-\*** (observations), **HYP-\***
(unvalidated hypotheses/thresholds). Repository facts below are cited to specific
files, line ranges, or commit hashes so they can be re-verified.

The project owner is referred to throughout as **the developer**.

---

## 1. Origin — the hackathon (≈ October 2025)

Matani began as a **hackathon entry**: an Indonesian precision-agriculture mobile app
aimed at helping smallholder farmers (*petani*) monitor their fields. The initial
commit is `635f192` (2025-09-27), and the bulk of hackathon development runs from late
September through the **2025-10-12** submission push, which is dense with
demo-preparation commits (`cd379b9` "presentasi sekarang, update api vercel be",
`60bb098` "mau bikin .apk", `32b3da1` "hampir final", `02bde95` "push").

The current `README.md` is the artefact of this phase: a **jurors' implementation
guide** ("Panduan Implementasi Juri") written in Indonesian, walking judges through
running the backend, Supabase services, and the Expo app on their own devices via a
public QR/link or a manual local setup (`README.md:1-91`). It states the product goal
plainly: help farmers monitor *lahan* (fields), NDVI, micro-weather, and record field
findings (`README.md:27`).

What was built during the hackathon, reconstructed from git history and source:

- **Interactive polygon field drawing** on Google Maps, persisted to Supabase
  (`f8e2ac8`, `36b3fee` "implement interactive polygon drawing for field mapping";
  `06bb967` switched the map provider to Google Maps for iOS/Android).
- **Supabase** as auth + storage: sign-up/login integration (`66e4d7f`), a
  PostGIS-backed `lahan` table storing polygon geometry with auto-computed area in
  hectares and a thumbnails table (`supabase_setup.sql:1-30`).
- **NDVI status cards** with severity classification and a percentage presentation
  (`d6a6290`, `41c33c1` "ndvi lahan based on lat n lon").
- **Weather** integration — initially Open-Meteo + OpenCage (`3eb069d`), later swapped
  to AccuWeather for "more accurate" location weather (`56f5640`); OpenCage was later
  removed (`bb4db17` "hapus opencage api").
- **AI advisory** and **education articles** surfaces (backend `backend/api/ai/route.js`;
  `d861504` covering education filter/sort and article detail).
- A **backend Express API** on Vercel bridging Sentinel Hub NDVI, weather, and Gemini
  (`README.md:29-31`; backend dirs `backend/api/{ndvi,weather,ai}`).

The README's own architecture summary (`README.md:28-31`) names the four pillars:
Expo/React Native frontend (`/app`), Express backend (`/backend`) bridging Sentinel
Hub NDVI + AccuWeather/Open-Meteo + Gemini, and Supabase for auth/storage/thumbnails.

## 2. What was actually built vs simulated

The hackathon build shipped a working app shell with **real field capture** (polygon
drawing → PostGIS geometry → area computation) and **real weather/AI surfaces**, but the
satellite side is where measured and synthetic data diverge. Stated honestly, and
provenance-precise (deep analysis lives in
[`project-architecture.md`](project-architecture.md) § Current measurement provenance;
here is only the short historical summary):

- **Field list surface (`app/(tabs)/explore.tsx`)** — a **prototype** Sentinel Hub
  request is wired in with a **silent synthetic fallback**. On field load the code
  seeds a synthetic NDVI record (`explore.tsx:1146`), and when a bounding box is
  available it calls `fetchNdviStatistic(bbox)` but falls back to
  `createSyntheticNdviRecord(...)` whenever the API returns nothing usable
  (`explore.tsx:1416-1420`) or throws (`explore.tsx:1426`). The fallback is silent —
  the UI does not distinguish a measured value from a synthesized one.
- **Detail screen (`app/detail-lahan-page.tsx`)** — the NDVI history is **fully
  synthetic**: it is generated by `buildNdviSeries(...)` from the local
  `utils/ndvi-simulator.ts` module (`detail-lahan-page.tsx:166`, importing at
  `detail-lahan-page.tsx:35`). No live request is involved on this screen at all.
- **Backend (`backend/api/ndvi/utils.js`)** — the Sentinel Hub Statistics request uses
  a **fixed 1–5 September 2025 time window** (`utils.js:66-77`) and queries a
  **bounding box, not the field polygon** — falling back to a hard-coded Jakarta bbox
  when none is supplied (`utils.js:48-50`). It does not respect the drawn polygon
  geometry or a caller-chosen date range.

Contemporary evidence that the satellite/moisture side was **unfinished** at the time:
commit `b7d4f19` (2026-05-13), whose message reads **"masih blm nampil si NDMI syit"**
("the NDMI still isn't showing up") — the developer's own note that NDMI display was
not working. This is why no claim is made here that the implementation is
thesis-ready; per [`../AGENTS.md`](../AGENTS.md) honesty constraints, synthetic values
must never be presented as measured.

## 3. The intervening period (Oct 2025 → Jul 2026)

It is **roughly nine months since the hackathon origin**, and this was **not a
nine-month inactivity gap** — commits continued sporadically across the period. From
git history:

- **2026-02-07** — `fc533c2` "Update README.md" (documentation touch).
- **2026-05-13** — a cluster of pre-thesis work: `7edc42b` "update for prethesis
  2026", `d510e3a` "rapihin code semraut" (code cleanup), `b7d4f19` "masih blm nampil
  si NDMI syit" (NDMI still not displaying), `7b31ee4` "ui ladang gacor lur" (UI work
  on the *ladang* field tab).
- **2026-06-05** — `24af342` "feat: is lahan has attempted before?" (field-state /
  attempt tracking feature).
- **2026-07-23** — `ddaa304` "update android app readme" and `d131c94` "update IOS
  Thesis" — the most recent commits, reframing the app documentation toward the thesis
  and refreshing the Android/iOS Expo preview links in `README.md` (the 2026-07-23
  timestamps in the preview URLs at `README.md:17,23`).

So the arc is: hackathon submission (Oct 2025) → dormant-but-not-dead documentation
touch (Feb 2026) → pre-thesis cleanup and UI iteration (May 2026) → field-state feature
(Jun 2026) → thesis reframing (Jul 2026).

## 4. The thesis pivot (July 2026)

In **July 2026** the developer repurposed Matani as a **thesis project** with a
**remote-sensing focus**: *evaluating Sentinel-2 NDVI/NDMI monitoring for Indonesian
smallholder farms*. The framing shift is deliberate and load-bearing:

- The **thesis contribution is the measurement evaluation**, not the app. The Expo
  application is the **delivery and field-interaction vehicle** — the surface through
  which farmers and evaluators interact with the monitoring — but building the app is
  not, by itself, the research contribution ([`../AGENTS.md`](../AGENTS.md) opening
  statement).
- To anchor all future work in **measurement provenance and research validity**, the
  developer created the groundwork documentation suite — this `.agent/` directory — on
  **2026-07-23**. Its purpose is to keep engineering honest about what is measured vs
  synthesized, to define the research questions and validity criteria, and to give AI
  agents a precedence-ordered, provenance-typed context to work within.

This pivot does **not** claim the current code is research-grade. It establishes the
scaffolding (taxonomy, precedence, honesty constraints) so that the gap between the
hackathon prototype and a defensible monitoring evaluation is made explicit and
closed deliberately, per [`implementation-plan.md`](implementation-plan.md).

### 4.1 The thesis-paper alignment (July 2026)

The `.agent/` suite was written on 2026-07-23 with the measurement-evaluation framing
(DEC-01) but **without the thesis paper's context**. The paper — *"A Mobile Decision
Support Application for Rice Crop Condition and Climate Risk Mapping Using NDVI,
SWIR-Derived Moisture Indicators, and Weather Data"* (three authors, Binus Information
Systems; revised draft "thesis fix.pdf") — frames the thesis as a **rice-focused mobile
DSS** with a paper-defined **GROW workflow** and a prototype evaluation framework
(functional testing, API response testing, conceptual validation, UAT). The two
framings were reconciled on 2026-07-23 by **DEC-14 through DEC-17**: the paper's DSS
framing is the thesis deliverable; the measurement-evaluation programme becomes its
supporting evaluation backbone; thesis crop scope narrows to rice; the weather
risk-score heuristic is registered as HYP-07; and the group-thesis authorship is
recorded. Known corrections still needed in the paper itself are tracked in
[`thesis-paper-corrections.md`](thesis-paper-corrections.md).

## 5. Decisions index (DEC-*)

All decisions below were **decided by the developer on 2026-07-23** as part of the
thesis-pivot groundwork. Each is the canonical record of that decision; companion
documents implement or elaborate them.

| ID | Decision | Date | Rationale | Status |
|----|----------|------|-----------|--------|
| **DEC-01** | Thesis focus is **remote-sensing evaluation** (Sentinel-2 NDVI/NDMI monitoring for Indonesian smallholder farms); the app is the **delivery/field-interaction vehicle**, not the contribution. | 2026-07-23 | Keeps the research question — measurement quality and feasibility — distinct from app engineering, so the thesis is defensible on its own terms. | **Amended by DEC-14** |
| **DEC-02** | Documentation is written in **English** with an **EN↔ID glossary** (see § 7). | 2026-07-23 | Reviewers/advisor and AI agents work in English; Indonesian domain terms are retained where they are the product's own words. | Active |
| **DEC-03** | **No wholesale stack rewrite.** Retain Expo/React Native, Supabase (Auth + Postgres + PostGIS + RLS), Express/Node API, Vercel, Google Maps, Sentinel-2 L2A, and Sentinel Hub Statistical API semantics. | 2026-07-23 | The existing stack is sound and already carries field-capture (`supabase_setup.sql`, `explore.tsx`); effort belongs on measurement provenance, not re-platforming. | Active |
| **DEC-04** | Satellite provider = **Copernicus Data Space Ecosystem (CDSE) Sentinel Hub free tier**, replacing the commercial `services.sentinel-hub.com` account. Treated as a **provider migration**, not a redesign. | 2026-07-23 | Free-tier CDSE removes commercial dependency while preserving Statistical API semantics; migration is bounded because request shape is largely unchanged. | Active |
| **DEC-05** | **Add** a Python research workspace (`research/`), a controlled acquisition **worker/job boundary**, **versioned Supabase migrations + DB tests**, and **provider adapters**. | 2026-07-23 | The prototype lacked reproducible acquisition, schema versioning, and swappable providers — all prerequisites for provenance-safe, testable measurement. | Active |
| **DEC-06** | **Express stays** as the production API. **FastAPI only if** production processing performs substantial raster work or must share core algorithms with the Python research package — an explicit **ADR trigger** (details in [`project-architecture.md`](project-architecture.md)). | 2026-07-23 | Avoids premature service split; a second runtime is justified only by real raster/algorithm-sharing need, decided via ADR when triggered. | Active |
| **DEC-07** | **Open-Meteo** becomes the **default weather provider**; **AccuWeather is dropped** from the default future architecture. | 2026-07-23 | AccuWeather access was time-limited/free-tier and weather is not the thesis contribution; Open-Meteo is a stable, open default. | Active |
| **DEC-08** | **Gemini is optional UX**, **disabled by default via a config flag**; it is **never** ground truth or a source of research labels. Referred to as an **environment-configured Gemini model**. | 2026-07-23 | LLM output cannot serve as measurement or labels without invalidating provenance; keeping it off by default protects research validity. | Active |
| **DEC-09** | **Fixture-first testing.** Ordinary development and CI **never** call live satellite or paid providers. | 2026-07-23 | Deterministic, cost-free, provenance-clean tests; live/paid calls are reserved for explicit, out-of-band acquisition runs. | Active |
| **DEC-10** | Adopt the **provenance taxonomy (EVID / CODE / DEC / OBS / HYP)** for all documentation. | 2026-07-23 | Every non-obvious claim carries a typed, verifiable marker; prevents synthetic data from being narrated as measured. | Active |
| **DEC-11** | The current NDVI severity thresholds in `constants/ndvi.ts` are treated as an **as-built UI heuristic (HYP)** until calibrated against field observations. | 2026-07-23 | The thresholds (`constants/ndvi.ts:12-45,64-100`) are unvalidated for Indonesian smallholder conditions; labeling them HYP prevents mistaking them for calibrated science. | Active |
| **DEC-12** | An **Indonesia feasibility study** — a 12-month representative-site availability analysis — **must precede** full pipeline implementation and **determines the defensible monitoring cadence**. | 2026-07-23 | Cadence cannot be promised from nominal satellite revisit (cloud cover, coverage gaps); it must be measured for representative Indonesian sites first. | Active |
| **DEC-13** | **Secrets hygiene:** env files stay **untracked**; migrate `app.json` → **`app.config.ts`**; **rotate** true server-side secrets. **No git-history rewrite** for now. | 2026-07-23 | Reduces future leakage risk and enables typed env config; history rewrite is deferred as high-cost/low-current-benefit. | Active |
| **DEC-14** | **Thesis framing aligned to the thesis paper** ("A Mobile Decision Support Application for Rice Crop Condition and Climate Risk Mapping…", July 2026 revision): the thesis deliverable is the **rice-focused mobile DSS** structured by the paper's **GROW workflow**, evaluated by the paper's framework (functional testing, API response testing, conceptual validation, UAT). The measurement-evaluation programme (RQ1–RQ3, feasibility study) is retained as the **evaluation backbone supporting that DSS thesis**, scoped to the thesis timeline — not a separate thesis. Amends DEC-01. | 2026-07-23 | The docs suite and the submitted paper described two different theses; one direction must win. The paper is the committed deliverable; the measurement rigor is what makes its claims defensible. | Active |
| **DEC-15** | **Thesis crop scope = padi (rice) only.** The five crop categories (padi, jagung, kedelai, teh, kopi) remain **product scope**; research sampling and stratification prioritize rice, other crops are post-thesis extensions. | 2026-07-23 | Matches the paper's rice focus and Indonesia's staple-crop context; keeps the group-thesis workload realistic without deleting product functionality. | Active |
| **DEC-16** | The client-side **weather risk-score heuristic** — `min(100, max(0, Pavg×4 + H×0.4))`, bands Low <40 / Medium 40–69 / High ≥70 (`app/(tabs)/weather.tsx:541-576`) — is registered as **HYP-07**: a prototype decision-support indicator, not a validated agronomic model, uncalibrated against local field data. The paper states this explicitly; docs carry the same constraint. | 2026-07-23 | The formula's weights are heuristic; presenting it as validated risk science would breach the honesty constraints. Registered as HYP so it cannot be mistaken for a finding. | Active |
| **DEC-17** | The thesis is a **three-author group thesis** (Bina Nusantara University, Information Systems). Repo documents refer to the repo owner as "the developer" and the authors collectively as "the thesis team"; "single-developer" feasibility caveats are re-scoped to the small team (still sparse-ground-truth-bounded). | 2026-07-23 | Prior docs assumed a single-developer thesis; the paper has three authors. Feasibility notes stay honest but reflect actual capacity. | Active |
| **DEC-18** | **Computation placement: satellite index computation stays server-side.** NDVI/NDMI statistics are computed provider-side (Statistical API semantics) and only small results (index values, time series) are shipped to the phone; no raster processing or index computation runs on-device. **On-device ML** (e.g., a quantized LiteRT model for camera-based leaf/pest classification) is recorded as a **post-thesis future candidate** requiring its own scope decision — it is not part of M0–M4 and never enters the measurement path. | 2026-07-23 | Users are on low-end Android over rural networks; server-side processing is lighter on device battery, storage, and bandwidth, and keeps the measurement pipeline in one controllable, provenance-completable place. On-device inference is only warranted for phone-sensor features (camera), which are out of thesis scope. | Active |

## 6. Superseded ideas / set-asides

- **Hackathon framing (jurors' README).** The Indonesian "Panduan Implementasi Juri"
  (`README.md:1-91`) is superseded by the thesis framing; a thesis-oriented README is
  the direction (the 2026-07-23 "update IOS Thesis" / "update android app readme"
  commits `d131c94`, `ddaa304` begin this). Kept as historical origin, not current
  positioning.
- **Silent synthetic NDVI fallback.** The prototype's silent fallback to synthesized
  NDVI (`explore.tsx:1416-1420,1426`) and the fully synthetic detail history
  (`detail-lahan-page.tsx:166`) are to be **replaced by honest "unavailable" states**
  (roadmap **M2** in [`implementation-plan.md`](implementation-plan.md)). Superseded by
  DEC-10's honesty constraint.
- **AccuWeather.** Dropped from the default architecture (superseded by DEC-07 /
  Open-Meteo). Time-limited free access; not thesis-relevant.
- **Commercial Sentinel Hub account** (`services.sentinel-hub.com`). Superseded by
  DEC-04 (CDSE free tier).
- **Sentinel-1 (SAR).** Set aside as a **post-thesis contingency** — a possible
  cloud-penetrating complement to optical Sentinel-2 — requiring a **separate scope
  decision** before adoption. Not in the current thesis scope.

## 7. Glossary (EN ↔ ID)

### Domain terms

| Indonesian | English | Notes / provenance |
|------------|---------|--------------------|
| **lahan** | field / plot | The **database table name** for stored field polygons (`supabase_setup.sql:5`). |
| **ladang** | farm field | The **UI tab** name for the field-management surface (`app/(tabs)/explore.tsx`; e.g. commit `7b31ee4` "ui ladang gacor lur"). |
| **petani** | farmer | The end user Matani serves. |
| **jagung** | maize / corn | A supported crop category (`supabase_setup.sql:13`). |
| **padi** | rice (paddy) | Supported crop category. |
| **kedelai** | soybean | Supported crop category. |
| **teh** | tea | Supported crop category. |
| **kopi** | coffee | Supported crop category. |
| **cuaca** | weather | Weather surface / provider bridge. |
| **beranda** | home | The home tab. |
| **edukasi** | education | The education-articles surface (`constants/education.ts`, `app/(tabs)/education.tsx`). |

### Data-state vocabulary (from [`../AGENTS.md`](../AGENTS.md) § Vocabulary)

| Term | Meaning |
|------|---------|
| **fixture** | Labeled test data; deterministic, used in fixture-first testing (DEC-09). |
| **prototype** | Partially wired and **non-provenance-safe** (e.g. the current Sentinel Hub request with silent synthetic fallback). |
| **measured** | Persisted and **provenance-complete** — every value carries its origin. |
| **unavailable** | An **honest absence** of data, stated rather than papered over. |

### Index expansions

| Acronym | Expansion |
|---------|-----------|
| **NDVI** | Normalized Difference Vegetation Index — Sentinel-2 vegetation index. |
| **NDMI** | Normalized Difference Moisture Index — Sentinel-2 moisture index. |
| **GROW** | Gathering, Recognizing, Offering, Warning — the thesis paper's application-specific decision-support workflow (DEC-14). A paper-defined framing, not an external methodology. |
