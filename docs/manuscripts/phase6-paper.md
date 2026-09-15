# Evaluating Satellite Observation Delivery for Rice Field Monitoring with Matani

**Updated:** 2026-09-15
**Status:** Phase 7 full-paper review draft. Author details are carried forward provisionally from thesis fix-2.pdf. Venue compliance and thesis-team approval remain pending. Internal provenance annotations are omitted from the formatted paper and retained here for audit.

## Abstract

Satellite monitoring applications must decide whether to display a vegetation or moisture index when its companion fails quality checks. This paper evaluates complete-pair and independent delivery for Matani, a rice-only mobile decision-support application that presents dated observations, weather context and field notes. A retrospective case study covers one mapped-rice block in Krangkeng, Indramayu, Indonesia, during calendar 2021. Both delivery policies use identical Sentinel-2 Level-2A inputs, fixed quality rules and verified source identities. Original and ten-metre inward-buffered geometries are compared through local masks applied to shared rasters. The completed inventory contains 71 acquisition dates across 365 calendar days. Two interrupted downloads were recovered with unchanged requests, leaving no unresolved dates. Both indices pass on the same 23 dates under both geometries, giving 6.30 percent calendar coverage and no observed benefit from independent delivery. The mean consecutive-observation gap is 12.95 days and the maximum is 65 days. Buffering reduces pixel support without changing passing dates. Controlled technical checks exercise quality decisions, worker recovery and presentation behavior, including a correction to date spacing and gap display. The contribution is a traceable evaluation of information delivery and its limitations. The findings do not establish general policy equivalence, agronomic accuracy, production reliability or farmer usability. [OBS-69; OBS-70; OBS-71]

**Keywords:** Sentinel-2; rice monitoring; NDVI; NDMI; decision support; observation availability; provenance.

## I Introduction

Rice monitoring is an important application area for agricultural information systems in Indonesia. As historical context, Statistics Indonesia reported approximately 10.21 million hectares of harvested paddy area in 2023 [1]. National totals describe the scale of production, but they do not tell a field user when a particular satellite observation is available or whether it is suitable for display. Rice remote-sensing research encompasses optical imagery, radar and combinations of both [2]. An application that uses these data therefore needs to explain the relationship between the selected measurement, its date and the decision context in which a person might consult it.

Matani is a mobile decision-support application for padi-field time-series monitoring. The intended interaction brings together a saved field boundary, dated satellite indices, weather information and field notes. The system supports inspection rather than automatically assigning a crop-health diagnosis. This choice matters because an index value and a management recommendation are different outputs. A number may be correctly calculated from the available pixels while remaining insufficient to explain crop condition. Our development objective is to make the available observation understandable and traceable before evaluating more demanding claims about agricultural decisions. [DEC-14; DEC-24]

The usefulness of a decision-support application also depends on how it delivers information. Rose et al. identify usability and relevance among factors affecting agricultural decision-support uptake in a UK farmer and adviser study [3]. That evidence does not establish Indonesian adoption, but it motivates examining what a user actually receives. A technically successful request can still yield no quality-passing observation. Conversely, a successful vegetation-index calculation might be hidden because a companion moisture index fails a separate check. These cases require explicit accounting before interface completeness can be interpreted as monitoring performance.

The present study examines that delivery choice. A complete-pair policy displays the two indices only when both pass quality checks. An independent policy displays each passing index while keeping its unavailable companion absent. We compare the policies on identical inputs, then examine whether removing boundary pixels changes their coverage difference. The research question is how much observable information complete-pair delivery withholds in this defined case. Supporting questions concern the time between observations, the effect of buffering on pixel support and the correctness of the existing delivery boundary. [DEC-49; research-protocol §19–20]

The evaluation concerns one mapped-rice analysis block in Krangkeng, Indramayu, during 2021. It is deliberately bounded: no national availability estimate, crop diagnosis, yield prediction or farmer-benefit effect is inferred. The empirical result is zero difference between delivery policies, because no independently passing singleton occurs. This result is useful for assessing the proposed design change without assuming that it must improve coverage. The paper contributes the frozen comparison, transparent missing-data accounting and a scoped technical evaluation of Matani. It introduces neither a new spectral index nor a claim that independent delivery is universally superior. [OBS-70; OBS-71; DEC-49]

## II Literature Review

### A Spectral indices and measurement meaning

Sentinel-2 provides bands at different spatial resolutions. The provider documentation lists the red B04 and near-infrared B08 bands at 10 m, while short-wave infrared B11 and the Scene Classification Layer are at 20 m [4]. These differences matter when counting the pixels available inside a small analysis geometry. A nominal output resolution alone does not explain the support for an observation; the source bands, resampling choices and inclusion mask also belong in the measurement description. The present experiment reports those choices explicitly rather than treating the two indices as interchangeable observations.

The Normalized Difference Vegetation Index, NDVI, uses the contrast between near-infrared and red reflectance. The documented Sentinel-2 recipe is the normalized difference of B08 and B04 [5]. A normalized ratio provides a compact representation of spectral contrast, but the formula does not supply a crop-condition label. Matani therefore keeps the numerical observation and acquisition date separate from agronomic interpretation. The study evaluates whether the observation satisfies its technical display criterion, not whether the value correctly identifies a disease, nutrient deficiency or stage of rice growth. [DEC-24; DEC-49]

Water-index terminology requires particular care. Gao's original vegetation-water NDWI uses reflectance near 0.86 and 1.24 micrometres [6]. Matani's Normalized Difference Moisture Index (NDMI) instead follows the Sentinel-2 B08/B11 recipe [7]. USGS likewise describes NDMI as a normalized near-infrared/short-wave-infrared ratio, with sensor-specific band assignments for Landsat [8]. These sources support the conceptual distinction and the need to state exact bands. They do not justify presenting the Sentinel-2 calculation as an identical implementation of Gao's original wavelengths, nor converting its value directly into a field's root-zone water content.

