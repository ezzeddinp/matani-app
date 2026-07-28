# Matani Thesis Revision — Notion Point 21

**Document type:** Revision traceability report  
**Status:** Applied and cross-checked in `.agent/thesis-revised-point-21.docx`; a cache-safe duplicate is available as `.agent/thesis-revised-point-21-aligned-2026-07-28.docx`
**Updated:** 2026-07-28
**Source paper:** `.agent/thesis.docx` (preserved unchanged)  
**Coordination source:** [Matani — Centralized Knowledge Base](https://app.notion.com/p/3a9434da822c80e9b8c7ee920b1e94dc), sections 21–22  
**Canonical project constraints:** `.agent/` documents in the precedence order defined by `AGENTS.md`

## Outcome

The revised paper uses the title **“A Mobile Decision Support Application for Rice Crop Condition and Climate Risk Classification Using NDVI, SWIR-Derived Moisture Indicators, and Weather Data”** (DEC-19). It describes the implemented approach as rule-based classification, HYP-04/HYP-07 prototype heuristics, and optional generative-AI summarization. It does not present the current satellite path as measured or thesis-ready. A second repository-wide cross-check also changed evaluation statements from completed-sounding present tense to planned procedures, separated the five-crop product scope from rice-only thesis scope, corrected the provider boundary, and removed unsupported alert/profile claims (DEC-15 / DEC-20).

The 2026-07-28 recheck found that an older copy of Section E/F described the
polygon-exact M2 target in present tense and then contradicted it with the current bbox
prototype limitations. That wording is invalid. The clean document now states the
as-built bbox behavior first and identifies polygon-exact statistics only as target
work. Both current deliverables pass DOCX ZIP/XML validation, contain none of the
contradictory phrases, and have identical SHA-256 content hashes. See
`docs/thesis-ef-alignment-cross-check-2026-07-28.md`.

The revision script is reproducible:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/revise-thesis-point-21.ps1
```

## Point-21 risk traceability

| Risk | Applied revision | Trace |
|---|---|---|
| 1. ML promised but absent | Removed ML from abstract/keywords/current contribution; retained ML literature and scoped trained ML to future work. | Revised paragraphs 21, 22, 42, 53, 56, 335 |
| 2. Satellite limitations incomplete | Added bbox, Jakarta fallback, fixed 1–5 Sep 2025 window, no versioned SCL mask, labeled fixture fallback, synthetic detail history, and no persistence. | Revised paragraphs 111, 114, 124, 125, 186, 260 |
| 3. NDVI threshold citations imply support | Moved literature support to general NDVI use; labeled 0.60/0.20/0.00 as author-defined HYP-04 ranges pending local calibration. | Revised paragraphs 127, 130, 136–152 |
| 4. Mapping vs classification | Retitled to “Climate Risk Classification” (DEC-19). | Revised paragraphs 1, 56, 257, 325 |
| 5. Risk-score architecture mismatch | Paper now states the score is calculated client-side in the mobile presentation layer. | Revised paragraphs 162, 274 |
| 6. Unqualified five-day revisit | Qualified it as nominal under full-constellation/cloud-free conditions and separated it from usable tropical observation frequency. | Revised paragraph 76 (EVID-006 limitation) |
| 7. Provider direction | Kept AccuWeather→Open-Meteo as-built and marked Open-Meteo-default plus CDSE migration as target work. | Revised paragraphs 154, 260, 275 |

## Additional point-21 corrections

1. Current NDVI/NDMI output is never called a field measurement.
2. Gemini is described as optional generative summarization, not ML classification.
3. The weather-risk score is explicitly uncalibrated HYP-07.
4. Detail-screen pest/disease/stress values are scoped as labeled fixture demonstrations, not observations or diagnoses.
5. No five-day monitoring cadence is promised.
6. The paper states that `lahan_health` has no measurement writer and no provenance-complete historical records.
7. The architecture text distinguishes as-built prototype boundaries from the thesis-target worker/quality/provenance architecture.
8. Functional tests must record `fixture`, `prototype`, `measured`, or `unavailable`.
9. Limitations state that no ground truth means no current agronomic-accuracy claim.
10. Future M0–M3 work is written as required target work, not completed acceptance criteria.

| Paragraph(s) | Before | After |
|---|---|---|
| **1 — Title** | “A Mobile Decision Support Application for Rice Crop Condition and Climate Risk **Mapping**…” | “A Mobile Decision Support Application for Rice Crop Condition and Climate Risk **Classification**…” |
| **21 — Abstract** | Presented Matani as integrating satellite monitoring and weather warnings, with **machine learning used to analyze vegetation trends, anomalies, and risk signals**. | Describes Matani as a rice-focused DSS using **rule-based classifications and optional generative-AI summarization**. Explicitly states that the satellite path is a prototype, uses a bbox and fixed demonstration window, lacks SCL masking and provenance persistence, and may display labeled fixture data. |
| **22 — Keywords** | Included “machine learning” and “multispectral satellite data.” | Replaced with “NDMI,” “Sentinel-2,” “rule-based classification,” and “measurement provenance.” |
| **42, 53, 335 — Machine learning** | Claimed time-series analysis could identify anomalies and described Matani as using “machine learning-supported classification.” | Current history is identified as a synthetic fixture. Trained anomaly detection and ML are classified as **future work unless implemented and evaluated**. Current implementation is rule-based with optional generative-AI summarization. |
| **46 — Weather analysis** | Claimed Matani analyzes precipitation, temperature, humidity, soil moisture, dry days, heatwaves, and inundation risk together with NDVI trends. | States that the current implementation uses precipitation and humidity in a **client-side heuristic score**. Dry-day, heatwave, and inundation indicators are future extensions. |
| **56 — Methodology** | Described “climate risk mapping,” heuristic scoring, and AI-assisted recommendation generation without clearly separating current and target functionality. | Uses “climate risk classification,” distinguishes the current prototype from the thesis-target measurement pipeline, identifies NDVI thresholds as HYP-04 and weather risk as HYP-07, and separates five-crop product scope from rice-only thesis evaluation. |
| **61 — GROW workflow** | Implied that Sentinel-2 data are acquired, processed, and used to generate alerts and recommendations. | States that current inputs may be prototype or fixture data. GROW must expose the data state, and the target workflow must produce persisted quality-gated measurements or an explicit unavailable outcome. |
| **76 — Sentinel-2 cadence** | “10–20 m spatial, **5-day revisit**.” | “10–20 m native band resolution; **nominal five-day revisit under full-constellation/cloud-free conditions**, with lower usable frequency under tropical cloud cover.” |
| **108, 179 — Recommendations and Gemini** | Described “prioritized recommendations and alerts” generated using Gemini and synthesized field inputs. | Reframed them as optional contextual summaries. Gemini is explicitly **not a classifier, sensor, measurement source, ground truth, or validated agronomic adviser**. |
| **111 — Field boundary** | Said the polygon bbox is used to query satellite statistics without explaining its measurement implications. | Clarifies that the bbox is only an implementation envelope and cannot be treated as the actual field boundary for validated field-level measurement. Polygon-exact statistics are required in the target pipeline. |
| **114 — Sentinel-2 bands** | Stated that B04, B08, and B11 are used for NDVI and NDMI. | Adds the native-resolution distinction: B04/B08 are 10 m, B11 is 20 m, and resampling B11 does not create genuine 10 m spatial detail. |
| **124 — API response** | Treated returned NDVI/NDMI statistics as daily summaries over the requested period. | States that an API response or in-range index value does **not** establish a valid Matani measurement without valid geometry, quality assessment, provenance, and persistence. |
| **125 — Current satellite pipeline** | Only disclosed that the prototype uses a fixed demonstration time window. | Adds all current limitations: fixed 1–5 September 2025 window, bbox request, Jakarta fallback, no versioned SCL mask, labeled synthetic fallback, simulated detail history, and no provenance-complete persistence. |
| **127, 130, 136–152 — NDVI classification table** | Used “Very Healthy,” “Monitoring Required,” “High Stress,” and “No Vegetation,” citing literature near the thresholds. | Changed to “High Greenness,” “Moderate Greenness,” “Low Greenness,” and “Negative NDVI.” The 0.60/0.20/0.00 boundaries are explicitly author-defined **HYP-04 prototype ranges**, not literature-established health thresholds or diagnoses. |
| **154 — Weather providers** | Described AccuWeather as primary and Open-Meteo as fallback. | Retains AccuWeather → Open-Meteo as the **as-built order**, while identifying Open-Meteo-default as target architecture that has not yet been implemented. |
| **155, 162, 175 — Weather-risk score** | Described weather inputs as actionable risk levels and used “significant risk, protective action recommended.” | Identifies the score as an author-defined, client-side, uncalibrated HYP-07 heuristic. “High heuristic indicator; field verification required” replaces the prescriptive warning. |
| **181–186 — Evaluation** | Functional and API tests sounded completed and were presented alongside “conceptual validation,” including the claim that mature healthy canopies should exceed 0.6 even without field-level ground truth. | Explicitly states that no automated suite or completed UAT dataset exists. All procedures are planned; future tests must record `fixture`, `prototype`, `measured`, or `unavailable`. Literature comparison is only conceptual plausibility. |
| **257 — Product positioning** | Positioned Matani as integrating Sentinel-2 monitoring, risk scoring, and AI-assisted farmer recommendations. | Positions Matani as a rice-focused DSS **prototype** with state-labeled inputs, an uncalibrated heuristic, and optional summaries—without claiming provenance-safe measurement or diagnosis. |
| **260 — Limitations and future work** | Mentioned only the fixed time window, heuristic calibration, future field validation, and time-series analysis. | Adds bbox/Jakarta fallback, missing SCL mask, no valid-pixel accounting, no persistence, synthetic field-list/detail data, no ground truth, no validated cadence, and explicit M0–M3 future-work boundaries. |
| **270, 272 — Architecture framing** | Presented one general three-layer architecture as the Matani system architecture. | Distinguishes the **as-built prototype boundary** from the thesis-target worker, quality gate, provenance persistence, and research workspace. |
| **273 — Presentation layer** | Claimed the mobile application provides NDVI/NDMI visualization, risk alerts, recommendations, and field notes. | States that the application displays labeled prototype/fixture output and a client-side heuristic indicator, and does not currently provide a production alerting system. |
| **274 — Processing layer** | Claimed the Express backend calculates the heuristic risk score. | Corrected the implementation: the score is calculated in the **mobile presentation layer**, while the backend proxies satellite, weather, and Gemini requests. |
| **275 — Database and external services** | Claimed Supabase stores “historical crop condition records.” | States that `lahan_health` exists but there is currently **no measurement writer and no provenance-complete historical crop-condition storage**. Also separates as-built provider order from target migrations. |
| **325 — Appendix title note** | Said the title focuses on climate risk and the selected data sources. | Explains that “Classification” is used because Matani assigns a scalar class/score to a field rather than producing a spatial risk raster. |

## Code alignment applied with this revision

- Home no longer hard-codes “Sangat Sehat” or `NDVI: 0.65`; stored values are labeled prototype and absence is explicit (`app/(tabs)/index.tsx`, CODE).
- Ladang cards tag synthetic fallback as `fixture`, live-response values as `prototype`, and show “Simulasi demo” / “Bukan pengukuran satelit” (`app/(tabs)/explore.tsx`, CODE).
- NDVI classes now use greenness language rather than health diagnosis language (`constants/ndvi.ts`, HYP-04 / DEC-11).
- Field detail carries a persistent fixture banner and re-scopes all risk/harvest/advice content as synthetic, non-diagnostic demonstration (`app/detail-lahan-page.tsx`, CODE).
- Weather risk is labeled as a client-side, uncalibrated heuristic (`app/(tabs)/weather.tsx`, HYP-07 / DEC-16).
- Weather requests now stay behind the backend `/weather` boundary; duplicate direct mobile Open-Meteo fallbacks were removed (`app/(tabs)/index.tsx`, `app/(tabs)/weather.tsx`, ADR-10 / DEC-20).
- AI payloads include the data state, and the backend prompt forbids measurement/diagnosis conversion and chemical-application instructions (`app/(tabs)/explore.tsx`, `backend/api/ai/route.js`, DEC-20).
- Profile and Notifications no longer imply stored alerts, usage tracking, measured NDVI averages, agronomic productivity scores, or persisted expertise badges (`app/(tabs)/profile.tsx`, `app/notifications.tsx`, DEC-20).
- Crop focus and thumbnails use the persisted crop category instead of guessing from the field name (`app/(tabs)/explore.tsx`, CODE).

These changes improve honesty of the existing prototype but do not implement M2. The bounding-box request, fixed demonstration window, missing SCL rule, lack of provenance persistence, and production fixture fallback remain open exactly as stated in `.agent/project-architecture.md` § 2.
