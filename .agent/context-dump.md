# Matani · Context Dump

**Document type:** Historical decision record
**Audience:** The developer, thesis advisor, reviewers, and AI agents working in this repo
**Status:** Active
**Updated:** 2026-09-25

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
Expo/React Native frontend (`/app`), Express backend (`/backend`) bridging Sentinel Hub
NDVI + Open-Meteo + optional Gemini, and Supabase for auth/storage/thumbnails. The
README remains non-canonical; this statement reflects the 2026-08-21 provider revision.

## 2. What was actually built vs simulated

The hackathon build shipped a working app shell with **real field capture** (polygon
drawing → PostGIS geometry → area computation) and **real weather/AI surfaces**, but the
satellite side is where measured and synthetic data diverge. Stated honestly, and
provenance-precise (deep analysis lives in
[`project-architecture.md`](project-architecture.md) § Current measurement provenance;
here is only the short historical summary):

- **Field list surface (`app/(tabs)/explore.tsx`)** — DEC-24 removes the hackathon
  synthetic fallback and every NDVI severity classification. The current surface
  shows a transient provider snapshot as `prototype`, a stored legacy row as
  `fixture`/`prototype`, or an honest unavailable state; it never invents a value.
- **Detail screen (`app/detail-lahan-page.tsx`)** — DEC-24 replaces the fully synthetic
  history and derived pest/disease/stress/harvest scores with a chronological reader
  over stored legacy `lahan_health` rows. It plots only dated NDVI/NDMI values that
  exist, labels their data state, preserves gaps, and shows an empty timeline when no
  record exists. This is an observation-first interface, not a measurement writer or
  diagnosis surface.
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
(DEC-01) but **without the thesis paper's context**. The July 2026 paper draft used
*"Climate Risk Mapping"*; DEC-19 first changed this to classification. DEC-24 now
sets the current submission-candidate title to *"A Mobile Decision Support Application
for Rice Field Time-Series Monitoring Using Sentinel-2 NDVI, NDMI, and Weather Data."*
The paper (three
authors, Binus Information Systems) frames the thesis as a **rice-focused mobile
DSS** with a paper-defined **GROW workflow** and a prototype evaluation framework
(functional testing, API response testing, conceptual validation, UAT). The two
framings were reconciled on 2026-07-23 by **DEC-14 through DEC-17**, then the title
scope was hardened on 2026-07-27 by **DEC-19**, then narrowed on 2026-08-21 by
**DEC-24**: the paper's DSS
framing is the thesis deliverable; the measurement-evaluation programme becomes its
supporting evaluation backbone; thesis crop scope narrows to rice; the weather
risk-score heuristic is registered as HYP-07; and the group-thesis authorship is
recorded. Known corrections still needed in the paper itself are tracked in
[`thesis-paper-corrections.md`](thesis-paper-corrections.md).

## 5. Decisions index (DEC-*)

DEC-01 through DEC-18 were decided by the developer on 2026-07-23 as part of the
thesis-pivot groundwork; later entries record implementation and thesis-alignment choices.
Each is the canonical record of that decision; companion documents implement or
elaborate them.

