# Matani Measurement and Delivery Evaluation

**Updated:** 2026-09-15
**Status:** Expanded thesis chapter draft for review. Chapter arrangement is editorial, not a verified campus format. The existing source manuscript remains unchanged. Author and advisor review are pending.

## Chapter 1 Introduction

### Background and problem

Matani is a padi-only mobile decision-support application for viewing dated NDVI and SWIR-derived NDMI observations with weather context and field notes. Its research problem is not solved merely by displaying an index or completing an interface. A displayed value needs a traceable acquisition and a quality decision, while unavailable information must remain absent. The evaluation therefore treats the measurement record and its delivery as linked responsibilities. [DEC-14/24; project architecture §2]

This thesis investigates a specific delivery choice. A complete-pair gate can withhold both indices whenever either is rejected. Independent delivery can preserve the one that passes. The distinction is meaningful only if asymmetric outcomes occur in the dataset. A software design argument alone cannot establish the size of a real benefit. The comparison consequently uses the same observations and thresholds for both policies, so the outcomes reflect policy rules rather than different data acquisition. [DEC-48/49]

A second problem concerns boundary sensitivity. An analysis block can contain edge pixels influenced by neighbouring land cover. Removing a boundary strip also reduces the number of available pixels, which may make a quality threshold harder to meet. The experiment compares the original geometry with a fixed inward buffer. It measures changes in counts and delivery; it does not assume that the buffer improves rice purity or measurement accuracy. [Protocol §19/20]

### Evaluation questions and objectives

The current evaluation asks: how much information does independent delivery retain compared with complete-pair delivery under identical quality criteria; how do those differences change after inward buffering; and what observation coverage, gaps and pixel support accompany the results? These operational questions express the advisor-supported direction in protocol §19/20. They do not silently reactivate the retired API-versus-raster agreement question or create new hypothesis thresholds. [DEC-48/49; research protocol]

The objectives are to build a traceable daily dataset, apply both policies without altering inputs, assess the fixed buffer sensitivity, and verify the narrow implementation boundaries supporting truthful delivery. Success does not require a positive policy difference. A properly accounted zero result answers the selected question within its study scope. [DEC-49; plan 016]

### Scope and contribution

The empirical case is one mapped-rice block in Krangkeng, Indramayu, for calendar 2021. The analysis uses Sentinel-2 Level-2A NDVI/NDMI, fixed geometry masks and fixed provisional pixel floors. Weather remains application context and is not an experimental variable or calibrated outcome. No user interviews or UAT were conducted, and no farmer-benefit, yield, crop-health or disease-diagnosis claim is evaluated. [DEC-24/48/49]

The contribution is a reproducible case study linking acquisition accounting, quality decisions and alternative delivery policies to a technically examined mobile artifact. The study does not establish a novel index, superior reconstruction method or representative monitoring cadence. Its value depends on the explicit separation of observations from missing data and of technical correctness from agronomic validity. [DEC-49; OBS-69–71]

## Chapter 2 Literature and conceptual basis

### Mapping sources and validation boundaries

Open-SEA-Rice-10 provides a documented regional rice-map source. Its underlying study uses Sentinel-1/2 data and discusses mapping uncertainty [1]. The selected rectangle is therefore a mapped analysis unit, not a verified farmer boundary. Because the classification uses optical inputs, the selection cannot independently establish the suitability or accuracy of Sentinel-2 monitoring. The thesis retains this dependence rather than treating the rice label as ground truth. [EVID-060/061]

### Monitoring and delivery systems

The literature matrix identifies systems such as IrrigaSys that already combine satellite indicators with decision-support inputs and delivery channels [2]. This rules out a broad claim that combining satellite data and mobile delivery is itself new. Rice-monitoring work in the Ebro Delta also reports limitations associated with optical gaps [3]. Those findings motivate examining what data a user could actually receive, but they do not supply local Indonesian cadence or validate Matani's thresholds. [EVID-049/050]

Gap-filling research, including the grassland study by Tsardanidis and colleagues [4], concerns recovering continuity through reconstructed values. Matani's experiment instead evaluates which existing quality-passing observations are delivered. Reconstruction could be a separately evaluated future approach, but generated values would require distinct provenance and cannot be inserted into this empirical dataset as observed values. [EVID-064; DEC-24/49]

### Review limitations

The review is a targeted comparison rather than a systematic literature review. Some prior-work features were not reported in the excerpts inspected. “Not reported” does not mean absent. Consequently the thesis does not attribute the complete-pair baseline to a specific prior system or claim that other systems omit quality/provenance. Full-text refinement may improve the final related-work section without changing the current empirical result. [Literature matrix]

