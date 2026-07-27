# Matani · Thesis-Paper Corrections

**Document type:** Working corrections list for the thesis paper ("thesis fix.pdf", July 2026 revision)
**Audience:** The thesis team and advisor
**Status:** Applied and cross-checked in `.agent/thesis-revised-aligned.docx`; original `.agent/thesis.docx` preserved; `.agent/thesis-revised-point-21.docx` superseded
**Updated:** 2026-07-27
**Context:** Produced during the DEC-14 alignment of the `.agent/` suite with the paper. Same format as the paper's own "Main Corrections Applied" appendix. Priority: 1–2 are defense risks; 3–5 are accuracy fixes; 6–7 are wording hardening.

**Applied artifact:** The current reproducible generator is
[`../scripts/revise-thesis-point-21.ps1`](../scripts/revise-thesis-point-21.ps1).
Paragraph-level traceability for all seven risks and ten additional corrections is in
[`../docs/thesis-revision-point-21.md`](../docs/thesis-revision-point-21.md). The Notion
coordination source is
[Matani — Centralized Knowledge Base](https://app.notion.com/p/3a9434da822c80e9b8c7ee920b1e94dc),
sections 21–22. Canonical factual and methodological claims still defer to the higher-
precedence `.agent/` documents.

The 2026-07-27 cross-check also corrected claims outside the original seven-item list:
evaluation procedures are now future/planned rather than completed tests; the five-crop
product scope is separated from rice-only thesis scope (DEC-15); notification/profile
capabilities are not overclaimed; the backend provider boundary and external presentation
services match code (DEC-20 / ADR-10); and comparison-table “mapping” wording follows
DEC-19. The complete matrix is
[`../docs/alignment-cross-check-2026-07-27.md`](../docs/alignment-cross-check-2026-07-27.md).

| # | Issue in current draft | Suggested correction |
|---|------------------------|----------------------|
| 1 | **Machine learning is promised but absent from the methodology.** The abstract and keywords position ML as a decision-support mechanism ("analyzing vegetation trends, growth anomalies, and weather-related risk signals"), but the methodology contains no ML: crop condition uses fixed NDVI thresholds, climate risk uses a hand-weighted heuristic formula, and Gemini is generative summarization — not trend/anomaly ML. An examiner can fail this on a definition question. | Either (a) soften the abstract/keywords to "rule-based classification and threshold heuristics with AI-assisted recommendation summarization, with machine learning positioned as future work," or (b) add one real, simple ML element that the prototype actually runs (e.g. a time-series anomaly flag on NDVI history) and describe it honestly. Do not keep "machine learning" in the keywords if (a). |
| 2 | **The prototype's satellite limitations are only partially disclosed.** § F/L discloses the "predefined demonstration time window" but not the rest of the as-built behavior: the backend queries a **bounding box, not the drawn polygon** (falling back to a hard-coded Jakarta bbox); the field-list surface **silently substitutes synthetic NDVI** when the API returns nothing or errors; and the field-detail NDVI history is **fully simulator-generated**. If Functional Testing (§ K.1) reports "NDVI/NDMI indicator display" as verified without stating the data source, synthetic data is implicitly presented as measured — the exact failure the honesty constraints exist to prevent. | Add 2–3 sentences to § F or § L, e.g.: "In the current prototype, index statistics are computed over the field's bounding box rather than the exact polygon geometry, and the mobile interface displays simulated NDVI values when live retrieval is unavailable; these values are demonstration data, not measurements. Replacing the bounding-box query with polygon-exact statistics and replacing simulated fallbacks with explicit no-data states is required before any field validation." Then state in § K.1 which tests ran against live vs demonstration data. |
| 3 | **Table III citation placement implies literature support for the specific cutoffs.** [4], [6], [9] discuss NDVI for rice generally; none establishes the 0.60 / 0.20 / 0.00 class boundaries. The caveat paragraph under the table is good — the citation anchoring is the problem. | Move [4], [6], [9] into the prose sentence about NDVI's general use, and state plainly that the specific thresholds are prototype-defined interpretation ranges chosen by the authors, pending local calibration (consistent with the existing caveat). |
| 4 | **"Climate Risk Mapping" in the title, but the system delivers per-field risk classification.** No spatial risk map is produced; the output is a scalar 0–100 score per field/location. | Either retitle ("…and Climate Risk Classification Using…") or add a sentence defining "mapping" as field-level risk assignment on user-defined field boundaries, so the title term is explicitly operationalized. |
| 5 | **Architecture misstatement: risk-score calculation location.** § M assigns "heuristic risk-score calculation" to the backend application processing layer; in code it runs client-side in the mobile app (`app/(tabs)/weather.tsx:541-576`). | Either correct § M ("heuristic risk scoring is currently computed in the presentation layer; migrating it to the processing layer is planned"), or move the computation server-side before submission and keep the text. Pick one; don't leave the mismatch. |
| 6 | **Table I states "5-day revisit" without qualification.** Nominal 5-day revisit is an acquisition cadence under cloud-free, full-constellation conditions; tropical cloud cover materially reduces usable observations. Left bare, it reads as a monitoring-cadence promise. | Qualify: "10–20 m spatial, 5-day nominal revisit (usable observation frequency is lower under tropical cloud cover)". One clause, defense-proof. |
| 7 | **Weather-provider description is accurate as-built but silent on direction.** AccuWeather-primary + Open-Meteo fallback matches the code today; the project's target architecture drops AccuWeather (time-limited free access) for an Open-Meteo default. | No correction required for accuracy. Optionally add to future work: "consolidating on the open Open-Meteo API as the default weather source." Similarly, future work may note migration of satellite access to the Copernicus Data Space Ecosystem free tier. |

## Already sound (keep as is)

- The heuristic risk formula and NDVI thresholds are explicitly labeled uncalibrated prototypes with future-calibration language — this is the right posture (matches HYP-04/HYP-07).
- ML reframing away from exact yield/disease prediction (Corrections Appendix) — correct direction; issue 1 is about finishing that move.
- § K.5 honestly scopes evaluation to technical correctness, API reliability, and usability, not agronomic accuracy.
- The limitations section (§ L) and the corrections appendix show real revision discipline.