For this paper, NDVI and NDMI are complementary dated spectral observations. Neither a passing quality flag nor a plausible number is independent evidence of accurate crop interpretation. Source presence, scene masking, sufficient pixel count and a finite calculation are necessary parts of the implemented measurement contract. Agronomic validation would additionally require suitable reference observations and a defined target variable. Keeping these questions separate allows the availability experiment to remain meaningful even though it does not measure crop-health accuracy. [DEC-24; research-protocol §19–20]

### B Rice mapping and prediction studies

Rice-area mapping has an established literature, including the earlier review by Kuenzer and Knauer [9] and Zhao et al.'s classification of optical, microwave and integrated approaches [2]. Mapping whether an area is rice is a different task from determining which dated observations an application can deliver. A published rice map can support selection of a research area, but a map label does not establish the crop condition on each image date. Our use of a mapped block is consequently a selection decision with uncertainty, rather than a substitute for dated field reference data.

A geographically relevant example is the West Java work of Thorp and Drajat. Their study combines agricultural survey information and Sentinel imagery to map rice production stages [10]. The external reference observations are an important distinction from the present experiment. Matani does not train or validate a stage classifier here. The connection is that both projects concern information about Indonesian rice, while their output variables and evidence requirements differ. We use this distinction to avoid treating regional classification results as validation of a particular application's index values.

Other studies connect spectral indices to agronomic outcomes through additional measurements and models. Guan et al. examine correlations between NDVI from unmanned aerial vehicles (UAVs), fertilizer application and rice or wheat yield [11]. Huang et al. model provincial rice yields in China using NDVI time series alongside historical yield records [12]. Ryu et al. assess heat damage in rice under elevated temperatures in a temperature-gradient field chamber [13]. These examples show why prediction and stress-assessment claims need evidence beyond displaying an index. Their platforms, spatial units and experimental conditions do not supply transferable thresholds for Matani.

The literature also addresses gaps in optical time series. Soriano-González et al. report field-scale limitations associated with Sentinel-2 data gaps in an Ebro Delta rice study [14]. Tsardanidis et al. investigate deep-learning reconstruction using Sentinel-1 and Sentinel-2 for grassland monitoring [15]. Reconstruction estimates missing information, whereas our comparison asks which existing observations pass a fixed rule and reach the display. We do not evaluate a reconstruction model or treat interpolated values as measurements. This narrower estimand makes absence visible and permits a delivery-policy comparison without collecting training labels. [DEC-49]

### C Decision support and information presentation

Zhai et al. survey agricultural decision-support systems and their development challenges [16]. Gutiérrez et al.'s review identifies opportunities for dashboards to help agricultural users understand data uncertainty [17]. These perspectives connect acquisition and processing to presentation: the system must communicate what the data can support. In Matani, the corresponding design questions concern dates, provenance, missing values and quality status. The research does not assume that adding more panels or presenting a continuous-looking chart makes the information more useful. Those interface choices require their own evaluation.

Cucho-Padin et al. develop UAV multispectral sensing and processing tools for smallholder agriculture [18]. IrrigaSys combines weather-driven irrigation modelling, Sentinel-2 NDVI and several delivery channels [19]. Both provide useful context for moving information from measurement systems to agricultural users, but neither is reproduced as our policy baseline. The reviewed IrrigaSys abstract does not establish its precise handling of independently passing indices. We therefore define complete-pair delivery as an explicit application policy, verified in Matani's own code, rather than attributing it to another system without supporting evidence. [CODE: backend/measurement/statistics.js; OBS-71]

Rose and Bruce emphasize understanding user workflows and testing decision-support systems with actual users [20]. That guidance highlights a boundary of our participant-free evaluation. Automated checks can show that a null remains absent or that a date is plotted correctly; they cannot show whether a farmer understands the result or changes a decision appropriately. Technical correctness is a prerequisite for a later user study, and it remains a distinct outcome. We make no adoption or usability claim from the passing software checks.

### D Comparable applications and weather context

Existing products illustrate several information-delivery categories. EO Browser documents satellite browsing and statistical exploration [21]. OneSoil's NDVI API documents image searches with date and cloud-related parameters [22]. Plantix advertises photo-based crop diagnosis and treatment information [23]. These are vendor-described capabilities, not independently measured effectiveness in this study. Their inclusion establishes context for Matani's field-oriented interface and clarifies that satellite visualization or mobile agricultural information is not new by itself. We do not rank these products or infer undocumented quality policies from their public descriptions.

Weather is another contextual input, but it is not a replacement for a missing satellite measurement. Chou et al. examine temperature and precipitation extremes in Chinese rice-growing regions using climate-model scenarios [24]. Such work supports investigating weather-related agricultural context without calibrating Matani's local warnings. Open-Meteo documents model-based temperature, precipitation, humidity and wind variables [25]. Matani presents provider weather through its backend; these values are not readings from instruments installed on the analysis block. The existing weather-risk heuristic remains uncalibrated and is outside the delivery-policy experiment. [HYP-07; CODE: backend/api/weather/route.js]

### E Position of the present study

This is a targeted literature review, not a systematic review or an exhaustive competitor assessment. Sources were chosen for rice remote sensing, index definitions, agricultural information delivery and the processing contract. The comparison is limited to the findings available in the reviewed text, including author abstracts and summaries. Bibliographic context is distinguished from evidence about specific processing and delivery behavior. The resulting contribution is correspondingly bounded. We evaluate information withheld by a known policy on a frozen case and test relevant delivery behavior, without claiming that prior work lacks provenance or that this is the first such comparison. [DEC-49]

## III Matani System and Study Methods

### A GROW workflow and system boundary

