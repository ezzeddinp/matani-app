param(
  [string]$InputPath = ".agent\thesis.docx",
  [string]$OutputPath = ".agent\thesis-revised-aligned.docx"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName WindowsBase

$resolvedInput = (Resolve-Path -LiteralPath $InputPath).Path
$workspaceRoot = (Resolve-Path -LiteralPath ".").Path
$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path $workspaceRoot $OutputPath))

if (-not $resolvedOutput.StartsWith($workspaceRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Output path must stay inside the Matani workspace: $resolvedOutput"
}

Copy-Item -LiteralPath $resolvedInput -Destination $resolvedOutput -Force

$replacementByParagraph = @{
  1 = "A Mobile Decision Support Application for Rice Crop Condition and Climate Risk Classification Using NDVI, SWIR-Derived Moisture Indicators, and Weather Data"
  21 = "Abstract - Rice agriculture in Indonesia faces climate variability and limited access to timely, field-specific information. This paper presents Matani, a rice-focused mobile decision support application that combines user-defined field polygons, Sentinel-2 NDVI, an SWIR-derived moisture indicator (NDMI), weather information, rule-based classifications, and optional generative-AI summarization. The current satellite path is explicitly treated as a prototype rather than a validated measurement pipeline: it uses a field bounding box and a predefined 1-5 September 2025 demonstration window, applies no versioned Scene Classification Layer cloud/shadow mask, persists no provenance-complete measurements, and may display visibly labeled synthetic fixture data when retrieval is unavailable. The field-detail history is also a labeled fixture demonstration. The thesis-target pipeline therefore requires polygon-exact statistics, dynamic policy-bounded acquisition windows, versioned quality masking, valid-pixel accounting, complete provenance, persistence, and explicit passed, rejected, or unavailable outcomes. The client-side climate-risk score is an uncalibrated heuristic (HYP-07), and the NDVI interpretation ranges are author-defined prototype ranges (HYP-04). Matani does not perform exact yield prediction, disease diagnosis, or validated agronomic forecasting. Functional testing, API response testing, conceptual plausibility checks, and UAT are separated from the measurement evaluation needed to support defensible DSS claims."
  22 = "Keywords - rice crop monitoring, NDVI, NDMI, SWIR, Sentinel-2, remote sensing, weather risk, rule-based classification, decision support system, measurement provenance"
  27 = "This study presents Matani as a mobile decision support prototype that translates explicitly state-labeled satellite-index, weather, and field inputs into interpretable information for rice-focused evaluation. The current interface may show labeled fixture trends and an uncalibrated client-side weather-risk indicator, but it does not yet deliver provenance-safe field measurements or a production notification/alerting system. Matani is not intended to replace agronomic expertise or produce exact yield and disease predictions. The paper-defined GROW workflow frames Gathering available inputs, Recognizing rule-based signals, Offering educational content or optional summaries, and Warning through visible heuristic or unavailable states; thesis-target warnings depend on the quality-gated measurement pipeline."
  42 = "Time-series analysis can add value because a single vegetation-index value does not fully describe crop condition. In Matani, provenance-safe time-series analysis and trained anomaly detection are future work unless they are implemented and evaluated on persisted observations; the current field-detail history is a visibly labeled synthetic fixture and is not used as a research measurement."
  46 = "In the current Matani prototype, weather retrieval provides precipitation and humidity inputs to a client-side heuristic score, defined later in Section I. The score is a rule-based presentation-layer indicator, not a calibrated agronomic model. More complex indicators such as consecutive dry days, heatwave duration, or inundation risk remain future extensions unless they are implemented, versioned, and validated."
  53 = "Matani addresses this gap by combining NDVI-based crop-condition indicators, an SWIR-derived moisture indicator, weather information, rule-based risk classification, and optional AI-assisted recommendation summarization within a mobile decision support application. Machine-learning-based anomaly detection and prediction are treated as future work unless a trained and evaluated model is implemented as part of the final system."
  56 = "This study employs a system-development and decision-support research approach to design Matani as a mobile application for rice crop condition monitoring and climate risk classification. The methodology distinguishes the current prototype from the thesis-target measurement pipeline. The product interface retains five crop categories (padi, jagung, kedelai, teh, and kopi), while thesis sampling, evaluation, and claims are restricted to padi (rice); the other crop categories are product scope rather than research evidence. Matani does not provide exact yield, disease, or soil-fertility prediction. It uses author-defined NDVI interpretation ranges (HYP-04), an SWIR-derived NDMI moisture context, a client-side heuristic weather-risk score (HYP-07), and optional AI-assisted recommendation summarization."
  61 = "The GROW workflow begins with Gathering user-defined field boundaries and retrieving weather plus prototype satellite inputs. Recognizing translates available signals through explicitly labeled rule-based interpretations; it does not convert fixture or non-provenance-safe values into measurements. Offering presents educational content and optional AI-assisted summaries. Warning presents heuristic risk information only when its data state is visible. The thesis-target workflow replaces prototype retrieval with persisted, quality-gated measurements or an explicit unavailable outcome."
  63 = "Matani's as-built prototype and thesis-target design involve the user and provider inputs summarized in Table I. The table does not imply that current satellite inputs are provenance-safe measurements or that production alert delivery has been implemented."
  76 = "10-20 m native band resolution; nominal five-day revisit under full-constellation/cloud-free conditions, with lower usable observation frequency under tropical cloud cover"
  79 = "Weather context for a client-side, uncalibrated heuristic indicator; production early-warning delivery is not implemented"
  100 = "Provider-returned interval NDVI/NDMI statistics and HYP-04 prototype interpretation; not a persisted field measurement"
  104 = "Client-side uncalibrated HYP-07 heuristic score (0-100) and risk level"
  108 = "Prioritized contextual summaries (optional UX; never measurement, ground truth, diagnosis, or validated agronomic advice)"
  111 = "Users define agricultural fields by drawing polygon boundaries on the mobile map interface. Each polygon is stored in the WGS84 coordinate reference system. The database derives a geography-based field area, while a centroid is used only as a representative coordinate for location-based weather retrieval. In the current prototype, the satellite request is constructed from the polygon's bounding box rather than from the exact polygon geometry. A bounding box is an implementation envelope and must not be interpreted as the field boundary used for a validated field-level measurement. Polygon-exact satellite statistics are a required target of the thesis measurement pipeline."
  114 = "The current prototype backend queries the Sentinel Hub Statistical API for Sentinel-2 Level-2A surface-reflectance data using a bounding box derived from the user-drawn field. Bands B04, B08, and B11 represent red, near-infrared, and short-wave infrared information, respectively [23]. NDVI uses B04 and B08 at 10 m native resolution, while the study's NDMI uses B08 and B11 with B11 at 20 m native resolution. Any common output grid therefore requires an explicit resampling choice and does not create new 10 m spatial detail in B11."
  124 = "The Sentinel Hub Statistical API can return interval statistics such as minimum, maximum, mean, and standard deviation for the requested geometry and time window [25]. An HTTP/API response and an in-range value do not by themselves establish a valid Matani measurement; measurement status additionally requires the thesis pipeline's geometry, quality, provenance, and persistence contract."
  125 = "The prototype request currently uses a predefined 1-5 September 2025 demonstration window. It sends the source dataMask but does not apply a versioned Scene Classification Layer rule to exclude clouds, cirrus, cloud shadows, and invalid pixels. The request uses a bounding box rather than the exact field polygon and falls back to a Jakarta bounding box if no bbox is supplied. The field-list interface may display synthetic NDVI fixture values when live retrieval is unavailable, and the field-detail NDVI history is generated by a simulator; both are now visibly labeled and are not satellite measurements. No satellite result is persisted with measurement provenance. The thesis-target pipeline will replace this behavior with polygon-exact statistics, a policy-bounded dynamic acquisition window, versioned SCL-based masking, per-index valid-pixel accounting, complete provenance, persistent storage, and explicit passed, rejected, or unavailable outcomes."
  127 = "NDVI is used generally as a vegetation-greenness indicator in rice remote-sensing literature [4], [6], [9]. The specific 0.60, 0.20, and 0.00 boundaries below are author-defined prototype interpretation ranges (HYP-04), not thresholds established by those sources and not a crop-health diagnosis."
  130 = "Prototype NDVI Interpretation Ranges (HYP-04)"
  136 = "High Greenness (Prototype)"
  137 = "Author-defined range; not a health diagnosis"
  140 = "Moderate Greenness (Prototype)"
  141 = "Requires field and phenology context"
  144 = "Low Greenness (Prototype)"
  145 = "May reflect early growth, sparse cover, soil, water, or stress"
  148 = "Negative NDVI (Prototype)"
  149 = "May indicate water, soil, or a non-vegetated surface"
  152 = "These author-defined prototype ranges require local calibration by rice variety, phenological stage, planting calendar, and field condition. They are used only for interface interpretation and must not be presented as validated agronomic classes."
  154 = "Weather data are retrieved for the user's location or a selected field centroid. The as-built backend attempts AccuWeather when configured and falls back to Open-Meteo. The target architecture consolidates on Open-Meteo as the default provider; this provider change is future work and is not presented as complete."
  155 = "The prototype translates average forecast precipitation and a representative humidity value into a client-side heuristic indicator. These inputs and weights are used for an interface demonstration, not as a calibrated model of rice damage, disease, or yield risk."
  162 = "This score is not adopted from an established agronomic risk model. It is an author-defined prototype decision-support indicator (HYP-07), calculated in the mobile presentation layer and not calibrated against local field observations. Its value is therefore shown as a heuristic score rather than a probability of crop loss."
  175 = "High heuristic indicator; field verification required"
  179 = "Matani provides static educational content and an optional Gemini-based summarization service. The service receives an explicit fixture, prototype, measured, or unavailable state with each NDVI/NDMI input and may summarize that state, field area, index values, and weather context into plain-language text. It is not a classifier, sensor, measurement source, research label, or ground truth. The service prompt forbids converting fixture/prototype input into measurements or diagnoses and forbids chemical-application instructions; generated text remains optional, requires field verification, and must not be interpreted as validated agronomic advice."
  181 = "The following planned evaluation framework separates software behavior from measurement validity so that a successful interface or API response is never treated as proof of agronomic accuracy. At the current repository baseline there is no automated test suite or completed UAT dataset; the items below are evaluation procedures to be implemented and reported, not completed results:"
  182 = "1) Planned Functional Testing: Authentication, polygon drawing, weather retrieval, data-state presentation, and optional-summary viewing will be tested against functional requirements. Every satellite-related test will record whether it exercised fixture, prototype, measured, or unavailable data. Fixture/prototype UI tests must not be reported as measured-data tests."
  183 = "2) Planned API Response Testing: Deterministic fixtures will verify response schema, band arithmetic, error handling, and the expected numeric range without ordinary CI calling live or paid providers. Any explicit bounded live-prototype check will be reported separately. API availability or an in-range NDVI/NDMI value will not establish field-level measurement accuracy."
  184 = "3) Planned Conceptual Plausibility Check: NDVI/NDMI behavior may be compared cautiously with rice phenology literature [4], [9], but only as a plausibility check. The author-defined HYP-04 boundaries are not validated by those sources, and plausibility cannot replace polygon-exact measurement evaluation or field-level ground truth."
  185 = "4) Planned User Acceptance Testing (UAT): A qualitative evaluation will assess whether prospective users understand the data-state labels, rule-based interpretations, risk caveats, and optional AI summaries. UAT will evaluate usability and comprehension, not agronomic accuracy."
  186 = "5) Known Validation Limitations: The current prototype has no field-level ground truth such as biomass sampling, soil-moisture sensors, agronomist labels, or yield records. It also lacks polygon-exact satellite statistics, versioned SCL masking, per-index valid-pixel accounting, provenance-complete persistence, and measured history. Consequently, current testing can address software behavior, response handling, and interface usability only; it cannot establish agronomic accuracy, monitoring cadence, disease detection, or validated crop-risk prediction. Measurement evaluation RQ1-RQ3 remains required before thesis claims are finalized."
  197 = "Rice crop condition and climate-risk classification (prototype)"
  201 = "Rice-focused mobile DSS prototype for field-oriented interpretation; not validated monitoring"
  243 = "Broader advisory platform, not centered on NDVI-NDMI rice-field risk classification"
  249 = "Strong seasonal planning tool; differs from Matani's field-oriented prototype interface"
  255 = "Focuses on photo-based crop diagnosis, unlike Matani's non-diagnostic prototype satellite-index integration"
  257 = "Existing systems provide weather, satellite visualization, scouting, irrigation, farm management, planting calendars, and image-based diagnosis. Matani is positioned as a rice-focused mobile DSS prototype that combines user-defined field boundaries, explicitly state-labeled Sentinel-2 NDVI/NDMI inputs, an uncalibrated weather-risk heuristic, and optional AI-assisted summaries. This positioning does not claim that the current prototype already provides provenance-safe measurements, validated monitoring, production alert delivery, or agronomic diagnosis."
  260 = "This prototype focuses its thesis claims on rice crop condition indicators and climate-risk decision support, although the product interface retains five crop categories. It does not estimate soil fertility, exact yield, or disease. The current satellite request uses a bbox (with a Jakarta fallback), a fixed 1-5 September 2025 demonstration window, no versioned SCL cloud/shadow mask, no polygon-level valid-pixel accounting, and no measurement persistence. The field list may substitute visibly labeled synthetic fixtures, while the detail history and its derived risk/harvest figures are labeled simulations. There is no field-level ground truth, completed automated test suite, completed UAT dataset, production notification system, or provenance-complete measured history; no current output establishes agronomic accuracy or a usable monitoring cadence. Backend endpoints remain unauthenticated and permissively CORS-open at this baseline, and the legacy schema file is not yet a reproducible versioned migration. The weather-risk formula and NDVI ranges are uncalibrated HYP-07/HYP-04 heuristics. Future work includes M0 security/reproducibility, the M1 Indonesia feasibility study and contract decisions, the M2 polygon-exact provenance-safe pipeline with explicit unavailable outcomes, and M3 measurement/system evaluation. Open-Meteo-default and CDSE migrations remain target work until implemented and verified."
  270 = "Fig. 2. Matani as-built prototype boundary. The thesis-target worker, quality gate, provenance persistence, and research workspace are required future components and must be shown separately."
  272 = "Matani's as-built prototype has a presentation layer, an Express integration layer, and a data/external-service layer. This as-built description is distinct from the thesis-target measurement architecture. Satellite, weather, and Gemini data requests use the backend boundary; mapping, place search, and display-only media use separate client-side services and do not enter the measurement path."
  273 = "The presentation layer is the Expo/React Native mobile application. It provides registration, login, polygon drawing, visibly labeled prototype/fixture NDVI/NDMI output, weather information obtained through the Matani backend, a client-side heuristic weather-risk indicator, optional AI-summary access, field notes, and an explicitly unavailable notification/settings surface. Profile activity, productivity, and achievement displays are either based on actual account/field metadata or labeled unavailable/preview; they are not agronomic measurements. The application does not currently deliver a production alerting system."
  274 = "The Express backend proxies Sentinel Hub statistics, weather retrieval, and Gemini requests. In the current implementation, Sentinel Hub/provider-side statistics supply index summaries, while the heuristic weather-risk score is calculated in the mobile presentation layer, not the backend. Moving that score into a versioned server-side component is planned hardening, not an as-built fact."
  275 = "The data/external-service layer includes Supabase, Sentinel Hub, AccuWeather/Open-Meteo, Gemini, Google Maps, OpenStreetMap Nominatim place search, and display-only media services. Supabase stores identity, field polygons, notes, and related operational records. Although the schema contains a lahan_health table, the current satellite path has no measurement writer and no provenance-complete historical crop-condition records. Sentinel Hub currently uses the commercial host; CDSE migration is target work. The backend's AccuWeather-to-Open-Meteo order is as-built, while Open-Meteo-only default is target work. Gemini remains optional UX and never enters the measurement or labeling path; mapping, geocoding, and media services likewise do not create research measurements."
  325 = "Title now uses 'Climate Risk Classification' because the current DSS assigns a scalar heuristic class/score to a user-defined field rather than producing a spatial risk raster."
  335 = "Unsupported machine-learning claims were removed from the abstract, keywords, research-gap contribution, and methodology. The implemented approach is described as rule-based classification, uncalibrated heuristics, and optional generative-AI summarization; trained ML remains future work unless implemented and evaluated."
}

$expectedAnchors = @{
  1 = "Climate Risk Mapping"
  21 = "Machine learning is positioned"
  22 = "machine learning"
  27 = "This study proposes Matani"
  63 = "Matani integrates four primary data sources"
  76 = "5-day revisit"
  79 = "Climate risk scoring and early warning"
  100 = "Daily vegetation index statistics"
  104 = "Normalized climate risk score"
  111 = "bounding box of the polygon"
  125 = "predefined demonstration time window"
  127 = "Table III"
  182 = "Functional Testing"
  197 = "climate-risk mapping"
  201 = "Rice-focused mobile DSS"
  243 = "rice-field risk mapping"
  249 = "live field-level mobile monitoring"
  255 = "satellite-based vegetation and moisture monitoring"
  260 = "fixed demonstration time window"
  274 = "heuristic risk-score calculation"
  275 = "historical crop condition records"
  335 = "ML is now framed"
}

$package = [System.IO.Packaging.Package]::Open(
  $resolvedOutput,
  [System.IO.FileMode]::Open,
  [System.IO.FileAccess]::ReadWrite,
  [System.IO.FileShare]::None
)

try {
  $documentUri = [System.IO.Packaging.PackUriHelper]::CreatePartUri(
    [System.Uri]::new("/word/document.xml", [System.UriKind]::Relative)
  )
  if (-not $package.PartExists($documentUri)) {
    throw "word/document.xml was not found in $resolvedOutput"
  }
  $documentPart = $package.GetPart($documentUri)

  $reader = [System.IO.StreamReader]::new(
    $documentPart.GetStream(
      [System.IO.FileMode]::Open,
      [System.IO.FileAccess]::Read
    )
  )
  try {
    [xml]$documentXml = $reader.ReadToEnd()
  }
  finally {
    $reader.Dispose()
  }

  $namespaceManager = [System.Xml.XmlNamespaceManager]::new($documentXml.NameTable)
  $namespaceManager.AddNamespace(
    "w",
    "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  )
  $paragraphs = $documentXml.SelectNodes("//w:p", $namespaceManager)

  foreach ($entry in $expectedAnchors.GetEnumerator()) {
    $paragraphIndex = [int]$entry.Key
    $currentText = (
      $paragraphs[$paragraphIndex].SelectNodes(".//w:t", $namespaceManager) |
        ForEach-Object { $_.InnerText }
    ) -join ""
    if (-not $currentText.Contains([string]$entry.Value)) {
      throw "Paragraph $paragraphIndex did not contain expected anchor '$($entry.Value)'. Found: $currentText"
    }
  }

  foreach ($entry in $replacementByParagraph.GetEnumerator()) {
    $paragraphIndex = [int]$entry.Key
    $textNodes = $paragraphs[$paragraphIndex].SelectNodes(".//w:t", $namespaceManager)
    if ($textNodes.Count -eq 0) {
      throw "Paragraph $paragraphIndex contains no text node."
    }

    $textNodes[0].InnerText = [string]$entry.Value
    for ($nodeIndex = 1; $nodeIndex -lt $textNodes.Count; $nodeIndex++) {
      $textNodes[$nodeIndex].InnerText = ""
    }
  }

  $utf8WithoutBom = [System.Text.UTF8Encoding]::new($false)
  $writer = [System.IO.StreamWriter]::new(
    $documentPart.GetStream(
      [System.IO.FileMode]::Create,
      [System.IO.FileAccess]::Write
    ),
    $utf8WithoutBom
  )
  try {
    $documentXml.Save($writer)
  }
  finally {
    $writer.Dispose()
  }
}
finally {
  $package.Close()
}

Write-Output "Created revised thesis: $resolvedOutput"