| ID | Decision | Date | Rationale | Status |
|----|----------|------|-----------|--------|
| **DEC-44** | Keep Google Maps as the only Ladang provider while restoring an Expo Go iPhone workflow: iOS Expo Go renders the Google Maps JavaScript API through the Expo-Go-supported `react-native-webview`; Android and app-specific iOS builds retain native `react-native-maps` with `PROVIDER_GOOGLE`. Use a dedicated Web key and explicit real failure states; never select Apple MapKit. Make Expo Go the default Metro target again and keep the development client as an optional native path. | 2026-09-10 | The developer requires Google Maps and currently tests by scanning Expo Go on a physical iPhone. The installed Expo Go binary cannot gain this project's Google native pods, whose placeholder produced the blank container, while its bundled WebView can host Google's supported browser implementation. | Active; supersedes DEC-43's default-workflow clause and amends DEC-42 without changing its no-MapKit requirement |
| **DEC-39** | Make field geometry bidirectional and keep base-map failure recoverable. Matani exports each pending or saved boundary as one WGS84 GeoJSON Polygon feature, previews the exact longitude-latitude coordinates, and enables export after save by default. Android uses Google Maps while iOS uses its native provider; satellite loading exposes retry and standard-map fallback controls. | 2026-09-08 | The developer needs the exact Matani polygon in Copernicus Browser for raster comparison and reported an unexplained blank-green map. A single geometry exchange path avoids redrawing error, while explicit map recovery preserves the field workflow when satellite tiles or build-time keys are unavailable. | Active for GeoJSON; map-provider and timeout-overlay clauses superseded by DEC-40 |
| **DEC-42** | Use Google Maps as the only native field-map provider on Android and iOS; do not fall back to Apple MapKit. Keep separate restricted platform keys and require an iOS native build that includes the Google Maps library. | 2026-09-09 | The developer explicitly rejected the automatic Apple Maps fallback and requires Google Maps provider parity. Missing key/native configuration remains an explicit deployment prerequisite rather than changing providers. | Active; supersedes DEC-41 and restores DEC-40's Google-only intent |
| **DEC-43** | Make an app-specific Expo development client the default map-capable device workflow. Install `expo-dev-client`, target it from the start scripts, bind EAS build profiles to named environments, and retain Expo Go only as an explicit limited diagnostic option that does not qualify the Google-only iOS map. | 2026-09-09 | The developer's physical-iPhone screenshot showed the map container without Google tiles even after local keys and cache restart. Google Maps on iOS needs native configuration in the installed binary; JavaScript restart cannot add that library/configuration. | Retained for the optional native build/EAS setup; default-workflow clause superseded by DEC-44 |
| **DEC-41** | Prevent an unconfigured iOS Google provider from replacing the usable map with a blank surface. Android remains Google Maps; iOS uses Google Maps only in a native build whose config resolved a non-placeholder iOS key, and otherwise uses the platform MapKit implementation already present in Expo Go/the client. The fallback is automatic and has no timer overlay. | 2026-09-09 | Forcing `PROVIDER_GOOGLE` while the local key audit reported iOS unconfigured selected a native implementation that was not present/configured in the running client; the developer observed only the map container background while the Apple implementation remained functional. | Superseded by DEC-42 |
| **DEC-40** | Use Google Maps on both mobile platforms and make field observations easier to navigate and read. Supersede DEC-39's platform-native iOS provider and timed load-warning overlay: Android and iOS native builds use Google Maps with separate restricted build-time keys, while native loading feedback remains non-blocking. Field detail provides a direct map-focus action; Beranda/Ladang cards expose field metadata and dated raw-index availability with clearer hierarchy; chronology translates quality states and known rejection codes into bounded Indonesian explanations without diagnosing the crop. | 2026-09-09 | The persistent timeout overlay produced false-positive interruptions, the cross-platform provider differed from the developer's intended Google Maps experience, and the existing cards/chronology obscured the next action and meaning of unavailable values. | Active; provider fallback amendment DEC-41 was superseded by DEC-42 |
| **DEC-38** | Add reviewed GeoJSON field import to the Ladang flow. Accept one simple WGS84 Polygon from a `.geojson`/`.json` file, validate it locally, preview it on the map, and use the same owner-scoped save and automatic-measurement path as drawn fields. | 2026-09-08 | The developer needs one reusable polygon for QGIS, Copernicus Browser, and Matani raster comparison; redrawing vertices would invalidate geometry-level comparison. | Active |
| **DEC-37** | Initialize NDVI/NDMI automatically when opening an empty field detail, once per visit through the idempotent worker; retain stored values and explicit failed/unavailable states. | 2026-09-08 | The developer reports that manual-only initialization leaves field details empty. This amends earlier screen-open restrictions in ADR-06, without approving synthetic values or establishing formal M2 PASS. | Active |
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
| **DEC-11** | The NDVI severity thresholds were treated as an as-built UI heuristic. | 2026-07-23 | The thresholds were unvalidated for Indonesian smallholder conditions. | **Superseded by DEC-24; HYP-04 retained only as history** |
| **DEC-12** | An **Indonesia feasibility study** — a 12-month representative-site availability analysis — **must precede** full pipeline implementation and **determines the defensible monitoring cadence**. | 2026-07-23 | Cadence cannot be promised from nominal satellite revisit (cloud cover, coverage gaps); it must be measured for representative Indonesian sites first. | Active |
| **DEC-13** | **Secrets hygiene:** env files stay **untracked**; migrate `app.json` → **`app.config.ts`**; **rotate** true server-side secrets. **No git-history rewrite** for now. | 2026-07-23 | Reduces future leakage risk and enables typed env config; history rewrite is deferred as high-cost/low-current-benefit. | Active |
| **DEC-14** | **Thesis framing aligned to the thesis paper** (July 2026 revision): the thesis deliverable is the **rice-focused mobile DSS** structured by the paper's **GROW workflow**, evaluated by the paper's framework (functional testing, API response testing, conceptual validation, UAT). The measurement-evaluation programme (RQ1–RQ3, feasibility study) is retained as the **evaluation backbone supporting that DSS thesis**, scoped to the thesis timeline — not a separate thesis. Amends DEC-01. | 2026-07-23 | The docs suite and the submitted paper described two different theses; one direction must win. The paper is the committed deliverable; the measurement rigor is what makes its claims defensible. | **Amended by DEC-19** |
| **DEC-15** | **Thesis crop scope = padi (rice) only.** Five crop categories remained product scope. | 2026-07-23 | Earlier split between research and product scope. | **Superseded by DEC-24** |
| **DEC-16** | The client-side **weather risk-score heuristic** — `min(100, max(0, Pavg×4 + H×0.4))`, bands Low <40 / Medium 40–69 / High ≥70 (`app/(tabs)/weather.tsx:541-576`) — is registered as **HYP-07**: a prototype decision-support indicator, not a validated agronomic model, uncalibrated against local field data. The paper states this explicitly; docs carry the same constraint. | 2026-07-23 | The formula's weights are heuristic; presenting it as validated risk science would breach the honesty constraints. Registered as HYP so it cannot be mistaken for a finding. | Active |
| **DEC-17** | The thesis is a **three-author group thesis** (Bina Nusantara University, Information Systems). Repo documents refer to the repo owner as "the developer" and the authors collectively as "the thesis team"; "single-developer" feasibility caveats are re-scoped to the small team (still sparse-ground-truth-bounded). | 2026-07-23 | Prior docs assumed a single-developer thesis; the paper has three authors. Feasibility notes stay honest but reflect actual capacity. | Active |
| **DEC-18** | **Computation placement: satellite index computation stays server-side.** NDVI/NDMI statistics are computed provider-side (Statistical API semantics) and only small results (index values, time series) are shipped to the phone; no raster processing or index computation runs on-device. **On-device ML** (e.g., a quantized LiteRT model for camera-based leaf/pest classification) is recorded as a **post-thesis future candidate** requiring its own scope decision — it is not part of M0–M4 and never enters the measurement path. | 2026-07-23 | Users are on low-end Android over rural networks; server-side processing is lighter on device battery, storage, and bandwidth, and keeps the measurement pipeline in one controllable, provenance-completable place. On-device inference is only warranted for phone-sensor features (camera), which are out of thesis scope. | Active |
| **DEC-19** | Retitle the thesis to **“A Mobile Decision Support Application for Rice Crop Condition and Climate Risk Classification Using NDVI, SWIR-Derived Moisture Indicators, and Weather Data.”** | 2026-07-27 | Replaced unsupported “mapping” wording. | **Superseded by DEC-24** |
| **DEC-20** | **Provider data calls remain behind the Matani backend boundary.** The duplicate direct Open-Meteo fallbacks in the home and weather screens are removed; if `/weather` is unavailable, the mobile UI shows an unavailable/error state rather than bypassing the integration layer. Client-side Google Maps, Nominatim place search, avatar, and display-image requests remain presentation integrations and never enter the measurement path. Profile notification controls and unsupported activity/agronomic metrics are replaced by unavailable/preview states until real storage and delivery exist. | 2026-07-27 | Resolves the fresh code–architecture cross-check: the prior mobile weather fallback contradicted the documented provider boundary, while profile/notification surfaces implied capabilities and metrics that the repo does not implement. | Active |
| **DEC-21** | **M1 measurement-contract decisions.** Use a typed `measurements` table plus typed per-index child rows; retain `lahan_health` as read-only legacy until M2 migration/backfill. Run acquisition through an external Node worker, never UI rendering. Geometry identity is SHA-256 over a canonical EPSG:4326 exterior ring rounded to seven decimals, with canonical orientation/start vertex and no analysis buffer inside the hash. Process the validated exact boundary in a recorded local UTM CRS so 10 m/20 m grids are metre-based; record source and valid counts independently per index, keep nullable provider `geometryPixelCount` distinct from derived coverage. Processing versions begin at `ndvi-ndmi-v1`, `s2l2a-statistics-v1`, and `s2l2a-scl-rice-v1`; any semantic formula, mask, water-rule, CRS/grid, resolution, resampling, aggregation, or pixel-accounting change requires a version bump and non-destructive reprocessing. | 2026-07-29 | Closes the M1 engineering-contract decisions required before M2 can create the physical measurement migration and worker, amended by the live CRS/pixel-accounting finding in OBS-11. Concrete contract: `research/contracts/measurement-contract-v1.json`; migration-ready draft: `research/contracts/measurement-schema-v1.sql` (CODE). | Active |
| **DEC-22** | **Mobile compatibility baseline = Expo SDK 54 with Expo Go as the default local-device workflow.** Pin the Expo-recommended React Native 0.81 / React 19.1 dependency matrix, remove unused `@expo/ui` and `expo-dev-client`, and make the start/Android/iOS scripts pass `--go`. | 2026-07-28 | The thesis team requested one project baseline that their installed Android/iOS Expo Go clients can open. This is a developer workflow decision, not a claim that the current App Store Expo Go supports an older SDK on every physical iPhone (EVID-023). | Superseded by the SDK 57 as-built amendment and by DEC-43 for the device workflow |
| **DEC-23** | Preserve every earlier thesis source and create `.agent/thesis-aligned-2026-08-21.docx` plus its PDF as the audited submission candidate. The candidate reports preliminary OBS-11/12 results with their limitations, aligns production behavior with current code, removes internal revision appendices/roadmap identifiers, and remains non-final until thesis-team/advisor approval. | 2026-08-21 | The uploaded PDF was newer than the existing DOCX revisions but contained a mislabeled NDMI formula, stale implementation claims, out-of-order citations, and no Results/Discussion/Conclusion. A reproducible candidate resolves those defects without overwriting source evidence (OBS-14). | Active |
| **DEC-24** | **Matani is padi-only in both product and thesis scope, and its satellite-facing output is a dated NDVI/NDMI time series rather than crop-health classification or diagnosis.** Remove all non-padi creation choices, retire HYP-04 from the active UI/research claim surface, remove synthetic series and derived pest/disease/stress/harvest scores, constrain new database categories to padi, preserve pre-existing non-padi labels only in `legacy_category` without relabeling them as rice, and use the submission-candidate title **“A Mobile Decision Support Application for Rice Field Time-Series Monitoring Using Sentinel-2 NDVI, NDMI, and Weather Data.”** The title remains subject to thesis-team/advisor approval. | 2026-08-21 | A single crop and observation-first output align the product with the actual evidence base and avoid unsupported inference from vegetation indices. | Active; supersedes DEC-11, DEC-15, and DEC-19 |
| **DEC-25** | **M1 decision-status checkpoint.** The developer records the relayed advisor response: use staged sampling stratified by region × season; use site-specific seasonal labels rather than a fixed island-wide calendar; and report defensible cadence per site × season. Padi identity, consent, boundary verification, and location/area metadata remain field inclusion requirements. Final RQ wording, final regions, target N, numeric HYP-03 floors, pre-registered tolerances, and the milestone placement of independent raster comparison remain open and are not treated as approved by this checkpoint. | 2026-08-28 | Captures the current research decision state without turning illustrative examples or unresolved questions into M1 approval, measured evidence, or a cadence claim. | Active checkpoint; M1 remains open |
| **DEC-26** | **Independent raster comparison is removed from M1 acceptance and from the active thesis evaluation scope.** RQ2/HYP-02 are retained as retired identifiers and an optional M3/future-work extension only; they may be reactivated only through a new thesis-team/advisor-approved scope decision, and may otherwise be deleted from future-work planning without renumbering historical IDs. M1 closes on the representative region × season availability study, approved provisional HYP-03 quality floors, cadence determination, quota check, and measurement-contract review—not on API-vs-raster agreement. | 2026-08-28 | Prevents an optional validation experiment from expanding the thesis and blocking the feasibility gate while preserving an auditable history of the earlier proposal. | Active; resolves the open milestone-placement item in DEC-25 |
| **DEC-27** | **M1 uses Teluknaga, Banten as its single advisor-approved study region, and the provisional per-observation reliability floors are 9 valid NDVI pixels and 3 valid NDMI pixels.** The approval was relayed from a dated WhatsApp decision record (`private-evidence://m1/advisor-whatsapp-scope-quality-20260829`) after the thesis team's onsite visit. The constrained single-region design replaces the earlier multi-region expectation for the thesis timeline; results are reported only for Teluknaga and its site-specific wet/dry labels and must not be generalized as nationally representative. Final active RQ wording, target N beyond the currently approved manifest, and other pre-registered tolerances remain open. | 2026-08-29 | The advisor explicitly accepted a single region because of limited time and thesis-team availability and supplied the 9/3 floors. | Active; amends DEC-12's representative multi-site expectation and closes the region/floor items left open by DEC-25 |
| **DEC-28** | **M2 source provenance requires every processed raster to share a Process response with its `userdata` source-scene metadata.** Catalog remains discovery only; missing complete source identity is unavailable, and M1 Statistical API results are not retroactively relabeled measured. The original one-response-for-both-indices implementation wording is amended by DEC-31 because output resolution is request-level. | 2026-08-29 | The live probe returned one selected provider scene/data path (OBS-20), and CDSE supports raster + userdata multi-response (EVID-028). DEC-31 preserves this same-response principle separately for the 10 m and 20 m native grids and adds strict cross-response identity matching. | Active principle; implementation wording amended by DEC-31/ADR-15 |
| **DEC-29** | **Advisor approves the proposed final active RQ wording:** RQ1 is the proportion of quality-passing Sentinel-2 NDVI/NDMI acquisitions and defensible wet/dry cadence within the approved Teluknaga, Banten padi field; RQ3 is the descriptive per-acquisition NDVI/NDMI valid-pixel availability and measurement limitations caused by that field's size and Sentinel-2 resolution; RQ2 independent raster comparison remains excluded from the active thesis and optional future work only. | 2026-08-30 | The advisor relayed agreement with the exact wording proposed by the thesis team. This closes wording review without expanding the one-field scope, adding a target N, or validating the provisional 9/3 floors as universal thresholds. | Active |
| **DEC-30** | **M1 passes its milestone acceptance under closure reference `M1-CLOSURE-2026-08-30`.** Closure evidence is OBS-19 (approved live feasibility report), OBS-20 (bounded source-provenance path proof), OBS-21 (complete local verification), DEC-27 (scope and 9/3 floors), DEC-28/ADR-15 (M2 provenance contract), DEC-29 (advisor-reviewed cadence and final RQs), the synchronized canonical documents, and the verified Notion progress log. | 2026-08-30 | Every M1 acceptance criterion in the implementation roadmap is now evidenced and reviewed. This closes M1 only: it does not close M0 remote-CI/credential/platform controls, implement M2, populate the app, or relabel research prototype outputs as production measurements. | Active; M1 PASS |
| **DEC-31** | **Implement M2 immediately after M1 closure, while separating local completion from hosted PASS.** The production measurement path uses a durable Supabase job plus typed measurement/per-index rows and an authenticated Node worker outside Expo rendering. To preserve native output grids, one measurement uses two same-acquisition Process API raster+`userdata` responses (NDVI 10 m; NDMI 20 m) and persists only when their complete source identities match. Saving/retrying a field explicitly requests the job; cards/detail read the security-invoker observation view. Independent raster comparison remains excluded. | 2026-08-30 | The developer explicitly requested completion of all M2 work. Official request-level output-grid behavior required amending DEC-28's one-response wording without changing its same-response provenance principle (EVID-028). Local migration/tests and live adapter smoke pass (OBS-22/23); hosted migration, server-only Supabase/CDSE configuration, public deployment, and authenticated app persistence/read smoke remain external gates, so M2 is not yet marked PASS. | Active; local implementation complete; public reachability sub-gate closed by OBS-24; hosted measurement gates open |
| **DEC-32** | **Preserve the 21 August thesis candidate and create a new 31 August synchronized DOCX/PDF candidate.** The new candidate incorporates the approved one-field Teluknaga RQ1/RQ3 scope and results, retires independent raster comparison from active acceptance, describes the locally verified M2 path without overstating hosted status, and records current public-backend reachability separately from hosted measurement persistence. The user-supplied PDF is replaced only after a recoverable backup and artifact verification. | 2026-08-31 | The uploaded/user-selected thesis still reflected the pre-closure two-polygon study and pre-M2 production architecture. A new reproducible artifact is required so the paper follows the canonical research, architecture, and deployment evidence without erasing the earlier audit trail. | Active; advisor approval still required |
| **DEC-33** | **Measurement requests return after durable enqueue and defer provider processing within the Vercel invocation.** When `EXPO_PUBLIC_API_URL` is configured it is authoritative; the client does not fall through to stale LAN addresses or replace a structured production error with a network timeout. The backend returns HTTP 202 after enqueue, uses Vercel `waitUntil` for the processing promise, and the detail screen polls persisted job/observation state. This is a latency remediation, not a claim of a separately scheduled durable worker. | 2026-08-31 | The synchronous provider path could exceed the mobile request lifetime, while fallback candidates hid the actionable backend response. Durable database state already exists; separating the response from provider I/O preserves honest status and prevents the phone from waiting on raster processing. | Active; production code/environment deployed and one hosted job manually completed under OBS-28; deployed deferred completion still needs a direct smoke |
| **DEC-34** | **Synchronize the latest user-confirmed thesis PDF, canonical repository records, and Notion against actual gate evidence.** Preserve the input PDF and create a separate dated revision; retain M1 acceptance and the distinction between a manually executed hosted success and failed device-deferred jobs. Close M0 before further live M2 execution; no approval, field result, credential rotation, or perfect-error-free completion may be inferred. | 2026-09-07 | The developer requested current cross-surface synchronization and sequential M0/M1/M2 completion, and confirmed `thesis fix (2).pdf` is the latest paper. | Active; external M0 controls, direct M2 device completion, and academic acceptance remain open |

