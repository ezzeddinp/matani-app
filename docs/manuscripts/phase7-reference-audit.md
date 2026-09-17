# Phase 7 reference audit

**Updated:** 2026-09-17
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

## September 17 validation

OBS-75: All 36 current references have primary-source records. This is 18 journal articles and 18 official statistics, dataset, standards or documentation sources, not 36 research papers. Generic links were replaced, the grassland preprint upgraded to its published article, and the NDMI source inconsistency disclosed. Full-text access varies; source-by-source refreshed access evidence is recorded below. The earlier screening table remains the historical decision record.

- **[1] bps** — official statistics. [Source](https://www.bps.go.id/en/pressrelease/2024/03/01/2375/pada-2023--luas-panen-padi-mencapai-). Official source text and relevant supporting section reviewed. Supporting location: Abstract.
- **[2] zhao** — journal article. [Source](https://mdpi-res.com/d_attachment/sustainability/sustainability-13-00503/article_deploy/sustainability-13-00503.pdf). Publisher PDF, abstract and metadata; HTML rate-limited. Supporting location: Abstract and mapping-method categories.
- **[3] rose** — journal article. [Source](https://discovery.ucl.ac.uk/id/eprint/1556099/). Official source text and relevant supporting section reviewed. Supporting location: Abstract; article section on ease of use.
- **[4] s2** — technical or product documentation. [Source](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html). Official source text and relevant supporting section reviewed. Supporting location: Available bands table.
- **[5] ndvi** — technical or product documentation. [Source](https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/ndvi/). Official source text and relevant supporting section reviewed. Supporting location: Description and evalscript.
- **[6] gao** — journal article. [Source](https://modis.gsfc.nasa.gov/sci_team/pubs/abstract_new.php?id=03634). Official source text and relevant supporting section reviewed. Supporting location: Author publication abstract, wavelength definition.
- **[7] ndmi** — technical or product documentation. [Source](https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/ndmi/). Official source text and relevant supporting section reviewed. Supporting location: Description formula and example evalscripts.
- **[8] usgs** — technical or product documentation. [Source](https://www.usgs.gov/landsat-missions/normalized-difference-moisture-index). Official source text and relevant supporting section reviewed. Supporting location: Index definition and sensor-specific band equations.
- **[9] kuenzer** — journal article. [Source](https://elib.dlr.de/82597/). Author-institution metadata record only; the paper attributes no detailed study finding. Supporting location: Title and publication record.
- **[10] thorp** — journal article. [Source](https://www.ars.usda.gov/research/publications/publication/?seqNo115=382490). Official source text and relevant supporting section reviewed. Supporting location: Interpretive Summary.
- **[11] guan** — journal article. [Source](https://www.mdpi.com/2072-4292/11/2/112). Publisher-indexed article abstract and metadata; direct retrieval rate-limited. Replaced general editor listing. Supporting location: Publisher-indexed article abstract and metadata.
- **[12] huang** — journal article. [Source](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0070816). Official source text and relevant supporting section reviewed. Supporting location: Abstract and methods.
- **[13] ryu** — journal article. [Source](https://www.mdpi.com/2073-4395/12/8/1972). Publisher-indexed article and issue abstract; direct article retrieval blocked. Replaced issue-only URL. Supporting location: Publisher-indexed article abstract and metadata.
- **[14] soriano** — journal article. [Source](https://www.sciencedirect.com/science/article/pii/S0378429022000788). Publisher-indexed abstract confirms Ebro Delta data-gap limitation; repository refresh failed. Supporting location: Abstract.
- **[15] tsar** — journal article. [Source](https://www.sciencedirect.com/science/article/pii/S0168169924011232). Publisher-indexed journal record and abstract. Updated preprint to published 2025 article, volume 230, 109732. DOI contains 2024 but publication year is 2025. Supporting location: Published article metadata, highlights and abstract.
- **[16] zhai** — journal article. [Source](https://www.sciencedirect.com/science/article/pii/S0168169919316497). Publisher-indexed abstract and metadata; repository timeout. Supporting location: Abstract; deposited article.
- **[17] gutierrez** — journal article. [Source](https://www.sciencedirect.com/science/article/pii/S0168169918319069). Publisher-indexed abstract and author list; direct retrieval blocked. Abstract explicitly discusses uncertainty visualisation. Supporting location: Publisher-indexed abstract.
- **[18] cucho** — journal article. [Source](https://link.springer.com/article/10.1007/s12518-019-00292-5). Official source text and relevant supporting section reviewed. Supporting location: Abstract.
- **[19] irrigasys** — journal article. [Source](https://researchportal.ulisboa.pt/en/publications/irrigasys-a-web-based-irrigation-decision-support-system-based-on/). Official source text and relevant supporting section reviewed. Supporting location: Abstract.
- **[20] rosebruce** — journal article. [Source](https://onlinelibrary.wiley.com/doi/abs/10.1002/fes3.123). Publisher-indexed article and citation; PMC challenged access. Issue year 2018 is correct despite online publication in 2017. Supporting location: User-centred design discussion.
- **[21] eo** — technical or product documentation. [Source](https://www.sentinel-hub.com/explore/eobrowser/). Official source text and relevant supporting section reviewed. Supporting location: Timelapse and statistical analysis feature descriptions.
- **[22] onesoil** — technical or product documentation. [Source](https://api-b2b.prod-be.onesoil.ai/docs/ndvi_api/). Official source text and relevant supporting section reviewed. Supporting location: Search NDVI, request and response parameters.
- **[23] plantix** — technical or product documentation. [Source](https://plantix.net/en/). Official source text and relevant supporting section reviewed. Supporting location: Product description.
- **[24] chou** — journal article. [Source](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.655128/full). Official source text and relevant supporting section reviewed. Supporting location: Data and Methods; Conclusions.
- **[25] weather** — technical or product documentation. [Source](https://open-meteo.com/en/docs). Official source text and relevant supporting section reviewed. Supporting location: Hourly/current/daily variables; API parameter definitions.
- **[26] ginting** — journal article. [Source](https://www.nature.com/articles/s41597-025-05722-1). Official source text and relevant supporting section reviewed. Supporting location: Datasets; Usage Notes, Sources of uncertainty.
- **[27] zenodo** — dataset. [Source](https://zenodo.org/records/14627003). Landing record, DOI and 2021 map-year description refreshed. Licence widget was not exposed and API refresh failed; CC BY 4.0 still relies on retained metadata checked 2026-09-14. Supporting location: Retained API metadata: description, licence and files.
- **[28] geojson** — standard or specification. [Source](https://www.rfc-editor.org/rfc/rfc7946). Official source text and relevant supporting section reviewed. Supporting location: Sections 3.1.1 and 4.
- **[29] catalog** — technical or product documentation. [Source](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Catalog.html). Official source text and relevant supporting section reviewed. Supporting location: Pagination.
- **[30] process** — technical or product documentation. [Source](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Process.html). Official source text and relevant supporting section reviewed. Supporting location: Processing API overview and linked S2L2A request examples.
- **[31] eval** — technical or product documentation. [Source](https://docs.sentinel-hub.com/api/latest/evalscript/v3/). Official source text and relevant supporting section reviewed. Supporting location: setup, evaluatePixel and output sampleType.
- **[32] mask** — technical or product documentation. [Source](https://docs.sentinel-hub.com/api/latest/user-guides/datamask/). Official source text and relevant supporting section reviewed. Supporting location: General notes.
- **[33] scl** — technical or product documentation. [Source](https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/scene-classification/). Official source text and relevant supporting section reviewed. Supporting location: Class code table and script.
- **[34] stats** — technical or product documentation. [Source](https://docs.sentinel-hub.com/api/latest/api/statistical/). Official source text and relevant supporting section reviewed. Supporting location: General approach; Exclude pixels from calculations.
- **[35] prov** — standard or specification. [Source](https://www.w3.org/TR/prov-overview/). Official source text and relevant supporting section reviewed. Supporting location: Introduction and PROV family overview.
- **[36] fair** — journal article. [Source](https://www.nature.com/articles/sdata201618). Publisher-indexed article, principles and citation; direct open failed. Supporting location: Publisher indexed abstract and guiding principles.