GROW is the thesis team's organizational workflow: Gathering, Recognizing, Offering and Warning. Gathering associates a saved rice-field geometry with available satellite observations, weather context and notes. Recognizing supports inspection of dated values and visible changes. Offering provides contextual information rather than a validated prescription. Warning concerns weather context and explicitly limited heuristics. GROW is defined within this thesis; it is not presented as an external agronomic methodology whose validity is established by naming its stages. The present experiment chiefly evaluates the satellite information available to Gathering and Recognizing. [DEC-14; DEC-24; HYP-07]

Matani's implementation separates mobile presentation, backend processing and persisted records. The Expo application provides field interaction and observation views. The Express backend handles authenticated requests and provider access. Supabase supplies identity and persistence. A field-save or retry action requests backend measurement work; the mobile surface reads the resulting observation view. This arrangement distinguishes requesting work from obtaining an observation. A queued job is not a measured index, and a successfully returned request acknowledgment does not establish that later provider processing and persistence completed. [CODE: backend/app.js; backend/api/measurements/route.js; utils/backend-api.ts; app/detail-lahan-page.tsx]

The production quality function makes one joint decision from the two indices. The persisted observation view exposes both means only for a passing record. Consequently, complete-pair delivery is the implemented application policy, and independent delivery is an offline comparator in this study. The research executor uses preserved provider rasters and local analysis files, not a set of newly populated production observation rows. This separation is important when interpreting results: successful historical research processing is not evidence that repeated device-initiated production jobs finish reliably. [CODE: backend/measurement/statistics.js; supabase/migrations/20260830000100_m2_measurement_pipeline.sql; OBS-71]

The implementation retains explicit fixture, prototype, measured and unavailable distinctions. A fixture is controlled test input; a prototype is not provenance-safe measurement evidence. Measured output requires the project's provenance contract, while unavailable output states an absence rather than substituting a plausible number. The study does not evaluate repeatable device-initiated production completion. Existing local verification and a historical manual hosted result remain separate from that operational question. Table I summarizes the information boundaries relevant to the paper. [DEC-24; project-architecture §2; OBS-71]

Table I. Inputs and evidence boundaries in Matani

| Input | Presented information | Boundary |
|---|---|---|
| Satellite record | Dated NDVI and NDMI | Quality and source provenance required |
| Provider weather | Weather context | Model output, not a plot sensor |
| Field geometry | Location and boundary | User/map geometry, not a survey certificate |
| Field notes | Recorded context | Not independent validation in this study |
| Test fixture | Controlled behavior | Excluded from empirical coverage |

### B Research design and analysis unit

The research is a retrospective, participant-free case evaluation. Both delivery policies receive the same dated inputs, formulas, quality decisions and source checks. Geometry sensitivity is evaluated by applying two masks to each returned raster. The primary outcome is the difference in calendar-day coverage between policies; secondary outcomes describe complete-pair coverage, per-index coverage, gaps and pixel support. We do not estimate a treatment effect on farmers, compare diagnostic accuracy or perform significance testing. The frozen method permits an unfavorable or zero result without selecting a replacement case. [DEC-49; research-protocol §19–20]

The selection source is Open-SEA-Rice-10, whose publication describes rice cropping-intensity mapping using 2020–2021 Sentinel-1/2 data [26]. The associated dataset record labels the map 2021 and declares CC BY 4.0 [27]. We use that classification to locate a rice-labelled analysis block, retaining attribution for the dataset and identifying the derived geometry as a modification. Its land-cover label does not establish ownership, surveyed parcel boundaries or continuous rice cultivation throughout the study year. These are limitations of the analysis unit rather than details that can be resolved by increasing the number of downloaded images. [EVID-060; EVID-061]

The frozen unit is open-sea-2021-tile-42-r5566-c5626, centered approximately at 108.505617 degrees east and 6.500209 degrees south in Krangkeng, Indramayu. The original polygon is a rectangle of six by six source-map cells, covering 3,557.38 square metres. Candidate generation scanned fixed windows and retained the first block meeting the positive mapped-rice condition in the recorded order. The candidate was frozen before its index outcomes were acquired. This is purposive selection favoring contiguous mapped rice, not random sampling of Indonesian farms. No later coverage result was used to choose a more favorable block. [OBS-54; OBS-56; DEC-49]

The observation window runs from 1 January 2021 inclusive to 1 January 2022 exclusive. All daily accounting uses UTC and a denominator of 365 days. The administrative location supplies geographic context; the rectangle remains a mapped analysis unit. All reported empirical counts and figures derive from this single frozen case. Its source-map selection, original geometry and buffered geometry share the same observation period, preventing a change of site or time window from becoming an unreported difference between policies. [DEC-49; OBS-69; OBS-72]

### C Geometry and raster support

Geometry exchange and metric analysis use different coordinate roles. GeoJSON specifies longitude/latitude positions in WGS84 [28]. For buffering and raster requests, the study uses EPSG:32749, the recorded local metric coordinate system. A 10 m inward buffer reduces the original area to 1,571.63 square metres, a loss of 55.82 percent. The distance is a fixed engineering sensitivity choice, not an agronomically validated boundary exclusion. Removing boundary cells may alter support, but the design does not establish that the remaining cells contain only rice. [OBS-58; DEC-49]

The original geometry's envelope is snapped outward to 20 m multiples. One common-bounding-box raster is requested per index and date: NDVI on a 10 m output grid and NDMI on a 20 m output grid. Both original and buffered masks are then applied locally. This avoids comparing separately clipped provider requests whose grids might differ. Within each index, the buffered samples are subsets of the original samples. The approach controls the raster used for the geometry comparison without claiming that the grid is aligned to the native Sentinel-2 tile grid. [research-protocol §20; OBS-62]

A pixel is geometrically included when its center lies inside or on the polygon boundary. The study does not use an all-touched rule or fractional area weighting. Returned TIFF dimensions, coordinate reference system, scale and origin must match the frozen request contract before either mask is applied. These checks matter because an apparently reasonable aggregate could otherwise come from shifted cells. They also keep geometry errors separate from quality rejection: an unexpected raster shape or transform is a processing failure requiring investigation, not evidence that the rice observation itself failed quality. [research-protocol §20; OBS-62; OBS-69]