| **DEC-35** | **Optional username/phone collisions must not abort Supabase Auth signup.** Preserve uniqueness, create the auth account and required `public.users` row, leave an already-owned optional value unset for later correction, and show bounded Indonesian client errors without raw provider or transport details. | 2026-09-07 | The hosted trigger previously converted optional profile uniqueness collisions into an opaque Auth HTTP 500, while the sign-up screen rendered the retryable response object and URL directly. | Active |

| **DEC-36** | **Build every connected Vercel backend project directly from `backend/` and make authentication a complete, keyboard-stable mobile flow.** Keep Express source ownership and direct framework detection under `backend/` with no repository-root server shim; persist Supabase sessions through mobile storage; complete email-verification redirects; use one branded, accessible auth component pattern; keep native input wrappers stable during focus; prevent Android password autofill/layout transitions from dismissing the keyboard; remove controls that imply unavailable remember/reset behavior. | 2026-09-08 | Repository-root detection failed first because no entrypoint existed and then because a re-export did not directly import Express. Three Vercel projects were attached to the repository with inconsistent roots. Login/sign-up also had raw errors, non-functional controls, no persistent storage adapter, no callback screen, and unstable field focus on the reported phone. The shared `AuthField` conditionally restyled its wrapper from `onFocus`; removing that state transition isolates the trigger reported across all sign-up fields. This row amends the earlier same-day root-adapter and password-only wording. | Active |