### GROW and the role of decision support

GROW is the thesis-defined organization of Gathering, Recognizing, Offering and Warning. Gathering concerns available inputs; Recognizing concerns inspecting observed changes; Offering concerns educational or descriptive context; Warning concerns transparent weather context. None turns an index into a diagnosis. The workflow describes intended interaction and information organization, while the present experiment evaluates only observation delivery and bounded technical behaviour. [DEC-14/24; source manuscript; project architecture]

## Chapter 3 Research design and reproducibility

### Selection and historical study separation

The revised study does not pool the older Teluknaga results with the new mapped-block case. Earlier records are historical development evidence. The active case was selected through the recorded source-quality route, followed by a first-candidate rule. Three mapped candidates were screened, but only the first was frozen for acquisition. The selection did not choose the site with the best later NDVI/NDMI outcome. [DEC-46–49; OBS-54]

The primary rectangle contains six by six positive source-map cells, with a calculated area of 3,557.38 m². Its centre is approximately 108.505617° E, 6.500209° S. The administrative location check supports Krangkeng, Indramayu, but neither administrative containment nor the map class confirms cultivation on every date. The retained year-labelled source record declares CC BY 4.0. The derived rectangle and inward buffer are modifications of the mapped selection and must remain attributed accordingly. [OBS-54/56/58; EVID-060]

### Common raster and geometry masks

The frozen period contains 365 UTC days. The original and 10 m inward-buffered geometries are projected into EPSG:32749. The latter retains 1,571.63 m². The common bounding box is snapped outward to 20 m multiples, then requested at 10 m for NDVI and 20 m for NDMI. Geometry-specific summaries reuse these rasters rather than independently requesting differently aligned crops. Cell-centre coverage, including polygon boundaries, defines membership. The grids and masks are retained in the frozen specification. [DEC-49; OBS-58/62]

This approach controls grid differences within the buffer comparison. It does not imply that selected cells contain only rice, that the output grid matches every native tile grid, or that centre membership is an area-weighted estimate. The 55.82% area removal is substantial relative to the small block. It is consequently important to report count loss, not only the final binary pass status. [Protocol §20; OBS-58/70]

### Index calculations and quality

NDVI uses B08 and B04; NDMI uses B08 and B11. The production evalscript definitions are reused with nearest resampling and harmonized Level-2A processing. SCL exclusions remain 0, 1, 3, 8, 9 and 10; water class 6 is retained. Validity requires source presence, accepted mask, finite index and a nonzero denominator. Quality passing requires nine NDVI cells or three NDMI cells independently for each geometry. [CODE: backend/measurement/cdse-process-adapter.js; DEC-49]

These counts are provisional engineering floors. Neither the thresholds nor the retained water class were calibrated against local field reference measurements in this study. Mean values with no valid cells remain null. A request failure is not a zero-valued index and cannot be treated as a quality rejection. This distinction is preserved through acquisition, freezing and analysis. [DEC-49; OBS-69]

### Acquisition identity and request recovery

Complete pagination produced 142 catalogue items on 71 dates. Item duplication by date did not create multiple daily observations. The source contract requires compatible product, scene, data path, service version and acquisition instant across indices. Catalogue membership and exact daily windows are checked before acceptance. TIFF dimensions, CRS, origin and pixel scale are checked before applying masks. [OBS-63/67–69]

The first chronological date served as the pilot. Remaining acquisition retained every attempted request before sending and saved original responses and metadata afterward. Two NDVI requests failed without saved response bodies. Initially unresolved, they were later retried once each under an explicit decision, without changing requests or quality criteria. Both responses matched their already-saved NDMI sources and were quality-rejected. Recovering transport responses did not select favourable observations. The causes of the original transport failures remain unconfirmed. [DEC-51/52; OBS-69]

The original snapshot, failures and recovery records remain preserved. A revised freeze links those records and both successful retries. Its SHA256 is `41ab605fb814ea07b29db3b4bccf953dcad3bd9c0bb59f170f81e0ec31cdbdc1`. Reproduction reparses saved responses and compares hashes; it does not need live provider requests. Local read-only permissions and hashes make changes detectable but are not external write-once archival storage. [OBS-68/69]

### Policy computation and denominators

Each day and geometry has a pair of quality indicators. Joint delivery requires both; independent delivery exposes whichever indicators pass. Complete pairs use one compatible record, not different acquisitions on the same date. Counting uses distinct calendar dates and never carries a value forward. Any-index, complete-pair, NDVI and NDMI coverage divide by all 365 days. Acquisition-date fractions use a separate denominator and are secondary. [Protocol §19/20]

