param(
  [string]$InputPath = ".agent\thesis-revised-aligned.docx",
  [string]$OutputPath = ".agent\thesis-aligned-2026-08-21.docx",
  [string]$ArchitectureImagePath = "docs\diagrams\matani-audited-system-boundary-2026-08-21.png"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName WindowsBase

$workspaceRoot = (Resolve-Path -LiteralPath ".").Path
$resolvedInput = (Resolve-Path -LiteralPath $InputPath).Path
$resolvedImage = (Resolve-Path -LiteralPath $ArchitectureImagePath).Path
$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path $workspaceRoot $OutputPath))

if (-not $resolvedOutput.StartsWith($workspaceRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Output path must stay inside the Matani workspace: $resolvedOutput"
}

Copy-Item -LiteralPath $resolvedInput -Destination $resolvedOutput -Force

function Get-ParagraphText {
  param([System.Xml.XmlNode]$Paragraph, [System.Xml.XmlNamespaceManager]$Namespaces)

  return (($Paragraph.SelectNodes(".//w:t", $Namespaces) | ForEach-Object { $_.InnerText }) -join "")
}

function Set-ParagraphText {
  param(
    [System.Xml.XmlNode]$Paragraph,
    [string]$Text,
    [System.Xml.XmlNamespaceManager]$Namespaces
  )

  $textNodes = $Paragraph.SelectNodes(".//w:t", $Namespaces)
  if ($textNodes.Count -eq 0) {
    throw "Cannot replace a paragraph without a text node."
  }

  $textNodes[0].InnerText = $Text
  for ($index = 1; $index -lt $textNodes.Count; $index++) {
    $textNodes[$index].InnerText = ""
  }
}

function Find-Paragraph {
  param(
    [System.Xml.XmlDocument]$Document,
    [System.Xml.XmlNamespaceManager]$Namespaces,
    [string]$ExactText
  )

  foreach ($paragraph in $Document.SelectNodes("//w:p", $Namespaces)) {
    if ((Get-ParagraphText $paragraph $Namespaces) -eq $ExactText) {
      return $paragraph
    }
  }

  throw "Paragraph not found: $ExactText"
}

function New-ParagraphClone {
  param(
    [System.Xml.XmlNode]$Template,
    [string]$Text,
    [System.Xml.XmlNamespaceManager]$Namespaces
  )

  $clone = $Template.CloneNode($true)
  Set-ParagraphText $clone $Text $Namespaces
  return $clone
}

function Set-TableCellText {
  param(
    [System.Xml.XmlNode]$Cell,
    [string]$Text,
    [System.Xml.XmlNamespaceManager]$Namespaces
  )

  $paragraph = $Cell.SelectSingleNode("./w:p[1]", $Namespaces)
  if ($null -eq $paragraph) {
    throw "Table cell has no paragraph."
  }
  Set-ParagraphText $paragraph $Text $Namespaces

  $extraParagraphs = $Cell.SelectNodes("./w:p[position() > 1]", $Namespaces)
  foreach ($extra in @($extraParagraphs)) {
    [void]$Cell.RemoveChild($extra)
  }
}

$replacementByIndex = @{
  1 = "A Mobile Decision Support Application for Rice Field Time-Series Monitoring Using Sentinel-2 NDVI, NDMI, and Weather Data"
  21 = "Abstract - Rice agriculture in Indonesia faces climate variability and limited access to timely field information. This paper presents Matani, a padi-only mobile decision support prototype for inspecting dated Sentinel-2 Normalized Difference Vegetation Index (NDVI), a short-wave-infrared-derived Normalized Difference Moisture Index (NDMI), weather context, and field notes over time. The application presents raw values and explicit fixture, prototype, measured, or unavailable states; it does not classify crop health, diagnose disease or stress, predict yield, or synthesize missing observations. The production satellite route remains a partially connected bbox-based prototype with a fixed demonstration window, incomplete quality control, and no provenance-complete persistence. A separate research acquisition path was evaluated using exact polygons, local UTM metre grids, versioned Scene Classification Layer masking, separate NDVI/NDMI pixel accounting, and bounded Copernicus Data Space Ecosystem requests. A six-request pilot and a 12-month retrospective run over two developer-supplied padi-labeled polygons demonstrated provider access and exposed long cloud-related gaps, but the sample is not representative and the outputs are not accepted Matani measurements. Independent raster comparison, approved quality thresholds, representative multi-region sampling, user acceptance testing, and field validation remain necessary."
  22 = "Keywords - rice field monitoring, time series, NDVI, NDMI, Sentinel-2, remote sensing, weather context, decision support system, measurement provenance"
  27 = "This study presents Matani as a padi-only mobile decision support prototype for inspecting explicitly state-labeled satellite-index, weather, and field-note observations over time. The product displays dated raw NDVI/NDMI values when available and an explicit unavailable state otherwise. It does not classify crop health, diagnose disease or stress, predict yield, or synthesize missing observations. The paper-defined GROW workflow frames Gathering available inputs, Recognizing observable changes without causal interpretation, Offering educational context or optional descriptive summaries, and Warning through transparent weather-context indicators; thesis-target monitoring depends on the quality-gated measurement pipeline."
  28 = "The long-term goal of Matani is to support a more resilient rice-farming workflow by making field context and uncertainty easier to inspect. Any contribution to improved farm management, poverty reduction, or food security remains a future impact hypothesis; those outcomes were not evaluated in this study."
  38 = "However, many yield-prediction and anomaly-detection studies depend on historical outcomes, detailed ground truth, and extensive calibration datasets. Such data are unavailable for the present Matani evaluation. Machine-learning-based crop-health inference, anomaly attribution, growth-stage classification, and risk prediction are therefore outside the implemented and evaluated scope."
  42 = "Time-series inspection can add value because a single vegetation-index value does not describe temporal change. Matani's current detail surface reads dated legacy fixture/prototype NDVI and NDMI rows without generating replacement dates or values and without interpreting their direction as improvement, deterioration, or diagnosis. Provenance-safe measured history remains dependent on the target persistence pipeline."
  46 = "In the current Matani prototype, weather retrieval provides precipitation and humidity inputs to a client-side heuristic score, defined later in Section III.I. The score is a rule-based presentation-layer indicator, not a calibrated agronomic model. More complex indicators such as consecutive dry days, heatwave duration, or inundation risk remain future extensions unless they are implemented, versioned, and validated."
  52 = "Third, the operational integration of weather data, dated NDVI/NDMI observations, and field notes into a transparent mobile time series remains underdeveloped [5]. Many systems present weather separately, while remote-sensing studies often require expert interpretation. There is a need for interfaces that expose observation dates, missingness, and provenance limits without converting index values into crop-health diagnoses."
  53 = "Matani addresses this gap by combining dated NDVI and SWIR-derived NDMI observations, weather context, field notes, and optional descriptive AI summaries within a mobile time-series interface. Health classification, diagnosis, anomaly attribution, and prediction remain outside the evaluated implementation."
  56 = "This study employs a system-development and decision-support research approach to design Matani as a padi-only mobile application for rice-field time-series monitoring. The methodology distinguishes the current product prototype from the research acquisition path and the target measurement pipeline. Product, sampling, evaluation, and claims are all restricted to padi (rice). Matani displays dated raw NDVI/NDMI observations and explicit data states; it does not provide crop-health classes, diagnosis, exact yield prediction, or soil-fertility prediction. The client-side weather-context score remains author-defined and uncalibrated."
  61 = "The GROW workflow begins with Gathering user-defined padi-field boundaries and retrieving weather plus explicitly state-labeled satellite inputs. Recognizing organizes dated values and observable changes without assigning crop-health meaning or causal diagnosis. Offering presents educational content and optional descriptive summaries. Warning presents heuristic weather context only with visible limitations. The target workflow must persist quality-gated measurements or return an explicit unavailable outcome."
  63 = "Matani's production prototype, research acquisition path, and target design involve the user and provider inputs summarized in Table I. The table does not imply that current product satellite inputs are provenance-safe measurements or that production alert delivery has been implemented."
  76 = "10-20 m native band resolution; nominal revisit does not establish usable field-monitoring cadence under cloud cover"
  79 = "Weather context for an uncalibrated client-side indicator; production alert delivery is not implemented"
  100 = "Provider-returned interval NDVI/NDMI statistics with date and data state; not a persisted field measurement"
  104 = "Client-side uncalibrated heuristic score (0-100) and risk level"
  111 = "Users define agricultural fields by drawing polygon boundaries in WGS84. The database derives a geography-based field area, while a centroid is used only for location-based weather retrieval. The production satellite route constructs a bounding box around the field and must not be interpreted as polygon-exact measurement. The separate research path projects the exact polygon to its local UTM coordinate reference system and requests metre-based 10 m NDVI and 20 m NDMI/quality grids. These research responses remain provider-backed prototype observations because they are not persisted through the target provenance schema and do not pass an approved reliability threshold."
  114 = "The production backend uses CDSE Sentinel Hub endpoint defaults while retaining environment overrides. It queries Sentinel-2 Level-2A surface-reflectance data from a bbox with a fixed demonstration window. Bands B04, B08, and B11 represent red, near-infrared, and short-wave infrared information, respectively [23]. NDVI uses B04 and B08 at 10 m native resolution. The study's NDMI uses B08 and B11, with B11 at 20 m native resolution; a common grid therefore requires an explicit resampling choice and does not create new 10 m spatial detail in B11."
  124 = "The Statistical API can return interval statistics for a requested geometry and time window [25]. An HTTP response and an in-range value do not establish a valid Matani measurement. Measurement acceptance also requires the target geometry, quality, provenance, comparison, and persistence contract."
  125 = "The production request uses a predefined 1-5 September 2025 demonstration window, a bbox rather than the exact polygon, and no versioned Scene Classification Layer cloud/shadow rule. Failed or unavailable retrieval produces an explicit unavailable state; the application does not synthesize a replacement. The route still does not persist satellite results with complete measurement provenance. The research path uses exact polygons, bounded dynamic windows, versioned masking, per-index source/valid-pixel accounting, request accounting, and resumable checkpoints. That path is research instrumentation, not the production measurement writer."
  126 = "G. Time-Series Observation Semantics"
  127 = "NDVI is used generally as a vegetation-greenness indicator in rice remote-sensing literature [4], [6], [9]. Matani presents NDVI and NDMI as dated raw observations with explicit data-state semantics. It does not convert index ranges or temporal changes into crop-health classes, diagnoses, or treatment recommendations."
  130 = "Time-Series Data-State Semantics"
  154 = "Weather data are retrieved for the user's location or a selected field centroid through the backend's Open-Meteo route. Weather values provide temporal context for field observations. Provider failures are normalized into an unavailable response without exposing raw provider payloads."
  155 = "The prototype translates average forecast precipitation and a representative humidity value into a client-side heuristic indicator. These inputs and weights demonstrate interface behavior; they are not a calibrated model of rice damage, disease, or yield risk."
  156 = "I. Weather-Context Heuristic"
  162 = "This score is not adopted from an established agronomic risk model. It is an author-defined prototype indicator calculated in the mobile presentation layer and is not calibrated against local field observations. Its value is therefore shown as a heuristic score rather than a probability of crop loss."
  181 = "Evaluation separates software behavior from measurement validity so that a successful interface, test, or API response is never treated as proof of agronomic accuracy. During the 21 August 2026 audit, the root artifact suite passed 5/5 tests and the backend security/provider-contract suite passed 21/21 tests; root and backend type checks and the scoped zero-warning lint command also passed. Research tests remain fixture-first and require a Python 3 runtime. User acceptance testing and field validation have not been completed."
  182 = "1) Functional and Security Verification: Automated checks cover required artifact boundaries, protected provider routes, request limits, provider-contract behavior, and research request construction. These tests verify software behavior and do not convert fixtures or provider responses into field measurements."
  183 = "2) API and Research-Path Verification: Deterministic tests exercise response schema, band arithmetic, masking, retry behavior, exact-polygon requests, and accounting. Explicit live CDSE runs are bounded and reported separately from ordinary verification."
  184 = "3) Conceptual Plausibility: NDVI/NDMI behavior may be compared cautiously with rice phenology literature [4], [9]. Such comparison is contextual only and cannot replace independent raster comparison, field-level ground truth, or an approved measurement-quality threshold."
  185 = "4) User Acceptance Testing: A future qualitative evaluation must assess whether users understand dates, raw index values, data-state labels, unavailable outcomes, weather-context caveats, and optional descriptive summaries. It will evaluate usability and comprehension rather than agronomic accuracy."
  186 = "5) Measurement Limitations: The production route lacks polygon-exact statistics, versioned masking, per-index valid-pixel accounting, provenance-complete persistence, and measured history. The research path supplies several of these acquisition controls but still lacks representative multi-region sites, verified crop identity and consent, approved quality thresholds, source-product identity, independent raster comparison, and target-schema persistence. Consequently, the present evidence cannot establish agronomic accuracy or a usable monitoring cadence."
  187 = "Table V compares Matani with representative weather, satellite-visualization, crop-monitoring, farm-management, planting-calendar, and crop-diagnosis services [26], [27], [28], [29], [30], [31], [32], [33], [34], [35]."
  197 = "Padi-only NDVI/NDMI time-series monitoring prototype"
  201 = "Padi-only mobile DSS prototype for dated raw observations; not validated monitoring"
  257 = "Existing systems provide weather, satellite visualization, scouting, irrigation, farm management, planting calendars, and image-based diagnosis. Matani is positioned as a padi-only mobile DSS prototype that combines user-defined field boundaries, explicitly state-labeled and dated Sentinel-2 NDVI/NDMI inputs, weather context, field notes, and optional descriptive summaries. This positioning does not claim provenance-safe production measurements, validated monitoring, production alerts, crop-health classification, or agronomic diagnosis."
  260 = "Both product and thesis scope are restricted to padi. The production satellite route remains bbox-based, fixed-window, incompletely masked, and non-persistent; unavailable retrieval is shown without synthesizing values. The backend uses CDSE endpoint defaults, authentication guards, an origin allowlist, request bounds, rate limits, sanitized provider errors, and versioned Supabase migrations with owner-scoped row-level security. A separate exact-polygon research path completed bounded provider runs, but its two one-area, developer-supplied polygons do not support representative Indonesian cadence or agronomic validity. No field-level ground truth, approved reliability floor, independent raster comparison, completed UAT dataset, or production notification system exists."
  270 = "Fig. 2. Matani production prototype, research acquisition path, and target measurement boundary as audited on 21 August 2026."
  272 = "Matani has an Expo mobile presentation layer, an Express integration layer, Supabase persistence, external providers, and a separate research acquisition workspace. Satellite, weather, and Gemini requests cross the authenticated backend boundary; mapping, place search, and display-only media do not enter the measurement path."
  273 = "The padi-only mobile application provides account access, polygon drawing, dated prototype/fixture NDVI/NDMI time-series output, backend-mediated weather information, an uncalibrated client-side weather-context indicator, optional descriptive AI summaries, field notes, and explicit unavailable states. It does not classify crop health, diagnose field conditions, synthesize missing observations, deliver production alerts, or provide provenance-complete measured history."
  274 = "The Express backend proxies CDSE Sentinel Hub statistics, weather retrieval, and Gemini requests. Provider routes are protected by Supabase bearer-token verification, an origin allowlist, request bounds, and rate limiting. The production NDVI route still returns provider interval summaries for a bbox/fixed window and has no measurement writer. The weather-risk score remains client-side."
  275 = "Supabase stores identity, field polygons, notes, thumbnails, and related operational records through versioned migrations and owner-scoped row-level security. The production satellite path does not write provenance-complete observations. CDSE endpoint defaults are active, AccuWeather-to-Open-Meteo remains the as-built weather order, and Gemini remains optional presentation support. The separate research workspace performs exact-polygon acquisition and accounting without changing product measurement status."
}

$references = @(
  '[1] World Bank, "Agriculture, forestry, and fishing, value added (% of GDP) - Indonesia," World Bank Open Data, 2024. [Online]. Available: https://data.worldbank.org/indicator/NV.AGR.TOTL.ZS?locations=ID',
  '[2] World Bank, "Employment in agriculture (% of total employment) - Indonesia," World Bank Open Data, 2023. [Online]. Available: https://data.worldbank.org/indicator/SL.AGR.EMPL.ZS?locations=ID',
  '[3] BPS-Statistics Indonesia, "Paddy harvested area and production in Indonesia 2023 (preliminary figures)," Oct. 2023. [Online]. Available: https://www.bps.go.id/en/pressrelease/2023/10/16/2037/paddy-harvested-area-and-production-in-indonesia-2023--preliminary-figures-.html',
  '[4] R. Zhao, Y. Li, and M. Ma, "Mapping paddy rice with satellite remote sensing: A review," Sustainability, vol. 13, no. 2, Art. no. 503, 2021, doi: 10.3390/su13020503.',
  '[5] A. Mkhwenkwana, T. N. Matongera, C. Blaauw, and O. Mutanga, "A critical review on the applications of Sentinel satellite datasets for soil moisture assessment in crop production," Int. J. Appl. Earth Obs. Geoinf., vol. 141, Art. no. 104647, 2025, doi: 10.1016/j.jag.2025.104647.',
  '[6] C. Kuenzer and K. Knauer, "Remote sensing of rice crop areas," Int. J. Remote Sens., vol. 34, no. 6, pp. 2101-2139, 2013, doi: 10.1080/01431161.2012.738946.',
  '[7] S. Guan et al., "Assessing correlation of high-resolution NDVI with fertilizer application level and yield of rice and wheat crops using small UAVs," Remote Sens., vol. 11, no. 2, Art. no. 112, 2019, doi: 10.3390/rs11020112.',
  '[8] R. Jiang et al., "Assessing the operation parameters of a low-altitude UAV for the collection of NDVI values over a paddy rice field," Remote Sens., vol. 12, no. 11, Art. no. 1850, 2020, doi: 10.3390/rs12111850.',
  '[9] J. Huang, X. Wang, X. Li, H. Tian, and Z. Pan, "Remotely sensed rice yield prediction using multi-temporal NDVI data derived from NOAA''s AVHRR," PLoS ONE, vol. 8, no. 8, Art. no. e70816, 2013, doi: 10.1371/journal.pone.0070816.',
  '[10] J. Cao et al., "Integrating multi-source data for rice yield prediction across China using machine learning and deep learning approaches," Agric. Forest Meteorol., vol. 297, Art. no. 108275, 2021, doi: 10.1016/j.agrformet.2020.108275.',
  '[11] N. T. Son et al., "Machine learning approaches for rice crop yield predictions using time-series satellite data in Taiwan," Int. J. Remote Sens., vol. 41, no. 20, pp. 7868-7888, 2020, doi: 10.1080/01431161.2020.1766148.',
  '[12] S. Jeong, J. Ko, and J.-M. Yeom, "Predicting rice yield at pixel scale through synthetic use of crop and deep learning models with satellite data in South and North Korea," Sci. Total Environ., vol. 802, Art. no. 149726, 2022, doi: 10.1016/j.scitotenv.2021.149726.',
  '[13] N. T. Son et al., "Field-scale rice yield prediction from Sentinel-2 monthly image composites using machine learning algorithms," Ecol. Inform., vol. 69, Art. no. 101657, 2022, doi: 10.1016/j.ecoinf.2022.101657.',
  '[14] K. R. Thorp and D. Drajat, "Deep machine learning with Sentinel satellite data to map paddy rice production stages across West Java, Indonesia," Remote Sens. Environ., vol. 265, Art. no. 112679, 2021, doi: 10.1016/j.rse.2021.112679.',
  '[15] J.-H. Ryu, H. Jeong, and J. Cho, "Performances of vegetation indices on paddy rice at elevated air temperature, heat stress, and herbicide damage," Remote Sens., vol. 12, no. 16, Art. no. 2654, 2020, doi: 10.3390/rs12162654.',
  '[16] J.-H. Ryu, D. Oh, J. Ko, H. Y. Kim, J.-M. Yeom, and J. Cho, "Remote sensing-based evaluation of heat stress damage on paddy rice using NDVI and PRI measured at leaf and canopy scales," Agronomy, vol. 12, no. 8, Art. no. 1972, 2022, doi: 10.3390/agronomy12081972.',
  '[17] H. Chen and S. Wang, "Compound dry and wet extremes lead to an increased risk of rice yield loss," Geophys. Res. Lett., vol. 50, no. 24, Art. no. e2023GL105817, 2023, doi: 10.1029/2023GL105817.',
  '[18] J. Chou, W. Zhao, J. Li, Y. Xu, F. Yang, M. Sun, and Y. Li, "Changes in extreme climate events in rice-growing regions under different warming scenarios in China," Front. Earth Sci., vol. 9, Art. no. 655128, 2021, doi: 10.3389/feart.2021.655128.',
  '[19] M. Jiang, Z. Huo, L. Zhang, F. Zhang, M. Li, Q. Mi, and R. Kong, "Dynamic evaluation and risk projection of heat exposure based on disaster events for single-season rice along the middle and lower reaches of the Yangtze River, China," Agronomy, vol. 14, no. 8, Art. no. 1737, 2024, doi: 10.3390/agronomy14081737.',
  '[20] T. Miller, G. Mikiciuk, I. Durlik, M. Mikiciuk, A. Lobodzinska, and M. Snieg, "The IoT and AI in agriculture: The time is now - A systematic review of smart sensing technologies," Sensors, vol. 25, no. 12, Art. no. 3583, 2025, doi: 10.3390/s25123583.',
  '[21] G. Cucho-Padin, H. Loayza, S. Palacios, M. Balcazar, M. Carbajal, and R. Quiroz, "Development of low-cost remote sensing tools and methods for supporting smallholder agriculture," Appl. Geomat., vol. 12, pp. 247-263, 2020, doi: 10.1007/s12518-019-00292-5.',
  '[22] Z. Zhai, J. F. Martinez, V. Beltran, and N. L. Martinez, "Decision support systems for agriculture 4.0: Survey and challenges," Comput. Electron. Agric., vol. 170, Art. no. 105256, 2020, doi: 10.1016/j.compag.2020.105256.',
  '[23] USDA National Institute of Food and Agriculture, "Decision Support Systems (DSS)." [Online]. Available: https://www.nifa.usda.gov/grants/programs/precision-geospatial-sensor-technologies-programs/decision-support-systems-dss. [Accessed: Jun. 8, 2026].',
  '[24] F. Gutierrez, N. N. Htun, F. Schlenz, A. Kasimati, and K. Verbert, "A review of visualisations in agricultural decision support systems: An HCI perspective," Comput. Electron. Agric., vol. 163, Art. no. 104844, 2019, doi: 10.1016/j.compag.2019.05.053.',
  '[25] D. C. Rose et al., "Decision support tools for agriculture: Towards effective design and delivery," Agric. Syst., vol. 149, pp. 165-174, 2016, doi: 10.1016/j.agsy.2016.09.009.',
  '[26] Sentinel Hub, "Sentinel-2 L2A data documentation," Sentinel Hub Documentation. [Online]. Available: https://docs.sentinel-hub.com/api/latest/data/sentinel-2-l2a/',
  '[27] B.-C. Gao, "NDWI: A normalized difference water index for remote sensing of vegetation liquid water from space," Remote Sens. Environ., vol. 58, no. 3, pp. 257-266, 1996, doi: 10.1016/S0034-4257(96)00067-3.',
  '[28] Sentinel Hub, "Statistical API documentation," Sentinel Hub Documentation. [Online]. Available: https://docs.sentinel-hub.com/api/latest/api/statistical/',
  '[29] Open-Meteo, "Free weather API," Open-Meteo. [Online]. Available: https://open-meteo.com/. [Accessed: Jun. 8, 2026].',
  '[30] Sentinel Hub, "EO Browser," Sentinel Hub. [Online]. Available: https://www.sentinel-hub.com/explore/eobrowser/. [Accessed: Jun. 8, 2026].',
  '[31] Sentinel Hub, "How do I view NDVI?," Sentinel Hub. [Online]. Available: https://www.sentinel-hub.com/faq/how-do-i-view-ndvi/. [Accessed: Jun. 8, 2026].',
  '[32] OneSoil, "What is OneSoil?," OneSoil Help Center. [Online]. Available: https://help.onesoil.ai/en/articles/5237693-what-is-onesoil. [Accessed: Jun. 8, 2026].',
  '[33] EOS Data Analytics, "Crop monitoring software for remote farm analytics," EOSDA Crop Monitoring. [Online]. Available: https://eos.com/products/crop-monitoring/. [Accessed: Jun. 8, 2026].',
  '[34] CropX, "CropX agronomic farm management system," CropX. [Online]. Available: https://cropx.com/. [Accessed: Jun. 8, 2026].',
  '[35] Climate FieldView, "Field-level data to analyze every acre, seed and practice," Climate FieldView. [Online]. Available: https://climate.com/en-us/solutions/analyze-data.html. [Accessed: Jun. 8, 2026].',
  '[36] SIPINDO, "Download aplikasi pertanian terlengkap," SIPINDO. [Online]. Available: https://sipindo.id/. [Accessed: Jun. 8, 2026].',
  '[37] Balai Besar Perakitan dan Modernisasi Pertanian Bali, "KATAM Terpadu-SC," BRMP Bali. [Online]. Available: https://bali.brmp.pertanian.go.id/layanan/layanan-lainnya/katam-terpadu-sc. [Accessed: Jun. 8, 2026].',
  '[38] Plantix, "Plantix: Free app for crop diagnosis and treatments," Plantix. [Online]. Available: https://plantix.net/en/. [Accessed: Jun. 8, 2026].'
)

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
  $documentPart = $package.GetPart($documentUri)
  $reader = [System.IO.StreamReader]::new($documentPart.GetStream())
  try {
    [xml]$documentXml = $reader.ReadToEnd()
  }
  finally {
    $reader.Dispose()
  }

  $namespaces = [System.Xml.XmlNamespaceManager]::new($documentXml.NameTable)
  $namespaces.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")
  $paragraphs = $documentXml.SelectNodes("//w:p", $namespaces)

  $anchors = @{
    1 = "Climate Risk Classification"
    21 = "Abstract -"
    46 = "defined later in Section I"
    56 = "five crop categories"
    111 = "bounding box"
    181 = "no automated test suite"
    260 = "Backend endpoints remain unauthenticated"
    275 = "commercial host"
  }

  foreach ($entry in $anchors.GetEnumerator()) {
    $current = Get-ParagraphText $paragraphs[[int]$entry.Key] $namespaces
    if (-not $current.Contains([string]$entry.Value)) {
      throw "Paragraph $($entry.Key) did not contain expected anchor '$($entry.Value)'. Found: $current"
    }
  }

  foreach ($entry in $replacementByIndex.GetEnumerator()) {
    Set-ParagraphText $paragraphs[[int]$entry.Key] ([string]$entry.Value) $namespaces
  }

  $tables = $documentXml.SelectNodes("//w:tbl", $namespaces)
  if ($tables.Count -lt 7) {
    throw "Expected at least seven thesis tables; found $($tables.Count)."
  }

  $tableUpdates = @(
    @{ Table = 1; Row = 1; Cell = 1; Text = "Field polygon, padi metadata, field notes" },
    @{ Table = 1; Row = 4; Cell = 2; Text = "Optional descriptive summary of supplied values, dates, coverage, and data state" },
    @{ Table = 2; Row = 2; Cell = 3; Text = "Dated raw NDVI/NDMI statistics and explicit data state; not a persisted field measurement" },
    @{ Table = 2; Row = 4; Cell = 0; Text = "Descriptive Summary" },
    @{ Table = 2; Row = 4; Cell = 1; Text = "Dates, raw index values, data states, coverage, and field notes" },
    @{ Table = 2; Row = 4; Cell = 2; Text = "Predefined educational content plus optional constrained AI summarization" },
    @{ Table = 2; Row = 4; Cell = 3; Text = "Descriptive context only; never measurement, ground truth, diagnosis, or treatment advice" },
    @{ Table = 3; Row = 0; Cell = 0; Text = "Data State" },
    @{ Table = 3; Row = 0; Cell = 1; Text = "Required Meaning" },
    @{ Table = 3; Row = 0; Cell = 2; Text = "Time-Series Display" },
    @{ Table = 3; Row = 0; Cell = 3; Text = "Allowed Claim" },
    @{ Table = 3; Row = 1; Cell = 0; Text = "Measured" },
    @{ Table = 3; Row = 1; Cell = 1; Text = "Persisted with complete acquisition, geometry, quality, processing, and provider provenance" },
    @{ Table = 3; Row = 1; Cell = 2; Text = "Dated raw NDVI/NDMI plus quality state" },
    @{ Table = 3; Row = 1; Cell = 3; Text = "Not present in the current production app" },
    @{ Table = 3; Row = 2; Cell = 0; Text = "Prototype" },
    @{ Table = 3; Row = 2; Cell = 1; Text = "Partially connected provider output without the complete measurement contract" },
    @{ Table = 3; Row = 2; Cell = 2; Text = "Dated raw values with prototype label" },
    @{ Table = 3; Row = 2; Cell = 3; Text = "Engineering observation only" },
    @{ Table = 3; Row = 3; Cell = 0; Text = "Fixture" },
    @{ Table = 3; Row = 3; Cell = 1; Text = "Known test or legacy demonstration data" },
    @{ Table = 3; Row = 3; Cell = 2; Text = "Dated raw values with fixture label" },
    @{ Table = 3; Row = 3; Cell = 3; Text = "Never a field measurement" },
    @{ Table = 3; Row = 4; Cell = 0; Text = "Unavailable" },
    @{ Table = 3; Row = 4; Cell = 1; Text = "No acceptable observation is available" },
    @{ Table = 3; Row = 4; Cell = 2; Text = "No index value is shown" },
    @{ Table = 3; Row = 4; Cell = 3; Text = "Absence stated honestly; no substitution" },
    @{ Table = 5; Row = 1; Cell = 1; Text = "Padi-only NDVI/NDMI time-series monitoring prototype" },
    @{ Table = 5; Row = 1; Cell = 4; Text = "Field notes, education, and optional descriptive summaries" },
    @{ Table = 5; Row = 1; Cell = 5; Text = "Dated raw observations with explicit state; no crop-health diagnosis" },
    @{ Table = 6; Row = 1; Cell = 1; Text = "Title now states padi-field time-series monitoring because the application presents dated observations and does not classify crop health." },
    @{ Table = 6; Row = 6; Cell = 1; Text = "Unsupported machine-learning and rule-based health-classification claims were removed. The implemented approach is observation-first time-series display with optional descriptive AI summaries; trained ML remains outside scope." }
  )

  foreach ($update in $tableUpdates) {
    $rows = $tables[[int]$update.Table].SelectNodes("./w:tr", $namespaces)
    $cells = $rows[[int]$update.Row].SelectNodes("./w:tc", $namespaces)
    Set-TableCellText $cells[[int]$update.Cell] ([string]$update.Text) $namespaces
  }

  # Re-number references by first appearance without allowing replacement collisions.
  $citationMap = [ordered]@{
    "36" = 22; "40" = 23; "37" = 24; "38" = 25; "23" = 26; "24" = 27; "25" = 28
    "26" = 29; "27" = 30; "28" = 31; "29" = 32; "30" = 33; "31" = 34; "32" = 35
    "33" = 36; "34" = 37; "35" = 38
  }
  foreach ($textNode in $documentXml.SelectNodes("//w:t", $namespaces)) {
    foreach ($oldNumber in $citationMap.Keys) {
      $textNode.InnerText = $textNode.InnerText.Replace("[$oldNumber]", "{CITE_$oldNumber}")
    }
    foreach ($oldNumber in $citationMap.Keys) {
      $textNode.InnerText = $textNode.InnerText.Replace("{CITE_$oldNumber}", "[$($citationMap[$oldNumber])]")
    }
  }

  # Add research questions immediately before Methodology.
  $methodology = Find-Paragraph $documentXml $namespaces "III. METHODOLOGY"
  $bodyTemplate = $paragraphs[56]
  $questionParagraphs = @(
    "The measurement evaluation is guided by three research questions:",
    "RQ1: Under representative Indonesian padi-field and seasonal conditions, how often does the quality-controlled Sentinel-2 pipeline yield a usable NDVI/NDMI observation?",
    "RQ2: How closely do pipeline-derived polygon statistics agree with independently derived raster zonal statistics for the same polygon, source product, acquisition time, bands, mask, and grid policy?",
    "RQ3: How do field geometry, size, and valid-pixel count affect reliability, variance, and the rate of unavailable observations?"
  )
  foreach ($text in $questionParagraphs) {
    [void]$methodology.ParentNode.InsertBefore((New-ParagraphClone $bodyTemplate $text $namespaces), $methodology)
  }

  # Extend the system mapping table with the separate research acquisition path.
  $vegetationParagraph = Find-Paragraph $documentXml $namespaces "Vegetation Analysis"
  $vegetationRow = $vegetationParagraph.SelectSingleNode("ancestor::w:tr[1]", $namespaces)
  $researchRow = $vegetationRow.CloneNode($true)
  $researchCells = $researchRow.SelectNodes("./w:tc", $namespaces)
  if ($researchCells.Count -ne 4) {
    throw "Expected four cells in the system mapping table."
  }
  $researchValues = @(
    "Research Acquisition Path",
    "Exact WGS84 padi polygon and bounded time window",
    "Local UTM metre grids; 10 m NDVI, 20 m NDMI/quality; versioned SCL mask; per-index accounting",
    "Provider-backed prototype observations, request/PU accounting, and checkpoints; not persisted Matani measurements"
  )
  for ($cellIndex = 0; $cellIndex -lt 4; $cellIndex++) {
    Set-TableCellText $researchCells[$cellIndex] $researchValues[$cellIndex] $namespaces
  }
  [void]$vegetationRow.ParentNode.InsertAfter($researchRow, $vegetationRow)

  # Remove the obsolete appendix and everything after it except the section properties.
  $appendix = Find-Paragraph $documentXml $namespaces "APPENDIX: MAIN CORRECTIONS APPLIED"
  $body = $appendix.ParentNode
  $cursor = $appendix
  while ($null -ne $cursor) {
    $next = $cursor.NextSibling
    if ($cursor.LocalName -ne "sectPr") {
      [void]$body.RemoveChild($cursor)
    }
    $cursor = $next
  }

  # Replace the legacy bibliography with a sequential, cited-only bibliography.
  $referencesHeading = Find-Paragraph $documentXml $namespaces "REFERENCES"
  $referenceTemplate = (Find-Paragraph $documentXml $namespaces '[1] World Bank, "Agriculture, forestry, and fishing, value added (% of GDP) - Indonesia," World Bank Open Data, 2024. [Online]. Available: https://data.worldbank.org/indicator/NV.AGR.TOTL.ZS?locations=ID').CloneNode($true)
  $oldReferenceParagraphs = @($documentXml.SelectNodes("//w:p[starts-with(normalize-space(string(.)), '[')]", $namespaces))
  foreach ($oldReference in $oldReferenceParagraphs) {
    $text = Get-ParagraphText $oldReference $namespaces
    if ($text -match '^\[\d+\]') {
      [void]$oldReference.ParentNode.RemoveChild($oldReference)
    }
  }

  # Add preliminary evidence, discussion, and conclusion before References.
  $majorHeadingTemplate = (Find-Paragraph $documentXml $namespaces "III. METHODOLOGY").CloneNode($true)
  $subHeadingTemplate = (Find-Paragraph $documentXml $namespaces "A. Research Design").CloneNode($true)
  $resultSections = @(
    @{ Style = "major"; Text = "IV. PRELIMINARY RESULTS" },
    @{ Style = "sub"; Text = "A. Engineering Verification" },
    @{ Style = "body"; Text = "The 21 August 2026 local audit passed the root artifact suite (5/5), backend security/provider-contract suite (21/21), root TypeScript check, backend TypeScript check, and scoped zero-warning lint command. The scope tests verify padi-only persistence, removal of synthetic time-series generation and health-classification logic, and provider-route failure contracts. These results verify repository behavior at the audited commit; they do not establish measurement accuracy. The Python research suite could not be re-run on the audit workstation because no Python 3 runtime was installed, so its earlier fixture result was not counted as current re-verification." },
    @{ Style = "sub"; Text = "B. Bounded Live Pilot" },
    @{ Style = "body"; Text = "A bounded CDSE pilot used two private, developer-supplied padi-labeled polygons over 1-16 June 2026. Six requests consumed approximately 0.28 processing units. The 0.11093 ha polygon yielded 15 NDVI-source pixels and 2 NDMI-source pixels per acquisition; the 3.89709 ha polygon yielded 436 and 115, respectively. Each polygon had two intervals with nonzero valid pixels and one fully masked interval. These are provider responses, but crop identity, boundary fidelity, consent, representativeness, source-product identity, independent raster comparison, and target-schema persistence remain unverified." },
    @{ Style = "sub"; Text = "C. Twelve-Month Retrospective" },
    @{ Style = "body"; Text = "The retrospective run completed 24/24 field-months from 1 July 2025 to 1 July 2026 using 72 successful requests and approximately 8.027 processing units. Each polygon returned 86 acquisition intervals across 12/12 months. Both NDVI and NDMI had nonzero valid pixels on 25/86 intervals for the smaller polygon and 28/86 for the larger polygon. The descriptive median nonzero-observation gap was 7 days for both, while the longest gaps were 113 and 133 days. An HTTP 429 interruption after eight field-months was resumed from checkpoints with bounded retry. These descriptive results do not license a weekly, biweekly, monthly, or nationally representative cadence claim." },
    @{ Style = "major"; Text = "V. DISCUSSION" },
    @{ Style = "sub"; Text = "A. Preliminary Answer to RQ1" },
    @{ Style = "body"; Text = "The two-polygon run shows that usable index observations can be sparse and interrupted under the tested conditions. It does not answer RQ1 for representative Indonesian rice fields because both polygons came from one area, seasonal labels were not approved, and no reliability floor was accepted in advance." },
    @{ Style = "sub"; Text = "B. Status of RQ2" },
    @{ Style = "body"; Text = "RQ2 remains unanswered. The research path has no independent raster-derived zonal-statistics comparison tied to the same source product, acquisition, geometry, mask, and grid policy. Provider agreement with itself is not an accuracy assessment." },
    @{ Style = "sub"; Text = "C. Preliminary Context for RQ3" },
    @{ Style = "body"; Text = "The smaller polygon produced substantially fewer source pixels than the larger polygon, illustrating why field size and geometry must be analyzed. Two cases cannot establish a universal minimum area, valid-pixel threshold, or variance relationship; those decisions require the planned stratified sample and preregistered analysis." },
    @{ Style = "sub"; Text = "D. Product Implication" },
    @{ Style = "body"; Text = "The live research path improves feasibility evidence but does not change the production app's data status. Matani remains a prototype until polygon-exact, quality-gated observations are persisted with complete provenance and explicit passed, rejected, or unavailable outcomes." },
    @{ Style = "major"; Text = "VI. CONCLUSION AND REMAINING WORK" },
    @{ Style = "body"; Text = "Matani demonstrates a padi-only mobile DSS concept for inspecting dated field observations while keeping fixture, prototype, measured, and unavailable semantics explicit. The current application does not synthesize missing values, classify crop health, diagnose field conditions, or predict yield. The bounded CDSE work establishes technical feasibility for two polygons and identifies grid, masking, retry, and small-field pixel-accounting issues. It does not establish agronomic accuracy, representative monitoring cadence, measurement agreement, or production readiness. Completion requires advisor-approved sites and quality thresholds, multi-region wet/dry-season acquisition, independent raster comparison, provenance-complete persistence, field validation, and user acceptance testing." }
  )

  foreach ($section in $resultSections) {
    $template = switch ($section.Style) {
      "major" { $majorHeadingTemplate }
      "sub" { $subHeadingTemplate }
      default { $bodyTemplate }
    }
    [void]$referencesHeading.ParentNode.InsertBefore((New-ParagraphClone $template $section.Text $namespaces), $referencesHeading)
  }

  $lastReferenceNode = $referencesHeading
  foreach ($reference in $references) {
    $newReference = New-ParagraphClone $referenceTemplate $reference $namespaces
    $lastReferenceNode = $referencesHeading.ParentNode.InsertAfter($newReference, $lastReferenceNode)
  }

  # Replace Figure 2 with the current end-to-end boundary diagram.
  $imageUri = [System.IO.Packaging.PackUriHelper]::CreatePartUri(
    [System.Uri]::new("/word/media/image2.png", [System.UriKind]::Relative)
  )
  if ($package.PartExists($imageUri)) {
    $imagePart = $package.GetPart($imageUri)
    $imageBytes = [System.IO.File]::ReadAllBytes($resolvedImage)
    $imageStream = $imagePart.GetStream([System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
    try {
      $imageStream.Write($imageBytes, 0, $imageBytes.Length)
    }
    finally {
      $imageStream.Dispose()
    }
  }

  # Normalize any duplicated styled runs that retained legacy wording.
  $legacyTextMap = [ordered]@{
    "defined later in Section I." = "defined later in Section III.I."
    "HYP-04" = "retired NDVI severity thresholds"
    "HYP-07" = "author-defined weather heuristic"
    "author-defined prototype author-defined" = "author-defined prototype"
  }
  foreach ($textNode in $documentXml.SelectNodes("//w:t", $namespaces)) {
    foreach ($legacyText in $legacyTextMap.Keys) {
      $textNode.InnerText = $textNode.InnerText.Replace($legacyText, $legacyTextMap[$legacyText])
    }
  }

  $allText = (($documentXml.SelectNodes("//w:t", $namespaces) | ForEach-Object { $_.InnerText }) -join " ")
  foreach ($forbidden in @(
    "defined later in Section I.",
    "commercial host",
    "Backend endpoints remain unauthenticated",
    "five crop categories",
    "rule-based classification",
    "Prototype NDVI Interpretation Ranges",
    "synthetic list/detail values",
    "author-defined prototype author-defined",
    "APPENDIX: MAIN CORRECTIONS APPLIED"
  )) {
    if ($allText.Contains($forbidden)) {
      throw "Forbidden stale wording remains: $forbidden"
    }
  }
  if ($allText -match '\b(?:HYP-\d+|M[0-4])\b') {
    throw "Internal roadmap or hypothesis identifier remains in the public thesis: $($Matches[0])"
  }

  $bodyBeforeReferences = ""
  foreach ($node in $referencesHeading.ParentNode.ChildNodes) {
    if ($node -eq $referencesHeading) { break }
    $bodyBeforeReferences += " " + (($node.SelectNodes(".//w:t", $namespaces) | ForEach-Object { $_.InnerText }) -join "")
  }
  $seen = [System.Collections.Generic.List[int]]::new()
  foreach ($match in [regex]::Matches($bodyBeforeReferences, '\[(\d+)\]')) {
    $number = [int]$match.Groups[1].Value
    if (-not $seen.Contains($number)) { $seen.Add($number) }
  }
  $expected = (1..38) -join ","
  $actual = $seen -join ","
  if ($actual -ne $expected) {
    $growText = ($documentXml.SelectNodes("//w:p", $namespaces) | ForEach-Object { Get-ParagraphText $_ $namespaces } | Where-Object { $_ -like "In this study, GROW is defined*" }) -join " | "
    throw "References are not in first-appearance order. Expected $expected; found $actual. GROW paragraph: $growText"
  }

  $writer = [System.IO.StreamWriter]::new(
    $documentPart.GetStream([System.IO.FileMode]::Create, [System.IO.FileAccess]::Write),
    [System.Text.UTF8Encoding]::new($false)
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

Write-Output "Created audited thesis candidate: $resolvedOutput"
