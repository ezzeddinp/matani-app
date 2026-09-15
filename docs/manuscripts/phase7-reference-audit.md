# Phase 7 reference audit

**Updated:** 2026-09-15
**Basis:** DEC-53; EVID-049–096; OBS-69–73.

All 38 references in thesis fix-2.pdf were screened for relevance. Omitted sources are not claimed to have been fully verified. The paper uses 36 sources; each has a bounded supporting location in the JSON audit and canonical evidence register. The list is targeted, not systematic.

## Previous bibliography decisions

| Old no. | Source | Decision |
|---|---|---|
| 1 | World Bank agriculture GDP | Omitted: broad economic statistic unnecessary to the delivery question; no current numerical claim retained. |
| 2 | World Bank agricultural employment | Omitted: employment statistic unnecessary; no adoption or demographic inference made. |
| 3 | BPS preliminary 2023 paddy statistics | Updated/replaced as [1]. Historical national context; not current production or the study block. |
| 4 | Zhao rice mapping review | Retained as [2]. Targeted review context; not Matani validation. |
| 5 | Mkhwenkwana soil-moisture review | Omitted: soil-moisture retrieval scope differs from spectral NDMI delivery; DOI access failed and no finding retained. |
| 6 | Kuenzer and Knauer rice review | Retained as [9]. Metadata only; no detailed findings attributed. |
| 7 | Guan UAV NDVI | Retained as [11]. Publisher abstract only after article rate limit; UAV evidence is not Sentinel-2 validation. |
| 8 | Jiang UAV flight parameters | Omitted: flight-parameter optimization is outside the Sentinel-2 experiment; direct publisher refresh was rate-limited. |
| 9 | Huang AVHRR rice yields | Retained as [12]. Provincial Chinese model; not field-level accuracy or a model implemented here. |
| 10 | Cao rice yield prediction | Omitted: redundant yield-model context; no yield model evaluated. |
| 11 | Son Taiwan yield models | Omitted: redundant yield-model context; no Taiwan-to-Indonesia transfer claimed. |
| 12 | Jeong crop/deep-learning yield | Omitted: crop/deep-learning modelling not implemented or evaluated. |
| 13 | Son monthly composites and yields | Omitted: monthly composites and yield prediction differ from unfilled daily availability. |
| 14 | Thorp and Drajat West Java | Retained as [10]. Author summary reviewed; no accuracy or implemented classification transferred to Matani. |
| 15 | Ryu 2020 stress indices | Omitted: overlapping stress-assessment context; retain the bounded 2022 chamber example instead. |
| 16 | Ryu 2022 chamber heat stress | Retained as [13]. Publisher abstract; no transferable Matani threshold or field diagnosis. |
| 17 | Chen and Wang compound extremes | Omitted: compound-extreme/yield-loss analysis not undertaken; do not infer causal crop losses. |
| 18 | Chou climate scenarios | Retained as [24]. China climate projections, not local weather-warning calibration. |
| 19 | Jiang heat exposure projections | Omitted: heat-risk projection not used to calibrate HYP-07. |
| 20 | Miller IoT and AI review | Omitted: broad IoT/AI survey does not support this implemented measurement boundary. |
| 21 | Cucho-Padin smallholder UAV tools | Retained as [18]. Different acquisition platform; no direct cost or adoption comparison. |
| 22 | Zhai agricultural DSS review | Retained as [16]. Review context; not empirical Matani performance. |
| 23 | USDA NIFA DSS overview | Omitted: introductory definition redundant with scholarly DSS sources. |
| 24 | Gutierrez visualization review | Retained as [17]. Review abstract; does not demonstrate usability of Matani. |
| 25 | Rose decision-support uptake | Retained as [3]. UK study; does not establish Indonesian adoption. |
| 26 | Sentinel Hub L2A documentation | Updated/replaced as [4]. Sensor/provider definition; output grids still require inspection. |
| 27 | Gao original NDWI | Retained as [6]. Abstract reviewed; not the exact Sentinel-2 B08/B11 band combination. |
| 28 | Sentinel Hub Statistical API | Retained as [34]. Background alternative; current experiment uses Process rasters. |
| 29 | Open-Meteo homepage | Updated/replaced as [25]. Provider weather context, not on-plot sensor measurements or calibrated crop risk. |
| 30 | EO Browser | Retained as [21]. Vendor-described capability only; no performance comparison. |
| 31 | Sentinel Hub NDVI FAQ | Updated/replaced as [5]. Formula only; no crop-health thresholds adopted. |
| 32 | OneSoil help | Updated/replaced as [22]. Documentation only; no assertion of actual backend quality rules or effectiveness. |
| 33 | EOSDA | Omitted: no performance comparison or feature claim needed for this vendor. |
| 34 | CropX | Omitted: no sensor/irrigation product evaluation in this study. |
| 35 | FieldView | Omitted: no farm-platform performance comparison undertaken. |
| 36 | SIPINDO | Omitted: no local adoption or validated recommendation comparison undertaken. |
| 37 | KATAM | Omitted: no planting-calendar validation or agronomic schedule produced. |
| 38 | Plantix | Retained as [23]. Vendor claim used only to distinguish product category, not endorse accuracy. |

## Verification boundaries

- Primary publisher, author-institution and official documentation text supports the permitted claims; detailed source locations are recorded in phase7-reference-audit.json.
- Kuenzer and Knauer is metadata-only and cited only as an earlier review. Guan and Ryu use publisher-listed abstracts after direct-page failures.
- Soriano-González retains the previously checked EVID-050 abstract scope; this turn’s author-PDF refresh returned 403. Open-SEA dataset metadata retains its September 14 checked date after the landing-page refresh failed.
- FAIR uses indexed publisher text; no certification is asserted. Other abstract-based sources do not support undocumented implementation comparisons.
- Vendor documentation establishes described capabilities only, not independent effectiveness. No pricing, quota, service cadence or current national-production promise is made.
- Gao’s original 0.86/1.24 micrometre index is distinguished from the B08/B11 NDMI implementation.