Gap statistics use consecutive qualifying dates. Leading and trailing absent days are distinct boundary quantities. Unknown processing would create identification bounds rather than confidence intervals. The revised dataset has no unresolved dates, so those bounds coincide. Statistical significance, causal effects and national extrapolation are outside the design. [DEC-49; OBS-70]

## Chapter 4 System implementation and technical evaluation

### Production and research boundaries

The research collection is not a production database export. It uses preserved provider responses and local analysis artifacts. The production application has a separate authenticated job, processing and persistence path; mobile detail reads persisted observations. Repository evidence includes local verification and one historical manual hosted measured result, but repeatability of device-initiated hosted completion remains unverified. These boundaries prevent a successful research download from being presented as proof that the deployed application works end to end. [Project architecture §2; OBS-69/71]

The application currently applies complete-pair gating. The joint quality decision controls the database projection of both means. Partial index quality therefore does not produce independent delivery in the shipped path. Independent delivery in this thesis is an offline design comparator. Implementing that alternative in the app would require its own behaviour and schema review rather than silently changing the experiment during evaluation. [CODE: backend/measurement/statistics.js; measurement_observations migration; OBS-71]

### Controlled test design

Fixture cases exercised complete quality at 9/3, partial cases at 9/2 and 8/3, fully rejected and unavailable states, duplicate reuse, concurrent requests and failure followed by recovery. The worker was the actual production function, while provider/admin dependencies were simulated. The checks demonstrated that fixture payloads and status information were preserved and that reuse did not trigger another simulated provider operation. These assertions do not establish PostgreSQL locking or RLS. [OBS-71]

Presentation testing executed actual TypeScript helpers and chart JSX with host stubs. Null retained an unavailable placeholder; numeric zero remained numeric; missing acquisition dates were not replaced by row creation time. Chart tests omitted null dots and retained zero values. A date-position helper was tested against uneven date intervals, endpoints, a single date and invalid dates. This is execution of relevant code but not a rendered native-device evaluation. [OBS-71]

### Corrected chart behaviour and limits

The original chart spaced observations by sequence index and connected them across missing dates. That visual treatment conflicted with the existing no-interpolation requirement. The corrected chart uses elapsed-date x positions and unconnected dots. Its horizontal range still begins and ends at the first and last numeric observation; it is not a full-year analysis axis. The research timeline separately shows the annual distribution and supports reporting boundary absences. [PRD-11; OBS-71]

All 46 backend tests and 35 root tests passed, together with lint and frontend type checking. The first route-test run failed because the sandbox prevented localhost binding, then passed with permission. No live satellite calls were made by these tests. SQL projection was inspected statically, not executed, and neither physical-device interaction nor farmer usability was evaluated. [OBS-71]

## Chapter 5 Results and interpretation

### Coverage and quality states

There are 71 catalogue dates and 294 no-acquisition dates in the 365-day window. Both indices pass on the same 23 dates and both fail on the remaining 48 acquisition dates. This is true for both geometries. The final data therefore contain no singleton passing observation and no unresolved processing. [OBS-69/70]

| Geometry and policy | Passing NDVI days | Passing NDMI days | Passing pair days | Any-index calendar coverage |
|---|---:|---:|---:|---:|
| Original joint | 23 | 23 | 23 | 6.30% |
| Original independent | 23 | 23 | 23 | 6.30% |
| Buffered joint | 23 | 23 | 23 | 6.30% |
| Buffered independent | 23 | 23 | 23 | 6.30% |

The 23/71 conditional pass fraction is 32.39%, whereas calendar coverage is 23/365 or 6.30%. Reporting only the former would omit days without a catalogue observation from the main denominator. Each combination delivers 46 index values. Independent-minus-joint differences and the change in those differences after buffering are zero percentage points. [OBS-70]

### Gaps and support

The mean consecutive passing-date gap is 12.95 days; median gap is 10 days and maximum gap is 65 days. The leading absence is 75 days and the trailing absence is four. The 75-day boundary absence is larger than the longest internal gap, but it is not another interval between two observed dates. These statistics describe different aspects of temporal availability and should not be merged into one ambiguous “maximum gap.” [OBS-70]

For original versus buffered geometries, source-present counts fall from 36 to 16 for NDVI and from nine to four for NDMI. Mean valid counts across acquisition dates fall from 11.746 to 5.211 and from 2.930 to 1.310 respectively. Medians are zero. Pixel support therefore changes substantially even though all binary quality decisions coincide. This demonstrates why unchanged delivery coverage is not equivalent to unchanged measurements or improved accuracy. [OBS-70]

### Interpreting the zero result