### D Acquisition and index processing

The inventory enumerates the full catalogue query over the original case and frozen period. The documented Catalog API continuation mechanism supports retrieval of additional pages [29]. All returned pages and item identities were preserved, and the query did not filter dates to favor low cloud percentages. The completed query returned 142 catalogue items distributed across 71 distinct UTC dates. Item count and date count are therefore different quantities. Calendar dates absent from this completed query are described as no acquisition under the query, not as proof that no satellite data exist anywhere for those dates. [OBS-63]

The Process API defines requested spatial extent, source data, processing and output [30], while Evalscript specifies bands and per-pixel calculations [31]. The experiment reuses the production formulas with harmonized Level-2A values and nearest-neighbor resampling. Equations (1) and (2) state the index definitions, where each band symbol denotes the reflectance supplied to that calculation. The NDMI output grid is 20 m; it does not turn B08 and B11 into identically acquired native-resolution measurements. [CODE: backend/measurement/cdse-process-adapter.js; research-protocol §20]

NDVI = (B08 − B04) / (B08 + B04)    (1)

NDMI = (B08 − B11) / (B08 + B11)    (2)

Source presence is checked separately from quality. The provider's dataMask describes whether source data are present [32]. SCL provides categorical scene labels, including water, shadow and cloud categories [33]. The frozen rule excludes classes 0, 1, 3, 8, 9 and 10, and retains water class 6. Retaining water is a stated processing choice, not validation that every included water-class cell is useful for agronomic interpretation. No additional cloud-percentage cutoff is introduced after inspecting outcomes. [research-protocol §20]

A valid index cell must be geometrically selected, source-present, mask-passing and finite, with a nonzero formula denominator. NDVI passes for a geometry at nine valid cells; NDMI passes at three. These absolute floors are provisional technical requirements. They are not calibrated error bounds, estimates of pure-rice area or confidence levels. Each geometry uses the same floors even though buffering reduces available pixels. Table II records the main fixed settings so the policy comparison can be understood without inferring undocumented defaults. [DEC-49; CODE: backend/measurement/statistics.js]

Table II. Frozen processing specification

| Setting | Value |
|---|---|
| Calendar period | 2021, 365 UTC days |
| Metric coordinate system | EPSG:32749 |
| Inward buffer | 10 m |
| Output grids | NDVI 10 m; NDMI 20 m |
| Inclusion rule | Pixel center covered by polygon |
| SCL exclusions | 0, 1, 3, 8, 9, 10 |
| Valid-cell floors | NDVI 9; NDMI 3 |
| Resampling | Nearest neighbor |
| Temporal filling | None |

The Statistical API offers an alternative way to obtain aggregates without downloading complete imagery and requires explicit attention to excluded pixels [34]. This experiment instead preserves Process rasters so that both local geometry masks can be applied to the same returned cells. That choice supports the controlled buffer comparison; it is not a general claim that raster downloads are preferable to server-side statistics. The experimental unit is a daily, source-verified observation opportunity, not an API response counted merely because it returned successfully. [DEC-49; OBS-69]

### E Provenance and recovery

For each date, accepted NDVI and NDMI outputs must have compatible scene, product, path, service version and acquisition instant. Both geometry variants are derived from those outputs after raster validation. Missing identity metadata, ambiguous multiple-source output or a mismatch cannot silently become a complete pair. Preserved requests, responses, processing settings and hashes link the resulting summaries to the acquired material. These checks establish consistency of returned metadata and reproducibility of the calculation; they do not independently establish the land cover represented by each pixel. [research-protocol §20; OBS-69]

Two NDVI downloads were interrupted during the original collection. Recovery repeated each affected request once with its body unchanged, then checked compatibility with the already retained NDMI response. Both downloads succeeded on retry, but both recovered observations were quality rejected and retained null means. The original failures and first frozen snapshot were preserved alongside the revised freeze. This distinguishes a transport failure from a negative quality outcome: successful retrieval resolves the former without requiring the latter to become a passing measurement. The exact cause of the original failures remains unconfirmed. [DEC-52; OBS-67; OBS-68; OBS-69]

The final snapshot covers all 365 dates with zero unresolved processing cases. It is identified by a SHA-256 digest and linked to the source collection and analysis manifest. Provenance frameworks such as W3C PROV distinguish data entities and the activities producing them [35]; FAIR principles address discoverability, access, interoperability and reuse [36]. These are useful conceptual references for the retained chain. We do not claim formal PROV conformance, FAIR certification or a public data release merely because local files and hashes exist. The preserved research collection remains separate from the production database. [OBS-69]

### F Delivery policies and outcomes

Let N(d,g) and M(d,g) be binary indicators that NDVI and NDMI pass on date d for geometry g. Let J(d,g) denote joint eligibility and A(d,g) denote any-index eligibility under independent delivery. Equations (3) and (4) define these conditions. Joint delivery displays both indices when J is one and neither otherwise. Independent delivery displays the passing index or indices when A is one. It neither invents a missing companion nor carries an older observation forward. Complete pairs additionally require the source compatibility described above. [research-protocol §19–20]

J(d,g) = N(d,g) × M(d,g)    (3)

A(d,g) = max{N(d,g), M(d,g)}    (4)

Calendar coverage for an eligibility indicator Q is 100 times the sum of Q across the 365 dates divided by 365. We calculate any-index coverage, complete-pair coverage and separate NDVI and NDMI coverage. The policy difference is independent minus joint in percentage points. The buffer interaction is the buffered policy difference minus the original policy difference. Complete-pair coverage must remain identical between policies on the same fully resolved inputs, because changing whether a singleton is displayed does not create its missing companion. [research-protocol §19; OBS-70]