| **DEC-55** | Separate estimated NDVI from measurements; storage/import details are in data evaluation plan § 5 and architecture ADR-19. | 2026-09-25 | Developer request for the estimate state and dry-run-first import/historical queue scripts. | Implementation authorized; this task authorizes no live execution or deployment. |

## 6. Superseded ideas / set-asides

- **Independent raster comparison (RQ2/HYP-02).** Set aside by DEC-26 as optional
  M3/future work. It is neither an M1 blocker nor an active-thesis requirement and may
  return only through a new thesis-team/advisor-approved scope decision.
- **Hackathon framing (jurors' README).** The Indonesian "Panduan Implementasi Juri"
  (`README.md:1-91`) is superseded by the thesis framing; a thesis-oriented README is
  the direction (the 2026-07-23 "update IOS Thesis" / "update android app readme"
  commits `d131c94`, `ddaa304` begin this). Kept as historical origin, not current
  positioning.
- **Synthetic NDVI fixture fallback and synthetic detail analysis.** Removed by
  DEC-24. Provider/no-data failures now remain unavailable, and the detail screen
  plots only stored dated rows. DEC-31 later adds the local provenance-complete writer;
  removal itself remains a separate honesty correction.
- **AccuWeather.** Dropped from the default architecture (superseded by DEC-07 /
  Open-Meteo). Time-limited free access; not thesis-relevant.
- **Commercial Sentinel Hub account** (`services.sentinel-hub.com`). Superseded by
  DEC-04 (CDSE free tier).
- **Sentinel-1 (SAR).** The earlier post-thesis set-aside is amended by DEC-54/55.
  Estimate persistence and import semantics live in data evaluation plan § 5;
  the separate write/read boundary is recorded in architecture ADR-19.

## 7. Glossary (EN ↔ ID)

### Domain terms

| Indonesian | English | Notes / provenance |
|------------|---------|--------------------|
| **lahan** | field / plot | The **database table name** for stored field polygons (`supabase_setup.sql:5`). |
| **ladang** | farm field | The **UI tab** name for the field-management surface (`app/(tabs)/explore.tsx`; e.g. commit `7b31ee4` "ui ladang gacor lur"). |
| **petani** | farmer | The end user Matani serves. |
| **jagung** | maize / corn | Legacy pre-DEC-24 category; no longer accepted or presented as active scope. |
| **padi** | rice (paddy) | The only active product and thesis crop category (DEC-24). |
| **kedelai** | soybean | Legacy pre-DEC-24 category; no longer accepted or presented as active scope. |
| **teh** | tea | Legacy pre-DEC-24 category; no longer accepted or presented as active scope. |
| **kopi** | coffee | Legacy pre-DEC-24 category; no longer accepted or presented as active scope. |
| **cuaca** | weather | Weather surface / provider bridge. |
| **beranda** | home | The home tab. |
| **edukasi** | education | The education-articles surface (`constants/education.ts`, `app/(tabs)/education.tsx`). |

### Data-state vocabulary (from [`../AGENTS.md`](../AGENTS.md) § Vocabulary)

| Term | Meaning |
|------|---------|
| **fixture** | Labeled test data; deterministic, used in fixture-first testing (DEC-09). |
| **prototype** | Partially wired and **non-provenance-safe** research/legacy output; never a current M2 measured row. |
| **measured** | Persisted and **provenance-complete** — every value carries its origin. |
| **unavailable** | An **honest absence** of data, stated rather than papered over. |
| **estimated** | A model-derived value (radar → NDVI), stored separately from measurements, always labeled with its model, radar source and evaluated error, and never counted as an observation (DEC-55). |

### Index expansions

| Acronym | Expansion |
|---------|-----------|
| **NDVI** | Normalized Difference Vegetation Index — Sentinel-2 vegetation index. |
| **NDMI** | Normalized Difference Moisture Index — Sentinel-2 moisture index. |
| **GROW** | Gathering, Recognizing, Offering, Warning — the thesis paper's application-specific decision-support workflow (DEC-14). A paper-defined framing, not an external methodology. |

## Research preparation decision (2026-09-10)

| ID | Decision | Date | Basis | Status |
|---|---|---|---|---|
| **DEC-45** | Prepare a measurement-led hybrid thesis and AGERS submission using existing Teluknaga records and controlled offline technical evaluation. Work on analysis and writing together; pause unrelated M4 cleanup. Prepare the advisor packet before the earliest September 15-19 meeting. The developer reports no mandatory participant UAT. Propose deferring agronomic HYP-05 validation and making no usability claims. | 2026-09-10 | Explicit developer selection and instruction to implement the AGERS preparation plan. The statement that M0-M2 are fine authorizes this bounded preparation, not invented gate evidence. | Engineering preparation authorized; methodology amendment and final academic acceptance await advisor review. |

The [execution plan](../plans/016-agers-research-preparation.md) owns tasks and dates.
The [research protocol](research-protocol.md#17--proposed-participant-free-evaluation-amendment) owns the proposed method; EVID-041-046 own conference facts. DEC-34's evidence-honesty constraints remain intact; DEC-45 permits offline M3 preparation while historical gate records stay dated.


### DEC-46 — Replacement-study preparation (2026-09-10)

The developer authorized preparation of a replacement secondary-data study after original geometry recovery failed, with Teluknaga first. Public-source screening, a proposed case/window, reproducibility manifest and bounded request plan are in scope. Magelang is a fallback candidate only, not a selected location. Academic changes remain advisor-review proposals. No new approval or original 32/86 evidence is inferred. The execution details live in [the replacement preparation plan](../docs/m3-replacement-study-plan-2026-09-10.md).


### DEC-47 — Source quality before location (2026-09-14)

| ID | Decision | Date | Basis | Status |
|---|---|---|---|---|
| **DEC-47** | Remove the Teluknaga-first constraint from replacement-source screening. Prioritize traceable rice labels, documented year, explicit reuse terms and meaningful geometry. | 2026-09-14 | The developer explicitly prefers defensible data over forcing Teluknaga. | Screening authorized; no replacement location selected or advisor approval inferred. |

This supersedes only DEC-46's geographic search priority. Retain the Indonesian padi
scope while comparing sources; a move outside Indonesia would be a further scope
proposal. Preserve Teluknaga screening artifacts and their limitations. Do not rank
sites by favorable satellite availability outcomes. The proposed method remains owned
by research protocol §18; the replacement preparation plan owns execution.


### DEC-48 — Advisor feedback reported by the developer (2026-09-15)

The developer supplied the advisor's message supporting the focus, accepting no
interviews/UAT within the stated scope, and supporting AGERS as the target. Conditions:
compare inward-buffered and original geometry; foreground the complete-pair versus
independent-index display policy as the proposed contribution; define comparison metrics
before acquisition; restrict conclusions to data availability, without farmer-benefit
claims. This is reported advisor feedback, not conference acceptance or a determination
that novelty has been established. Exact site, sample, buffer distance and processing
contract were not specified by the advisor. Earlier pending-review records remain history;
research protocol §19 owns the current methodological response.


### DEC-49 — Phase 1 specification choices (2026-09-15)

Under the developer's request to complete Phase 1 and DEC-48's advisor feedback, the
assistant specifies one primary mapped block (saved tile 42 candidate, Krangkeng,
Indramayu) and calendar 2021. The choice follows the existing first-candidate order,
not satellite outcomes. The other two remain documented alternatives, not automatic
substitutes or additional sites. Use original/10 m inward-buffer masks on common
rasters. These are implementation/method specifications made during authorized planning,
not a claim that the advisor selected the exact site or buffer distance. Changes require
a dated amendment before dependent acquisition. Protocol §20 owns the frozen method.


### DEC-50 — Bounded Phase 2 execution (2026-09-15)

The developer explicitly requested Phase 2 after the Phase 1 specification. Executed
one bounded live pilot: cap 1 authentication, 4 catalogue and 2 Process requests, no
retries and sequential execution. OBS-63/64 own actual outcomes. The instruction and
successful pilot do not authorize automatic full-year raster expansion or submission.
Account allowance remains a separate unresolved input for scaling collection.

### DEC-51 — Bounded Phase 3 collection (2026-09-15)

The developer requested completion of Phase 3, supplied the account-quota dashboard
(OBS-65), then explicitly instructed continuation. Collect the remaining 70 catalogue
dates using the frozen DEC-49 specification and existing Phase 2 catalogue/pilot.
Operational bounds: 140 new Process attempts, up to 10 authentication attempts,
sequential execution, no automatic Process retries and no new catalogue requests.
Stop before further requests when reported processing consumption reaches 10 units
or consumption is unknown. This is a response-based stopping threshold, not a hard
provider-side PU limit; the last response may cross it. Preserve attempts across restarts.
No purchase, subscription change, production database write or manuscript submission
is included. Phase 3 may retain honestly unresolved records; no replacement dates or
post-outcome quality changes are authorized.

DEC-51 operational recovery amendment (2026-09-15): collection stopped after the
February 15 NDVI attempt timed out without a saved response. Preserve it as unresolved
and do not retry it. Under the developer's Phase 3 completion request, resume the remaining
requests with the original 140-attempt cap unchanged. The 10-unit stopping threshold
therefore applies to reported consumption, plus one explicitly unknown timeout charge;
no exact total-use or hard 10-unit-total claim is permitted. Any additional unknown charge
stops collection again. Preserve the initial code/contract and the dated recovery record
alongside the amended executor. This changes execution recovery, not scientific settings.

DEC-51 second operational recovery amendment (2026-09-15): the February 20 NDVI
attempt also failed without a saved response. Retain both interrupted indices and keep
the 140-attempt cap unchanged. Use the already-installed production `node-fetch`
transport for remaining authentication/Process requests. The reported-unit threshold
now excludes two explicitly unknown charges; any additional unknown charge stops again.
Preserve both earlier executor versions and the first recovery record. No scientific
setting, source selection or quality criterion changes.

### DEC-52 — Recover the two interrupted NDVI downloads (2026-09-15)

The developer explicitly requested retries before proceeding to Phase 4 after discussing
possible connectivity failures. Authorize one additional attempt for each interrupted NDVI
request (February 15 and February 20), capped at two new Process requests and one
authentication attempt. Preserve identical request bodies, accept either passing or
quality-rejected observations, and verify compatibility with the already-saved NDMI.
Keep the original failures and first frozen dataset intact; freeze any recovered results
as a new revision linked to the original. This supersedes DEC-51's no-retry restriction
only for these two downloads. The exact cause of the original transport failures remains
unconfirmed; neither bad Wi-Fi nor absent satellite observations has been established.

### DEC-53 — Expand and format the full paper (2026-09-15)

The developer explicitly approved Phase 7: use `thesis fix-2.pdf` as the benchmark
for depth, section coverage and reference usage; target 6,000–7,000 pre-reference
words and approximately 35–45 relevant references; audit all 38 previous entries;
retain the frozen Krangkeng results; and deliver Markdown, editable DOCX and PDF
using the existing A4 conference template. Reuse author information provisionally
and flag it for thesis-team verification. Preserve original source files and defer
expansion of the separate chapter-based thesis. This authorizes the full-length
review draft, not submission, venue page-limit approval or academic acceptance.

### DEC-54 — ML evaluation direction for the AGERS paper (2026-09-25)

The developer reported that the reviewer suggested moving the paper towards ML and will
train the models. The developer chose Sentinel-1 → NDVI estimation over mapped-rice blocks
as the paper's question (Random Forest and XGBoost, radar-only inputs, leave-one-tile-out
evaluation, gap-length comparison against interpolation). This is the separate scope
decision the product brief required before any SAR work. The frozen Krangkeng observation
study stays unchanged as motivation. Rationale and datasets:
`docs/matani-ml-direction-agent-brief.md`. Canonical method: `docs/matani-ml-technical-spec.md`.
Choices fixed before model fitting:
- Sampling: 42 pool blocks (3 per window × 14 windows) plus Krangkeng as the showcase.
- Target: target-v1, valid fraction ≥ 0.8 (HYP).
- Matching: nearest pass within ±3 days (HYP), from **both** orbit directions, with
  same-orbit history. This revised the single-orbit rule after the Krangkeng pilot
  acquisition counts (OBS: 12 vs 18 of 23 clear dates matchable).

Pilot OBS (2026-09-25): the new extraction reproduced the frozen study exactly: 71
acquisitions, the same 23 clear dates, NDVI within 5 × 10⁻⁵. This does not approve the
paper or establish model accuracy.

### DEC-62 — two display rules for radar estimates in Matani (2026-09-29)

The single 60-day rule (DEC-60) is replaced by two provisional rules, one for each baseline that applies to the gap. The chart draws neither baseline; the rules only decide whether an estimate is shown. This follows the reviewer's natural-gap comparison (DEC-61).
- **Bracketed gap** (a qualifying observation on both sides): an estimate is shown when the interval is at least 80 days (`MIN_BRACKETED_GAP_DAYS`). Interpolation is the baseline here. Radar was worse in every bin up to 60 days, and beyond 60 days no difference was detected. The exploratory linear crossover was 78.6 days for RF (block-bootstrap 95 % CI 58–152, extending beyond the longest observed gap) and 83.3 for XGBoost.
- **Open gap:** after the last observation, an estimate is shown when that observation is at least 20 days away (`MIN_OPEN_GAP_DAYS`). Persistence (LOCF) is the baseline here; the fitted crossover was 19.4 days for RF (CI 16.6–22.7) and 19.5 for XGBoost, and radar was clearly better beyond 30 days. Before the first observation the same cutoff is applied by symmetry, which was not evaluated separately.

Both cutoffs are rounded crossover points, chosen for the prototype; they are not validated thresholds. The UTC-calendar-day convention, the 3-day measurement precedence and "no estimate without an observation" are unchanged. The code is `utils/estimate-timeline.ts`, tested in `tests/estimate-timeline.test.mjs`. For Krangkeng 2021, 8 of 52 radar passes are shown, all before the first observation on 17 March; the 65-day October–December gap is below 80 days, so the chart shows no estimate there.

### DEC-61 — the reviewer's 12-ablation pipeline is the paper's result (2026-09-29)

The reviewer built his own pipeline, `research/pipelines/` (a data-prep notebook, 12 experiment notebooks, and parquet outputs), on ml-dataset-v2. The developer decided to follow it. It supersedes DEC-57's `team-run-v2-final` and the gap-masking experiment as the paper's results; both stay on disk for audit.

The 12 ablations are:
- **Primary:** RF vs XGBoost under leave-one-tile-out; feature sets F2, F0, F0+F1 and F0+F1+F2; five seeds; MAE, RMSE, R² and bias.
- **Operational:** radar vs interpolation, and radar vs LOCF, across natural optical-gap length; the linear gap-length crossover.
- **Robustness:** held-out region; NDVI range; S1–S2 offset; flagged observations.
- **Optional:** random vs grouped vs spatial split.

His pipeline code is treated as given. We add sampling uncertainty (a block cluster bootstrap on his row-level predictions, `research/scripts/reviewer_ci.py`), which asserts equality with his point estimates. The reviewer is acknowledged, not added as an author (developer's choice). GPT-6 Astra reviews our integration (paper, CI script, figures, app), not his ML process.

### DEC-60 — the paper is "Matani + ML" (2026-09-28)

The reviewer advised keeping Matani in the paper ("matani + ml aja … klo pure ml nanti susah novelty-innya"), because a pure-ML paper would struggle to show novelty. The developer adopted this. The paper lists three contributions: the region-held-out evaluation, the gap-length crossover, and Matani applying the crossover as a display rule. Radar estimates are shown only within optical gaps of at least 60 days (`MIN_ESTIMATE_GAP_DAYS` in `utils/estimate-timeline.ts`, tested), labelled with their evaluated MAE. The demonstration uses a local Supabase only, and production is untouched. The paper states that Matani is an unreleased prototype not evaluated with users.

### DEC-59 — no citation for Matani or the unpublished delivery-policy study (2026-09-28)

Matani is the authors' own unpublished system and is described in the text, not cited. The earlier delivery-policy analysis of the Krangkeng block has not been submitted or published, so the ML paper no longer calls it "an earlier study". Its Krangkeng figures (71 acquisitions, 23 passing Matani's quality rule, the 65-day gap and the 75-day absence) are stated as this study's own measurement, which the ML extraction reproduces and the build gates. If the delivery-policy paper is later submitted or published, cite it in the Introduction and have each paper acknowledge the other.

### DEC-58 — house style and AI-use disclosure for the ML paper (2026-09-28)

The developer adopted the reviewer's IEEE paper (GRACE-LAKSA) as the layout and wording reference: italic affiliation lines, "Index Terms", "TABLE I:" captions with three-rule tables, "Fig. 1:" captions and "1)" lists (paper-best-practice R15). The six-section structure was kept. Review-trace wording is banned from the paper (R16). The paper gets an Acknowledgment that fully discloses AI assistance in code, analysis, drafting and review. All authors must confirm its wording before submission. On 2026-09-28 the developer chose calmer standard wording (the tools, Sections I–VI, the code behind Tables I–III and Figs. 1–3, and the analysis check; content "reviewed, revised and verified by the authors"). This wording is conditional on the authors' own revision pass.

### DEC-57 — the team trains the models (2026-09-28)

The developer decided that the team trains the models itself, because the reviewer may not have time before the 1 October deadline. The primary result is `team-run-v2-final`: the frozen harness `research/ml-handoff/example_train.py` run on ml-dataset-v2 with data and prediction hashes recorded in `env.txt` (OBS-83). The earlier runs `reference-run-v2` and `team-run-v2` reproduce it and are kept for audit. DEC-54's role split (the reviewer fits the models) becomes optional; any reviewer run is a replication check through `rebuild-ml-paper.sh`, which is hash-bound to the dataset.

The safeguards do not depend on who runs the harness:
- the splits were frozen before fitting;
- tuning happens only inside the training tiles, and each test tile is predicted once;
- the harness settings were written before any test result and are unchanged, except for the added data hashes (rerun matched within 6 × 10⁻¹⁶);
- the one post-result change, the F1 fix, was adopted whatever its outcome under README §5.5.

Disclose that the same team built the data and fitted the models.

### DEC-56 — adopt ml-dataset-v2 (per-track radar history) (2026-09-28)

The developer approved fixing the confirmed F1 orbit-mixing bug (OBS-79). The fix builds a new dataset version with history per relative orbit, reruns the reference harness, and adopts v2 whatever the result, following README §5.5. External review is run with GPT-6 Astra (high effort). ml-dataset-v1 and evaluation-v1 remain unchanged for audit. The model trainer must use `ml-dataset-v2` from now on. Results: OBS-80.

### DEC-55 — "estimated" data state in Matani (2026-09-25)

The developer approved full app integration before the deadline. Radar-model NDVI
estimates become a fifth, visibly distinct data state, **estimated**. They live in
`public.ndvi_estimates` and are never written to measurement tables (ADR-19).
- In the app, they show only on the NDVI chart, as dashed diamonds with a text legend.
  Measured values within ±3 days always win.
- Held-out estimates are shown only as a comparison inside a measured point's detail.
- Estimates are excluded from AI summaries, latest-value cards and the chronology.

This narrows the earlier "does not synthesize missing observations" wording. Matani still
never presents a synthetic or estimated value as measured. The thesis and paper text must be
revised to match.

The 2021 Krangkeng observations reach the app through the existing measurement worker,
with no new measurement write path.