Independent delivery retains additional information only when an index passes without its companion. In this case that condition never occurs. The result is an empirical absence of opportunity for the alternative, not failure to calculate a difference and not proof that the policies are equivalent everywhere. A synthetic partial case can demonstrate the logic of information withholding, but cannot be counted as an observed benefit in the results table. [Protocol §19; OBS-70/71]

The buffer comparison also yields no passing-date change, but does not validate the buffer distance. Reduced pixel counts might matter under different masks, cloud patterns or thresholds; those possibilities were not tested. The present evidence cannot select an optimal buffer or establish a universal minimum field area. Future designs must specify such questions prospectively rather than tune parameters to reverse this result. [DEC-49; OBS-70]

### Threats to validity

The convenience-selected mapped block limits external validity. Map classification depends partly on Sentinel-2 and is not independent local crop-reference evidence. The rectangle is not a surveyed boundary and cultivation dates are unknown. Shared inputs and fixed processing rules may contribute to concordant index quality, but the study does not identify a causal explanation for that concordance. [EVID-061; DEC-49]

Technical reliability and observation availability also require different accounting. The two initial failed downloads were recovered, so they no longer widen the scientific missing-data bounds. They still matter as operational history. Provider-reported processing use excludes unknown charges for those failures, and no refreshed account balance is inferred. No user-centred outcome was evaluated, so improved decisions, adoption or benefits to farmers remain outside the conclusions. [OBS-69/71]

## Chapter 6 Conclusions and future work

The fixed single-case experiment found no delivered-information difference between joint and independent policies. Both delivered passing pairs on 23 dates, or 6.30% of calendar days, with a longest internal gap of 65 days. Removing a 10 m boundary strip reduced pixel support without changing passing dates. The complete dataset and its preserved failure/recovery history support this bounded conclusion. [OBS-69/70]

The application evaluation established controlled quality, worker, route and presentation behaviour and corrected misleading chart continuity. It did not establish independent delivery as an implemented feature, live PostgreSQL correctness, native-device rendering, repeatable hosted completion or farmer usability. These are separate verification tasks, not outcomes implied by passing unit or route tests. [OBS-71]

Further research could use prospectively selected additional cases to examine when asymmetric quality outcomes occur. Any extension should retain the present zero result and define site, period, thresholds and comparison rules before acquiring new observations. Agronomic validation would require dated reference evidence appropriate to the claim. Product verification should independently examine deployment reliability and rendered interaction before presenting the application as ready for field use. No such extension or readiness claim is made here. [DEC-49; research protocol; project architecture §2]

## References and evidence appendix

References [1]–[6] below use the same numbering as the companion paper. These chapters do not introduce additional external factual claims beyond those sources. The internal markers identify canonical project evidence for thesis-team review and should be resolved into the final appendix/citation structure before publication.

The evidence chain is: source-map selection and geometry (OBS-53/54/56/58/62), pilot and collection (OBS-63/67), initial freeze (OBS-68), explicit retry revision (OBS-69), policy analysis (OBS-70) and scoped technical checks (OBS-71). The original Teluknaga narrative is retained in historical project records and is not pooled with this case. The paper, these chapters and any later presentation must use the revised frozen snapshot consistently.


[1] F. I. Ginting et al., “High-resolution maps of rice cropping intensity across Southeast Asia,” Scientific Data, vol. 12, article 1408, 2025. https://doi.org/10.1038/s41597-025-05722-1. [EVID-061]

[2] L. Simionesei, T. B. Ramos, J. Palma, A. R. Oliveira, and R. Neves, “IrrigaSys: A web-based irrigation decision support system based on open source data and technology,” Computers and Electronics in Agriculture, vol. 178, article 105822, 2020. https://doi.org/10.1016/j.compag.2020.105822. Claims here are limited to the reviewed abstract. [EVID-049]

[3] J. Soriano-Gonzalez et al., “Monitoring rice crop and yield estimation with Sentinel-2 data,” Field Crops Research, vol. 281, article 108507, 2022. https://doi.org/10.1016/j.fcr.2022.108507. [EVID-050]

[4] I. Tsardanidis et al., “Cloud gap-filling with deep learning for improved grassland monitoring,” arXiv:2403.09554v1, 2024. https://arxiv.org/abs/2403.09554v1. Reviewed version is a preprint. [EVID-064]

[5] Open-SEA-Rice-10, dataset record 14627003, Zenodo. https://zenodo.org/records/14627003. Licence and year label checked September 14, 2026; retained metadata is the evidence for this reuse. [EVID-060]

[6] Copernicus Data Space Ecosystem, “Catalog API,” documentation, accessed September 15, 2026. https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Catalog.html. [EVID-065]