Table III makes the policy behavior explicit. Its rows are logical cases, not additional empirical observations. A date with no acquisition and a date with quality rejection can both deliver no values, but their upstream states remain different in the accounting. This separation prevents display behavior from collapsing acquisition, processing and quality outcomes into one ambiguous failure category. It also allows controlled tests to exercise singleton behavior even when the historical case contains no such dates. [DEC-49; OBS-71]

Table III. Delivery logic for source-compatible inputs

| NDVI passes | NDMI passes | Joint output | Independent output |
|---|---|---|---|
| Yes | Yes | Both | Both |
| Yes | No | Neither | NDVI |
| No | Yes | Neither | NDMI |
| No | No | Neither | Neither |

### G Gaps and technical verification

Consecutive qualifying dates define the inter-observation gaps. We report their mean, median and maximum rather than deriving a delivery promise from nominal revisit timing. Leading absence before the first passing observation and trailing absence after the last are reported separately. With fewer than two passing dates, a consecutive-gap estimate would be undefined. Unresolved dates would require retaining lower and upper coverage bounds; those are identification bounds for missing information, not confidence intervals. Because all acquisition processing was resolved, the final bounds coincide. [research-protocol §19; OBS-70]

The technical evaluation uses controlled inputs to exercise the actual quality function, worker handling and presentation helpers. Scenarios include complete pairs, partial quality, rejection, missing acquisition, duplicates, concurrent requests, simulated failure and recovery, and irregular dates. The SQL projection is inspected statically in this phase. Chart JSX is evaluated with host stubs, not on a rendered native device. These choices test the stated implementation boundaries while keeping synthetic cases out of the scientific sample. They do not add observation dates, validate database locking or replace a farmer study. [OBS-71]

## IV Results

### A Inventory and coverage

The resolved inventory contains 71 acquisition dates and 294 no-acquisition dates under the completed query. Of the acquisition dates, 23 pass both indices and 48 fail both. No NDVI-only or NDMI-only passing date occurs for either geometry. All original and buffered dates are fully evaluated, and no unresolved downloads remain. Table IV separates these accounting categories. In particular, the 71 verified pairs refer to source-compatible processed outputs; they are not 71 quality-passing pairs. Only the 23 passing dates contribute delivered observations under the fixed rule. [OBS-69; OBS-70]

Table IV. Calendar accounting for the frozen case

| Category | Days |
|---|---:|
| Total calendar window | 365 |
| No acquisition in completed query | 294 |
| Source-verified acquisition dates | 71 |
| Both indices pass | 23 |
| Both indices quality rejected | 48 |
| Exactly one index passes | 0 |
| Unresolved processing | 0 |

Table V reports the policy comparison. Every combination delivers some index on 23 dates, a complete pair on 23 dates and each individual index on 23 dates. The common calendar coverage is 23/365, or 6.30 percent. Each geometry/policy combination delivers 46 individual values because every passing date contributes two indices. Independent-minus-joint differences are zero percentage points for the reported coverage measures. The buffer interaction is also zero. These equalities describe the observed case and do not constitute a statistical equivalence test. [OBS-70]

Table V. Calendar coverage by geometry and policy

| Geometry | Policy | Any days | Pair days | Coverage |
|---|---|---:|---:|---:|
| Original | Joint | 23 | 23 | 6.30% |
| Original | Independent | 23 | 23 | 6.30% |
| Buffered | Joint | 23 | 23 | 6.30% |
| Buffered | Independent | 23 | 23 | 6.30% |

Conditional on the 71 catalogue dates, the passing fraction is 23/71, or 32.39 percent. This secondary fraction answers how often an inventoried acquisition date passed; it does not replace the 365-day denominator. Reporting only the conditional fraction would conceal the days without an acquisition under the query. Likewise, counting 46 index values as 46 calendar dates would double-count paired observations. The separate totals make the information delivered by each policy explicit without presenting numerical abundance as temporal continuity. [OBS-70]

### B Temporal gaps

All geometry/policy combinations share the same passing-date sequence. Its mean consecutive gap is 12.95 days, its median is 10 days and its maximum is 65 days. The observation window also contains 75 leading absent days and four trailing absent days. Fig. 1 displays the full-year positions of the passing dates for each geometry/index series. The repeated rows make their coincidence visible; they do not represent independent replicates or additional fields. Neither the figure nor the gap summary contains interpolated observations. [OBS-70]

![Passing observations across calendar 2021](phase7-timeline.png)

Fig. 1. Passing dates for the original and buffered NDVI and NDMI series. Both delivery policies coincide. The axis retains the full 2021 calendar; dots show qualifying dates rather than crop condition. Source: frozen Phase 4 daily-pixel analysis. [OBS-70]

The 65-day maximum is an interval between passing dates; the 75-day leading absence precedes the first passing date. Neither measures processing latency. Together they show why the mean interval cannot guarantee similar observation spacing throughout the year. [OBS-70]

### C Buffer sensitivity

The buffer reduces geometric area by 55.82 percent and decreases source-present support from 36 to 16 NDVI cells and from nine to four NDMI cells. Table VI reports valid-cell summaries across the 71 acquisition dates. Mean valid counts decline for both indices, and all four valid-count medians are zero. Despite the reduced support, no date changes its passing decision. The same 23 dates satisfy the fixed floors before and after buffering. The coverage sensitivity is therefore zero even though the pixel-count sensitivity is substantial. [OBS-58; OBS-70]

Table VI. Pixel support across acquisition dates

| Series | Source cells | Mean valid | Median valid |
|---|---:|---:|---:|
| Original NDVI | 36 | 11.746 | 0 |
| Buffered NDVI | 16 | 5.211 | 0 |
| Original NDMI | 9 | 2.930 | 0 |
| Buffered NDMI | 4 | 1.310 | 0 |

The result does not show that the buffer improves index accuracy, rice purity or agreement with a field reference. Those outcomes were not measured. It shows that the specified boundary removal changes sample support without changing the delivery-date classification under this particular rule. The technical floors were held constant, and the buffer distance was not adjusted after the results were known. This distinction prevents the zero coverage change from being misread as evidence that boundary selection never matters. [DEC-49; OBS-70]

