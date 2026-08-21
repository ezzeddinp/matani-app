# Matani · Thesis-Paper Corrections

**Document type:** Working corrections list for the thesis paper ("thesis fix.pdf", July 2026 revision)
**Audience:** The thesis team and advisor
**Status:** Applied in audited candidate `.agent/thesis-aligned-2026-08-21.docx` and PDF; all source drafts preserved; advisor approval pending
**Updated:** 2026-08-21
**Context:** Produced during the DEC-14 alignment of the `.agent/` suite with the paper. Same format as the paper's own "Main Corrections Applied" appendix. Priority: 1–2 are defense risks; 3–5 are accuracy fixes; 6–7 are wording hardening.

**Applied artifact:** The current reproducible generator is
[`../scripts/finalize-thesis-2026-08-21.ps1`](../scripts/finalize-thesis-2026-08-21.ps1),
with Word PDF export through
[`../scripts/export-thesis-pdf.ps1`](../scripts/export-thesis-pdf.ps1).
Paragraph-level traceability for all seven risks and ten additional corrections is in
[`../docs/thesis-revision-point-21.md`](../docs/thesis-revision-point-21.md). The Notion
coordination source is
[Matani — Centralized Knowledge Base](https://app.notion.com/p/3a9434da822c80e9b8c7ee920b1e94dc),
sections 21–22. Canonical factual and methodological claims still defer to the higher-
precedence `.agent/` documents.

The 2026-08-21 audit confirms all seven historical risks below are resolved in the
candidate and also corrects claims outside the original list. DEC-24 supersedes the
earlier five-crop/classification direction: both thesis and product are padi-only,
observation-first time-series surfaces; synthetic substitution, NDVI severity classes,
and diagnosis/prediction output are absent. Completed engineering checks are separated
from pending UAT and measurement validation; notification/profile capabilities are not
overclaimed; and the backend/provider boundary matches code. The candidate additionally
fixes the NDMI formula label, Section III.I
cross-reference, first-appearance IEEE reference order, current CDSE/authentication/RLS
architecture, explicit production-versus-research acquisition boundaries, and missing
preliminary Results/Discussion/Conclusion. The current audit matrix is
[`../docs/thesis-app-notion-alignment-audit-2026-08-21.md`](../docs/thesis-app-notion-alignment-audit-2026-08-21.md).

| # | Historical issue in uploaded draft | Applied/superseding correction |
|---|------------------------|----------------------|
| 1 | **Machine learning is promised but absent from the methodology.** The abstract and keywords position ML as a decision-support mechanism ("analyzing vegetation trends, growth anomalies, and weather-related risk signals"), but the methodology contains no ML: crop condition uses fixed NDVI thresholds, climate risk uses a hand-weighted heuristic formula, and Gemini is generative summarization — not trend/anomaly ML. An examiner can fail this on a definition question. | Either (a) soften the abstract/keywords to "rule-based classification and threshold heuristics with AI-assisted recommendation summarization, with machine learning positioned as future work," or (b) add one real, simple ML element that the prototype actually runs (e.g. a time-series anomaly flag on NDVI history) and describe it honestly. Do not keep "machine learning" in the keywords if (a). |
| 2 | **The prototype's satellite limitations are only partially disclosed.** § F/L discloses the "predefined demonstration time window" but not the rest of the as-built behavior: the backend queries a **bounding box, not the drawn polygon** (falling back to a hard-coded Jakarta bbox); the field-list surface **silently substitutes synthetic NDVI** when the API returns nothing or errors; and the field-detail NDVI history is **fully simulator-generated**. If Functional Testing (§ K.1) reports "NDVI/NDMI indicator display" as verified without stating the data source, synthetic data is implicitly presented as measured — the exact failure the honesty constraints exist to prevent. | Add 2–3 sentences to § F or § L, e.g.: "In the current prototype, index statistics are computed over the field's bounding box rather than the exact polygon geometry, and the mobile interface displays simulated NDVI values when live retrieval is unavailable; these values are demonstration data, not measurements. Replacing the bounding-box query with polygon-exact statistics and replacing simulated fallbacks with explicit no-data states is required before any field validation." Then state in § K.1 which tests ran against live vs demonstration data. |
| 3 | **Table III citation placement implies literature support for the specific cutoffs.** [4], [6], [9] discuss NDVI for rice generally; none establishes the 0.60 / 0.20 / 0.00 class boundaries. The caveat paragraph under the table is good — the citation anchoring is the problem. | Move [4], [6], [9] into the prose sentence about NDVI's general use, and state plainly that the specific thresholds are prototype-defined interpretation ranges chosen by the authors, pending local calibration (consistent with the existing caveat). |
| 4 | **"Climate Risk Mapping" in the title, but the system delivers per-field risk classification.** No spatial risk map is produced; the output is a scalar 0–100 score per field/location. | Either retitle ("…and Climate Risk Classification Using…") or add a sentence defining "mapping" as field-level risk assignment on user-defined field boundaries, so the title term is explicitly operationalized. |
| 5 | **Architecture misstatement: risk-score calculation location.** § M assigns "heuristic risk-score calculation" to the backend application processing layer; in code it runs client-side in the mobile app (`app/(tabs)/weather.tsx:541-576`). | Either correct § M ("heuristic risk scoring is currently computed in the presentation layer; migrating it to the processing layer is planned"), or move the computation server-side before submission and keep the text. Pick one; don't leave the mismatch. |
| 6 | **Table I states "5-day revisit" without qualification.** Nominal 5-day revisit is an acquisition cadence under cloud-free, full-constellation conditions; tropical cloud cover materially reduces usable observations. Left bare, it reads as a monitoring-cadence promise. | Qualify: "10–20 m spatial, 5-day nominal revisit (usable observation frequency is lower under tropical cloud cover)". One clause, defense-proof. |
| 7 | **Weather-provider description was accurate for the July build but became stale.** The uploaded draft described AccuWeather-primary with Open-Meteo fallback. | The current backend is Open-Meteo-only, returns WMO weather codes, and normalizes failures. The candidate and architecture now state this as implemented (ADR-04 / DEC-07). |

## Current scope lock (DEC-24)

- HYP-04 NDVI severity thresholds and HYP-06 diagnostic/advisory agreement are retired;
  they must not reappear as active thesis methods, results, or UI semantics.
- HYP-07 remains only as the explicitly uncalibrated client-side weather-context
  heuristic. It is not crop diagnosis and is excluded from the measurement-validity
  claims.
- The product and thesis are padi-only. Historical non-padi category text is retained
  only as migrated legacy metadata, never relabeled as padi.
- ML is not claimed as an implemented method. Optional AI produces descriptive summaries
  only and is never ground truth, a diagnosis, or a measurement label.
- § K.5 honestly scopes evaluation to technical correctness, API reliability, and usability, not agronomic accuracy.
- The limitations section (§ L) and the corrections appendix show real revision discipline.