### D Recovery and technical checks

Both recovered NDVI responses matched their retained NDMI source identities. Their quality rejection means that successful recovery did not increase the number of passing dates. Recovery instead removed uncertainty about the affected dates and completed the dataset accounting. The result illustrates why a failed download should be retained as unresolved until investigated: it cannot be classified as either a passing observation or a quality rejection from the failed transfer alone. The preserved original and revised snapshots document that distinction. [OBS-67; OBS-68; OBS-69]

The scoped technical evaluation passed 46 backend tests and 35 root tests, together with frontend type checking and lint. Complete inputs at the nine/three floors passed; controlled partial inputs at nine/two and eight/three were rejected by the joint production rule. Worker replay exercised duplicate and inflight reuse and simulated failure/recovery. Presentation checks preserved numerical zero, omitted null values and avoided substituting record creation time for acquisition time. These are automated engineering findings, not additional real-provider observations. Table VII summarizes their proof boundaries. [OBS-71]

Table VII. Technical evaluation evidence

| Boundary | Finding | Limit |
|---|---|---|
| Quality function | Complete passes; partial rejects | Controlled inputs |
| Worker replay | Reuse and recovery exercised | Simulated provider/admin |
| Read projection | Both means require joint pass | Static SQL inspection |
| Presentation | Zero retained; null absent | Helpers and host-stub JSX |
| Date chart | Elapsed spacing; unjoined dots | No native-device render |

The checks identified and corrected a presentation defect. The previous field-detail chart placed records at equal intervals and connected them across missing dates. The revised chart positions dots by elapsed acquisition date and leaves them unconnected. Its application axis spans the first and last numeric observations, while Fig. 1 retains the full study year. This is a bounded improvement in representation of the existing data; it does not demonstrate that independent delivery improved coverage or that users interpreted the revised chart successfully. [OBS-71]

## V Discussion

### A Meaning of the zero policy difference

Independent delivery can increase any-index coverage only when exactly one index passes. The observed case contains no such dates, so the zero difference follows directly from the frozen decision table. There is no hidden benefit to recover by changing the display policy on these inputs. This conclusion is stronger than saying that a positive effect was not statistically significant: no significance test was performed, and the descriptive counts themselves coincide. It is also narrower than universal equivalence, because the case samples only one block, year and processing contract. [OBS-70; DEC-49]

A singleton fixture remains useful for checking behavior, but it cannot supply the absent empirical opportunity. For example, a controlled NDVI-passing/NDMI-failing record can establish that the production joint rule rejects the pair. It cannot show that this situation occurred in the measured case. Separating those evidence types prevents a software demonstration from being presented as a scientific improvement. The practical design implication is to retain the observed zero result when deciding whether independent delivery merits future implementation and evaluation. [OBS-70; OBS-71]

The comparison also clarifies the role of shared inputs. Both indices depend on the same acquisition context, and the study applies related source-presence and scene-quality requirements. These conditions can produce concordant decisions. However, the experiment does not isolate the causal contribution of the masks, resolutions or thresholds to that concordance. Explaining the equality through the absence of singleton decisions is supported; claiming that a particular cloud process caused every rejection would require a separate analysis. The result should therefore guide subsequent questions without being stretched into an unmeasured mechanism. [research-protocol §20; OBS-70]

### B Availability and the monitoring promise

Calendar coverage, catalogue-conditioned passing fraction and observation gaps describe different aspects of availability. The 6.30 percent calendar value includes the entire year, while 32.39 percent describes passing among inventoried dates. The 65-day maximum internal gap identifies a long interval between passing observations, and the leading absence describes the beginning of the window. Together they provide a more useful description than one percentage alone. They still describe a historical research case rather than a forward-looking service-level commitment. [OBS-70]

For Matani, the implication is that unavailable information must remain visible as an information state. Replacing missing values with zero would change the meaning of the index, while connecting distant observations can imply continuity that was not observed. The corrected chart addresses the latter issue at the tested code boundary. A later interface study should investigate whether the date, quality status and absence are understandable in actual field use. The present technical checks justify neither a monitoring cadence for Indonesia nor a claim that the display already meets farmers' needs. [DEC-24; OBS-71]

### C Geometry and validity limits

The original rectangle is not a surveyed farm parcel. Selecting it from a map derived partly from Sentinel-2 also creates possible dependence between the selection source and optical detectability. The map is appropriate as a documented screening input, but it is not an independent validation dataset for Sentinel-2 accuracy [26]. Within the selected block, no dated crop-reference observations establish the crop stage or condition associated with every acquisition. These limitations bound both the rice interpretation and the geographic generalization of the findings. [EVID-061; DEC-49]

The inward buffer tests one spatial sensitivity and removes more than half the original area. Its unchanged coverage result should not obscure that loss. In a small block, a fixed absolute quality floor consumes a larger share of available support after buffering; this follows from retaining the same nine/three requirement on fewer cells. The study intentionally preserves that contract rather than adapting the rule to make the geometries equally permissive. It evaluates the specified policy interaction, not an optimized buffer or a calibrated minimum field size. [OBS-58; OBS-70; DEC-49]

### D Operational and research reproducibility

The recovery record separates provider transport from measurement quality. Retrying an unchanged request can resolve an interrupted transfer while still producing a rejected observation. Without that distinction, connectivity problems could distort the apparent quality distribution or be mistaken for missing acquisitions. Here the retained failures, compatible recovered outputs and revised snapshot make the final accounting auditable. They do not establish whether Wi-Fi, a remote service or another transport condition caused the original interruption. No causal diagnosis is required to report the recovered result honestly. [DEC-52; OBS-69]

Reproducibility also has several levels. Repeating the offline calculation on preserved bytes checks the tables and policy metrics. Reissuing historical provider requests may depend on service behavior and product revisions. Repeating a production mobile workflow adds authentication, scheduling, persistence and display conditions. Our frozen analysis and controlled technical checks address the first level and selected implementation boundaries. They do not close all later levels. Preserved metadata and hashes help locate differences between runs, but they cannot by themselves guarantee future provider availability or correct execution on a physical device. [OBS-69; OBS-70; OBS-71]

### E Subsequent evaluation

A broader availability study should specify additional blocks, years and selection rules before comparing their outcomes. Different geometries and quality specifications may create singleton opportunities, but they should not be chosen merely to manufacture a positive policy effect. A separate agronomic study would need reference variables and dated field observations appropriate to the claimed outcome. A user study would need actual users, tasks and measures of interpretation or decision support. These are distinct extensions with different evidence requirements, rather than consequences automatically established by the current software. [DEC-49; research-protocol §19–20]

The next operational checks concern repeatable device-initiated completion, native rendering and database behavior. If independent delivery is implemented later, it must preserve an absent companion honestly and undergo persistence and presentation checks. This case provides no empirical coverage argument for prioritizing that feature over reliability and clear presentation. [OBS-70; OBS-71]

## VI Conclusion

Matani's delivery-policy evaluation found identical observations under complete-pair and independent delivery for one mapped-rice block in Krangkeng during 2021. Both original and inward-buffered geometries provided passing NDVI/NDMI pairs on 23 of 365 days, yielding 6.30 percent calendar coverage. No singleton date occurred. Buffering reduced pixel support without changing the passing-date set, and the longest consecutive-observation gap was 65 days. Two recovered downloads completed the accounting while remaining quality rejected. The result demonstrates no observed policy benefit under the frozen conditions. [OBS-69; OBS-70]

The accompanying technical evaluation supports bounded claims about quality handling, worker replay and truthful date presentation. It does not establish agronomic accuracy, farmer usability or repeatable production completion. The paper's contribution is the explicit connection between measurement availability and information delivery: dates without acquisitions, rejected observations, unresolved processing and hidden passing indices require different treatment. Preserving those distinctions makes the zero result interpretable and provides a defensible basis for later multi-case, operational and user evaluation. [OBS-71; DEC-49]

## Data and Software Availability

The derived snapshot, original responses, requests, hashes and scripts are retained in the thesis team’s local research archive and have not been publicly deposited. Public access to the source Open-SEA dataset [27] does not imply public access to this derived collection. Release arrangements remain subject to review. [OBS-69; DEC-53]

## References

[1] BPS-Statistics Indonesia, “Paddy harvested area and production in Indonesia 2023, final figures,” Mar. 1, 2024. https://www.bps.go.id/en/pressrelease/2024/03/01/2375/pada-2023--luas-panen-padi-mencapai- [EVID-067]

[2] R. Zhao, Y. Li, and M. Ma, “Mapping paddy rice with satellite remote sensing: A review,” Sustainability, vol. 13, no. 2, art. 503, 2021, doi: 10.3390/su13020503. https://www.mdpi.com/2071-1050/13/2/503 [EVID-068]

[3] D. C. Rose et al., “Decision support tools for agriculture: Towards effective design and delivery,” Agricultural Systems, vol. 149, pp. 165–174, 2016, doi: 10.1016/j.agsy.2016.09.009. https://discovery.ucl.ac.uk/id/eprint/1556099/ [EVID-069]

[4] Copernicus Data Space Ecosystem, “Sentinel-2 L2A,” technical documentation, accessed Sep. 15, 2026. https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html [EVID-070]

[5] Sentinel Hub, “Normalized difference vegetation index,” Custom Scripts, accessed Sep. 15, 2026. https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/ndvi/ [EVID-071]

[6] B.-C. Gao, “NDWI—A normalized difference water index for remote sensing of vegetation liquid water from space,” Remote Sensing of Environment, vol. 58, no. 3, pp. 257–266, 1996, doi: 10.1016/S0034-4257(96)00067-3. https://modis.gsfc.nasa.gov/sci_team/pubs/abstract_new.php?id=03634 [EVID-072]

[7] Sentinel Hub, “Normalized Difference Moisture Index,” Custom Scripts, accessed Sep. 15, 2026. https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/ndmi/ [EVID-073]

[8] U.S. Geological Survey, “Normalized Difference Moisture Index,” Landsat Missions, accessed Sep. 15, 2026. https://www.usgs.gov/landsat-missions/normalized-difference-moisture-index [EVID-074]

[9] C. Kuenzer and K. Knauer, “Remote sensing of rice crop areas,” International Journal of Remote Sensing, vol. 34, no. 6, pp. 2101–2139, 2013, doi: 10.1080/01431161.2012.738946. https://elib.dlr.de/82597/ [EVID-075]

[10] K. R. Thorp and D. Drajat, “Deep machine learning with Sentinel satellite data to map paddy rice production stages across West Java, Indonesia,” Remote Sensing of Environment, vol. 265, art. 112679, 2021, doi: 10.1016/j.rse.2021.112679. https://www.ars.usda.gov/research/publications/publication/?seqNo115=382490 [EVID-076]

[11] S. Guan et al., “Assessing correlation of high-resolution NDVI with fertilizer application level and yield of rice and wheat crops using small UAVs,” Remote Sensing, vol. 11, no. 2, art. 112, 2019, doi: 10.3390/rs11020112. https://www.mdpi.com/journal/remotesensing/editors_choice?listby=date&page_count=50&page_no=14 [EVID-077]

[12] J. Huang, X. Wang, X. Li, H. Tian, and Z. Pan, “Remotely sensed rice yield prediction using multi-temporal NDVI data derived from NOAA’s AVHRR,” PLOS ONE, vol. 8, no. 8, art. e70816, 2013, doi: 10.1371/journal.pone.0070816. https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0070816 [EVID-078]

[13] J.-H. Ryu et al., “Remote sensing-based evaluation of heat stress damage on paddy rice using NDVI and PRI measured at leaf and canopy scales,” Agronomy, vol. 12, no. 8, art. 1972, 2022, doi: 10.3390/agronomy12081972. https://www.mdpi.com/2073-4395/12/8 [EVID-079]

[14] J. Soriano-González et al., “Monitoring rice crop and yield estimation with Sentinel-2 data,” Field Crops Research, vol. 281, art. 108507, 2022, doi: 10.1016/j.fcr.2022.108507. https://repositori.irta.cat/handle/20.500.12327/1682 [EVID-050]

[15] I. Tsardanidis, A. Koukos, V. Sitokonstantinou, T. Drivas, and C. Kontoes, “Cloud gap-filling with deep learning for improved grassland monitoring,” arXiv:2403.09554v1, 2024. https://arxiv.org/abs/2403.09554v1 [EVID-064]

[16] Z. Zhai, J. F. Martínez, V. Beltran, and N. Lucas Martínez, “Decision support systems for agriculture 4.0: Survey and challenges,” Computers and Electronics in Agriculture, vol. 170, art. 105256, 2020, doi: 10.1016/j.compag.2020.105256. https://oa.upm.es/63393/ [EVID-080]

[17] F. Gutiérrez, N. N. Htun, F. Schlenz, A. Kasimati, and K. Verbert, “A review of visualisations in agricultural decision support systems: An HCI perspective,” Computers and Electronics in Agriculture, vol. 163, art. 104844, 2019, doi: 10.1016/j.compag.2019.05.053. https://zenodo.org/records/3267196 [EVID-081]

[18] G. Cucho-Padin et al., “Development of low-cost remote sensing tools and methods for supporting smallholder agriculture,” Applied Geomatics, vol. 12, pp. 247–263, 2020, doi: 10.1007/s12518-019-00292-5. https://link.springer.com/article/10.1007/s12518-019-00292-5 [EVID-082]

[19] L. Simionesei, T. B. Ramos, J. Palma, A. R. Oliveira, and R. Neves, “IrrigaSys: A web-based irrigation decision support system based on open source data and technology,” Computers and Electronics in Agriculture, vol. 178, art. 105822, 2020, doi: 10.1016/j.compag.2020.105822. https://researchportal.ulisboa.pt/en/publications/irrigasys-a-web-based-irrigation-decision-support-system-based-on/ [EVID-049]

[20] D. C. Rose and T. J. A. Bruce, “Finding the right connection: What makes a successful decision support system?” Food and Energy Security, vol. 7, no. 1, art. e00123, 2018, doi: 10.1002/fes3.123. https://pmc.ncbi.nlm.nih.gov/articles/PMC5993350/ [EVID-083]

[21] Sentinel Hub, “EO Browser,” product documentation, accessed Sep. 15, 2026. https://www.sentinel-hub.com/explore/eobrowser/ [EVID-084]

[22] OneSoil, “NDVI API,” API Guide, accessed Sep. 15, 2026. https://api-b2b.prod-be.onesoil.ai/docs/ndvi_api/ [EVID-085]

[23] Plantix, “Plantix,” product website, accessed Sep. 15, 2026. https://plantix.net/en/ [EVID-086]

[24] J. Chou et al., “Changes in extreme climate events in rice-growing regions under different warming scenarios in China,” Frontiers in Earth Science, vol. 9, art. 655128, 2021, doi: 10.3389/feart.2021.655128. https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.655128/full [EVID-087]

[25] Open-Meteo, “Weather Forecast API,” documentation, accessed Sep. 15, 2026. https://open-meteo.com/en/docs [EVID-088]

[26] F. I. Ginting et al., “High-resolution maps of rice cropping intensity across Southeast Asia,” Scientific Data, vol. 12, art. 1408, 2025, doi: 10.1038/s41597-025-05722-1. https://www.nature.com/articles/s41597-025-05722-1 [EVID-061]

[27] F. I. Ginting et al., “Open-SEA-Rice-10,” dataset, Zenodo, record 14627003, 2025, doi: 10.5281/zenodo.14627003. https://zenodo.org/records/14627003 [EVID-060]

[28] H. Butler, M. Daly, A. Doyle, S. Gillies, S. Hagen, and T. Schaub, “The GeoJSON format,” RFC 7946, 2016, doi: 10.17487/RFC7946. https://www.rfc-editor.org/rfc/rfc7946 [EVID-089]

[29] Copernicus Data Space Ecosystem, “Catalog API,” documentation, accessed Sep. 15, 2026. https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Catalog.html [EVID-065]

[30] Copernicus Data Space Ecosystem, “Processing API,” documentation, accessed Sep. 15, 2026. https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Process.html [EVID-090]

[31] Sentinel Hub, “Evalscript V3,” documentation, accessed Sep. 15, 2026. https://docs.sentinel-hub.com/api/latest/evalscript/v3/ [EVID-091]

[32] Sentinel Hub, “dataMask,” documentation, accessed Sep. 15, 2026. https://docs.sentinel-hub.com/api/latest/user-guides/datamask/ [EVID-092]

[33] Sentinel Hub, “Sentinel-2 L2A Scene Classification Map,” Custom Scripts, accessed Sep. 15, 2026. https://custom-scripts.sentinel-hub.com/custom-scripts/sentinel-2/scene-classification/ [EVID-093]

[34] Sentinel Hub, “Statistical API,” documentation, accessed Sep. 15, 2026. https://docs.sentinel-hub.com/api/latest/api/statistical/ [EVID-094]

[35] W3C, “PROV-Overview,” W3C Working Group Note, Apr. 30, 2013. https://www.w3.org/TR/prov-overview/ [EVID-095]

[36] M. D. Wilkinson et al., “The FAIR Guiding Principles for scientific data management and stewardship,” Scientific Data, vol. 3, art. 160018, 2016, doi: 10.1038/sdata.2016.18. https://www.nature.com/articles/sdata201618 [EVID-096]
