param(
  [string]$InputPath = ".agent\thesis-aligned-2026-08-21.docx",
  [string]$OutputPath = ".agent\thesis-aligned-2026-08-31.docx",
  [string]$ArchitectureImagePath = "docs\diagrams\matani-audited-system-boundary-2026-08-31.png"
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

  foreach ($extra in @($Cell.SelectNodes("./w:p[position() > 1]", $Namespaces))) {
    [void]$Cell.RemoveChild($extra)
  }
}

function Set-ComparisonTable {
  param(
    [System.Xml.XmlNode]$Table,
    [System.Xml.XmlNamespaceManager]$Namespaces
  )

  # Keep the comparison readable in the two-column IEEE layout.  The old
  # six-column table mixed product focus, providers, weather, advisory, and
  # interpretation into one very wide object.  These three columns preserve
  # the defensible comparison without implying that Matani owns capabilities
  # (such as validated risk classification) that are out of scope.
  $rows = @(
    @("System / Application", "Focus", "Difference from Matani"),
    @("Matani", "Padi-only mobile DSS for dated Sentinel-2 NDVI/NDMI field observations, weather context, and notes", "Observation-first and provenance-labeled; no diagnosis or prescription; measurement path verified locally, hosted history unverified"),
    @("OneSoil", "Multi-crop satellite monitoring, scouting, weather, and precision-agriculture workflows", "Broader operational platform; Matani is narrower, padi-only, and exposes explicit observation/data-state semantics"),
    @("EOSDA Crop Monitoring", "Multi-crop remote sensing, vegetation/moisture indices, weather, alerts, and analytics", "Broader commercial analytics platform; Matani focuses on a small, mobile, padi-field observation workflow"),
    @("SIPINDO / SMARTseeds", "Indonesian agricultural information, advisory, marketplace, and geodata services", "Broader advisory and service ecosystem; Matani focuses on dated per-field NDVI/NDMI inspection"),
    @("KATAM Terpadu-SC", "Indonesian planting-calendar, climate, standing-crop, variety, and fertilizer guidance", "Regional planning and recommendations; Matani focuses on user-defined field time series rather than seasonal planning"),
    @("Plantix", "Photo-based pest and disease diagnosis with treatment guidance", "Different problem and interaction; Matani deliberately does not diagnose or prescribe"),
    @("CropX", "Sensor-connected farm management, soil, irrigation, and agronomic recommendations", "Operational/sensor management scope; Matani is an observation interface without irrigation or input prescriptions"),
    @("Climate FieldView", "Farm data management, imagery, and seed/fertility prescription workflows", "Precision-operation and prescription scope; Matani does not generate prescription maps"),
    @("Sentinel Hub EO Browser", "Satellite imagery and index visualization for analysis", "Adjacent technical tool/provider, not a farmer DSS; Matani packages selected observations into a padi-only mobile workflow"),
    @("Open-Meteo", "Weather data API", "Infrastructure provider, not a direct competitor; Matani consumes weather as context alongside field observations")
  )

  $tableRows = @($Table.SelectNodes("./w:tr", $Namespaces))
  if ($tableRows.Count -ne $rows.Count) {
    throw "Comparison table row count changed: expected $($rows.Count), found $($tableRows.Count)."
  }

  for ($rowIndex = 0; $rowIndex -lt $rows.Count; $rowIndex++) {
    $row = $tableRows[$rowIndex]
    $cells = @($row.SelectNodes("./w:tc", $Namespaces))
    if ($cells.Count -lt 3) {
      throw "Comparison table row $rowIndex has fewer than three cells."
    }

    for ($cellIndex = $cells.Count - 1; $cellIndex -ge 3; $cellIndex--) {
      [void]$row.RemoveChild($cells[$cellIndex])
    }

    $cells = @($row.SelectNodes("./w:tc", $Namespaces))
    for ($cellIndex = 0; $cellIndex -lt 3; $cellIndex++) {
      Set-TableCellText $cells[$cellIndex] $rows[$rowIndex][$cellIndex] $Namespaces
    }
  }

  $grid = $Table.SelectSingleNode("./w:tblGrid", $Namespaces)
  if ($null -ne $grid) {
    $gridColumns = @($grid.SelectNodes("./w:gridCol", $Namespaces))
    for ($columnIndex = $gridColumns.Count - 1; $columnIndex -ge 3; $columnIndex--) {
      [void]$grid.RemoveChild($gridColumns[$columnIndex])
    }
    $remaining = @($grid.SelectNodes("./w:gridCol", $Namespaces))
    foreach ($column in $remaining) {
      $column.SetAttribute("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "3389")
    }
  }
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
  $bodyParagraphs = $documentXml.SelectNodes("//w:body/w:p", $namespaces)

  $anchors = @{
    3 = "production satellite route remains"
    37 = "representative Indonesian"
    38 = "independently derived raster"
    57 = "production satellite route constructs"
    95 = "21 August 2026"
    108 = "two one-area"
    118 = "21 August 2026"
    128 = "two private"
    130 = "24/24 field-months"
    141 = "two polygons"
  }

  foreach ($entry in $anchors.GetEnumerator()) {
    $current = Get-ParagraphText $bodyParagraphs[[int]$entry.Key] $namespaces
    if (-not $current.Contains([string]$entry.Value)) {
      throw "Paragraph $($entry.Key) did not contain expected anchor '$($entry.Value)'. Found: $current"
    }
  }

  $replacementByIndex = @{
    3 = "Abstract - Rice agriculture in Indonesia faces climate variability and limited access to timely field information. This paper presents Matani, a padi-only mobile decision support application for inspecting dated Sentinel-2 Normalized Difference Vegetation Index (NDVI), short-wave-infrared-derived Normalized Difference Moisture Index (NDMI), weather context, and field notes over time. Matani presents raw observations and explicit fixture, prototype, measured, or unavailable states; it does not classify crop health, diagnose disease or stress, predict yield, or synthesize missing observations. The advisor-approved retrospective study covered one verified 0.157-ha padi field in Teluknaga, Banten, from 1 July 2025 to 1 July 2026. Of 86 intersecting acquisitions, 32 met the provisional floors of at least nine valid NDVI pixels and three valid NDMI pixels, while 54 were rejected. The dry-labelled period had 30 passing acquisitions out of 60 and at least one passing observation in every dry month, supporting a monthly dry-season cadence for this site. The wet-labelled period had two passing acquisitions out of 26, with none in December through February, so no wet-season cadence is defensible. These findings are site-specific and do not establish national cadence or agronomic accuracy. The repository also contains a locally verified exact-polygon measurement path with native 10 m NDVI and 20 m NDMI processing, matched source provenance, quality decisions, typed persistence, and mobile read/retry behavior. The public backend health endpoint is reachable, but hosted database migration, server-only worker configuration, authenticated device persistence, user acceptance testing, and field validation remain unverified."
    36 = "The measurement evaluation is guided by two active research questions; an independent raster-comparison question is retained only as optional future work:"
    37 = "RQ1: Within the approved padi study field in Teluknaga, Banten, what proportion of Sentinel-2 acquisitions produces quality-passing polygon-level NDVI and NDMI observations, and what monitoring cadence is defensible during the locally labelled wet and dry seasons?"
    38 = "Optional future work: How closely do pipeline-derived polygon statistics agree with independently derived raster zonal statistics for the same polygon, source product, acquisition time, bands, mask, and grid policy? This comparison is not an active thesis acceptance requirement."
    39 = "RQ3: For the approved Teluknaga padi field, how many valid NDVI and NDMI pixels are available per acquisition under the provisional quality floors, and what measurement limitations arise from the field's size and Sentinel-2 spatial resolution?"
    42 = "This study employs a system-development and decision-support research approach to design Matani as a padi-only mobile application for rice-field time-series monitoring. The active measurement evaluation is a one-field, one-site retrospective case study over the advisor-approved Teluknaga padi boundary and its locally labelled wet and dry seasons. The application and research remain observation-first: Matani displays dated raw NDVI/NDMI values and explicit data states, but does not provide crop-health classes, diagnosis, exact yield prediction, or soil-fertility prediction. The provisional valid-pixel floors classify observations for this study only, while the client-side weather-context score remains author-defined and uncalibrated."
    44 = "The development of Matani follows the paper-defined GROW workflow: (1) Gathering field boundaries, available satellite observations, weather, and field notes; (2) Recognizing dated values, quality states, and observable changes without causal or health interpretation; (3) Offering educational context and optional descriptive summaries; and (4) Warning through a transparent, uncalibrated weather-context indicator. Fig. 1 illustrates this workflow."
    47 = "The GROW workflow begins with Gathering user-defined padi-field boundaries and retrieving weather plus explicitly state-labeled satellite inputs. Recognizing organizes dated values and observable changes without assigning crop-health meaning or causal diagnosis. Offering presents educational content and optional descriptive summaries. Warning presents heuristic weather context only with visible limitations. The exact-polygon measurement path is implemented and verified locally; its hosted database, worker configuration, and authenticated device delivery remain deployment gates."
    49 = "Matani's locally implemented application path and the approved research evaluation use the inputs summarized in Table I. The table does not imply that a provider response is automatically a measured observation or that production alert delivery has been implemented."
    57 = "Users define padi fields by drawing polygon boundaries in WGS84. The database derives a geography-based field area, while a centroid is used only for location-based weather retrieval. The current measurement implementation validates and hashes the stored exact polygon, projects it to a local UTM coordinate reference system, and processes native 10 m NDVI and 20 m NDMI grids without substituting a bounding box as the measurement geometry. Saving a valid field creates or reuses a durable measurement job; screen rendering does not trigger satellite acquisition. This behavior is locally verified, while hosted persistence and authenticated device delivery remain unverified."
    60 = "The current measurement worker discovers one intersecting Sentinel-2 Level-2A acquisition and requests two exact-polygon Process responses so the native output grids are preserved: NDVI at 10 m from B04 and B08, and NDMI at 20 m from B08 and B11. Each raster response carries source metadata, and persistence is rejected unless both responses identify the same acquisition. A common display or analysis grid must not be described as creating new 10 m spatial detail in B11 [26]."
    70 = "A provider API can return statistics or rasters for a requested geometry and time window [28]. An HTTP response and an in-range value do not establish a valid Matani measurement. Acceptance requires exact geometry, versioned quality processing, complete and matching source identity, per-index valid-pixel accounting, an explicit passed, rejected, or unavailable decision, and typed persistence."
    71 = "The locally implemented measurement path uses a caller-supplied window bounded to 31 days, exact-polygon processing, versioned Scene Classification Layer masking, native-grid per-index accounting, source-identity matching, durable jobs, and provenance-complete persistence. Failed or unacceptable retrieval becomes rejected or unavailable and is never replaced with a synthetic value. The older bbox/fixed-window route remains compatibility code and is not read by the current measurement surfaces. Hosted database application, server-only worker configuration, and authenticated device persistence still require verification."
    78 = "The provisional floors of at least nine valid NDVI pixels and three valid NDMI pixels are used only to adjudicate observations in the approved Teluknaga study. They are not universal minimum-area rules and do not convert NDVI or NDMI values into crop-health classes. Matani presents passing values with their acquisition date, quality state, and separate per-index pixel counts; rejected or unavailable outcomes remain explicit."
    95 = "Evaluation separates software behavior from measurement validity so that a successful interface, test, or API response is never treated as proof of agronomic accuracy. On 30 August 2026, an empty local database migration and 26 database assertions passed together with the Python research fixture suite. On 31 August 2026, scoped lint, root and backend type checks, nine root tests, and 36 backend tests passed again. The public backend health endpoint returned JSON with HTTP 200, and a protected weather request without a token failed closed with HTTP 401. The Python research suite could not be rerun on the 31 August workstation because Python 3 was unavailable. User acceptance testing and field validation have not been completed."
    98 = "3) Conceptual Plausibility: NDVI/NDMI behavior may be compared cautiously with rice phenology literature [4], [9]. Such comparison is contextual only and cannot replace field-level ground truth. Independent raster comparison remains a useful optional extension, but it is outside the active thesis acceptance scope."
    100 = "5) Measurement Limitations: The approved study contains one 0.157-ha Teluknaga field and therefore cannot establish a universal minimum field area, nationally representative cadence, or agronomic validity. The nine-NDVI/three-NDMI floors are provisional operational rules rather than universally validated reliability thresholds. The public summary supports acquisition-level pass/reject counts but does not justify inventing an unreported full distribution of pixel counts. The exact-polygon measurement path is locally verified, yet hosted migration, worker credentials, authenticated device persistence/read, ground truth, and completed user acceptance testing remain open."
    101 = "Table V compares Matani with representative direct competitors and adjacent tools; the cited product descriptions were checked on 31 August 2026 [29]-[38]."
    103 = "TABLE V Concise comparison of Matani with direct competitors and adjacent tools"
    105 = "Table V compares Matani with representative direct competitors and adjacent tools. OneSoil and EOSDA are broad multi-crop monitoring platforms; SIPINDO and KATAM are Indonesian advisory or planning services; Plantix, CropX, and Climate FieldView address diagnosis or operational precision management. Open-Meteo and Sentinel Hub EO Browser are infrastructure or visualization providers, not direct competitors. Matani's defensible distinction is a padi-only, observation-first mobile workflow that combines user-defined field polygons, dated Sentinel-2 NDVI/NDMI observations, weather context, field notes, and explicit data-state semantics. This is a scope and transparency distinction, not a claim of superior accuracy or market-wide uniqueness. The measurement path is implemented locally, while hosted measured history remains unverified."
    108 = "Both product and thesis scope are restricted to padi. The approved retrospective evidence covers one 0.157-ha Teluknaga field, uses provisional nine-NDVI/three-NDMI valid-pixel floors, and supports only the advisor-reviewed site-specific cadence statement: monthly in the locally labelled dry period and no defensible cadence in the wet period. The local application path includes exact-polygon processing, versioned masking, matched source provenance, typed persistence, owner-scoped access, and explicit unavailable outcomes. The stable public backend alias is reachable and protected routes fail closed, but hosted measurement migration, server-only worker credentials, authenticated physical-device persistence/read, field-level ground truth, completed user acceptance testing, and production notifications remain unverified."
    118 = "Fig. 2. Approved research evidence, locally verified measurement path, and remaining hosted delivery gates as audited on 31 August 2026."
    121 = "The padi-only mobile application provides account access, polygon drawing, an explicit save/retry measurement request, dated NDVI/NDMI time-series display, backend-mediated Open-Meteo weather information, an uncalibrated client-side weather-context indicator, optional descriptive AI summaries, field notes, and explicit queued, rejected, unavailable, and query-failure states. It does not classify crop health, diagnose field conditions, synthesize missing observations, or deliver production alerts. The measured-history interface is implemented locally, while populated hosted history is not yet verified."
    122 = "The Express backend exposes protected weather, legacy satellite, optional AI, and measurement routes. The measurement route verifies a Supabase bearer token, checks field ownership and request bounds, then invokes the controlled worker outside UI rendering. The stable Vercel production alias returned JSON with HTTP 200 at its health endpoint on 31 August 2026, and a protected weather request without a token returned HTTP 401. These checks establish reachability and fail-closed authentication only; they do not establish that hosted measurement credentials or persistence are configured."
    123 = "Supabase stores identity, exact field polygons, notes, durable measurement jobs, typed measurements, per-index statistics, and a security-invoker observation view through versioned migrations and owner-scoped row-level security. Clean local application and database assertions pass, but the measurement migration is not confirmed on hosted Supabase. CDSE endpoint defaults and Open-Meteo-only weather routing are active, while Gemini remains optional presentation support. Server-only Supabase administration and CDSE configuration on the public deployment, plus an authenticated device save-to-read flow, remain unverified."
    124 = "IV. RESULTS"
    126 = "The locally verified repository state separates software assurance from measurement evidence. On 30 August 2026, the complete verification record included an empty-database migration, 26 database assertions, the Python research fixture suite, lint, type checks, and application/backend tests. On 31 August, lint, root/backend type checks, nine root tests, and 36 backend tests passed again; the Python suite could not be rerun because Python 3 was unavailable. The public backend health endpoint returned JSON with HTTP 200 and a protected route without a token returned HTTP 401. These results establish the audited software and authentication behavior only; they do not establish scientific validity, hosted measurement persistence, physical-device success, or user acceptance."
    127 = "B. Approved Teluknaga Feasibility Study"
    128 = "The advisor-approved private study covered one verified 0.157-ha padi field in Teluknaga, Banten, from 1 July 2025 to 1 July 2026. The bounded run completed 12 field-months, 48 successful provider operations in 48 attempts, and consumed approximately 4.203 processing units. It returned 86 intersecting acquisitions: 32 passed the provisional floors of at least nine valid NDVI pixels and three valid NDMI pixels, while 54 were rejected. During locally labelled dry months, 30 of 60 acquisitions passed and every dry month had at least two passing observations. During wet months, two of 26 passed; December, January, and February had none, while March had two. The advisor-reviewed interpretation is monthly cadence for the dry period and no defensible cadence for the wet period, scoped only to this Teluknaga field."
    129 = "C. Locally Implemented Measurement Path"
    130 = "The repository implements a durable exact-polygon measurement path with authenticated jobs, Catalog discovery, separate native-grid NDVI and NDMI Process responses, strict source-identity matching, versioned quality rules, typed provenance persistence, owner isolation, and mobile request/read/retry behavior. A bounded provider-adapter smoke over the approved polygon selected one July 2026 acquisition and matched one source product; all 23 NDVI pixels and all six NDMI pixels in that response were valid, and the operation consumed approximately 0.05 processing units across three first-attempt provider calls. This is a provider-adapter result, not proof of hosted persistence, a universal pixel rule, or scientific validity."
    132 = "A. Answer to RQ1"
    133 = "For the approved Teluknaga field, 32 of 86 acquisitions, or 37.2%, passed both provisional valid-pixel floors. The dry-labelled period passed 30 of 60 acquisitions and included usable observations in every dry month, supporting a monthly dry-season cadence for this site. The wet-labelled period passed only two of 26 acquisitions and had no passing observation in December through February; no wet-season cadence is therefore defensible. This answer is site- and season-label-specific and must not be generalized nationally."
    134 = "B. Answer to RQ3"
    135 = "The approved field is 0.157 ha. Thirty-two acquisitions contained at least nine valid 10 m NDVI pixels and at least three valid 20 m NDMI pixels; 54 failed one or both provisional floors. This outcome shows that the coarser NDMI grid is a distinct constraint and that acquisition-level counts must remain separate by index. The retained public summary does not provide a complete numeric pixel-count distribution for all 86 acquisitions, so no median, range, or universal minimum-area relationship is claimed. The separate July 2026 adapter smoke yielded 23 valid NDVI pixels and six valid NDMI pixels for one selected acquisition, but that single operation cannot establish a general rule."
    136 = "C. Status of Optional Independent Comparison"
    137 = "Independent raster-derived comparison is excluded from the active thesis acceptance scope and retained only as optional future work. The current same-response source metadata and strict cross-response identity matching protect provenance within the implemented provider path, but they are not an independent accuracy assessment."
    138 = "D. Product and Deployment Implication"
    139 = "The application and worker are implemented and verified locally, and the stable public backend alias is reachable. However, the hosted measurement migration, server-only worker configuration, and authenticated physical-device save-to-persist-to-read flow have not been verified. A newly created field may therefore remain empty in the hosted application. Only a provenance-complete row written through the controlled completion path may be presented as measured; research outputs and legacy rows are not promoted."
    141 = "Matani now has a padi-only mobile DSS implementation for requesting and inspecting dated, quality-gated NDVI/NDMI observations while keeping fixture, prototype, measured, rejected, and unavailable semantics explicit. The approved one-field Teluknaga study found that 32 of 86 acquisitions passed the provisional nine-NDVI/three-NDMI pixel floors. Its complete dry-month pattern supports monthly cadence for the locally labelled dry period, while only two passing wet acquisitions support no defensible wet-season cadence. These results are site-specific and do not establish national cadence, universal thresholds, crop-health diagnosis, or agronomic accuracy. The exact-polygon measurement worker, typed persistence, source matching, and mobile flow are locally verified, and the public backend is reachable, but hosted migration, worker configuration, authenticated device persistence, field validation, user acceptance testing, and final thesis-team/advisor approval remain necessary."
    171 = '[29] Open-Meteo, "Free weather API," Open-Meteo. [Online]. Available: https://open-meteo.com/. [Accessed: Aug. 31, 2026].'
    172 = '[30] Sentinel Hub, "EO Browser," Sentinel Hub. [Online]. Available: https://www.sentinel-hub.com/explore/eobrowser/. [Accessed: Aug. 31, 2026].'
    173 = '[31] Sentinel Hub, "How do I view NDVI?," Sentinel Hub. [Online]. Available: https://www.sentinel-hub.com/faq/how-do-i-view-ndvi/. [Accessed: Aug. 31, 2026].'
    174 = '[32] OneSoil, "What is OneSoil?," OneSoil Help Center. [Online]. Available: https://help.onesoil.ai/en/articles/5237693-what-is-onesoil. [Accessed: Aug. 31, 2026].'
    175 = '[33] EOS Data Analytics, "Crop monitoring software for remote farm analytics," EOSDA Crop Monitoring. [Online]. Available: https://eos.com/products/crop-monitoring/. [Accessed: Aug. 31, 2026].'
    176 = '[34] CropX, "CropX agronomic farm management system," CropX. [Online]. Available: https://cropx.com/. [Accessed: Aug. 31, 2026].'
    177 = '[35] Climate FieldView, "Field-level data to analyze every acre, seed and practice," Climate FieldView. [Online]. Available: https://climate.com/en-us/solutions/analyze-data.html. [Accessed: Aug. 31, 2026].'
    178 = '[36] SIPINDO, "Download aplikasi pertanian terlengkap," SIPINDO. [Online]. Available: https://sipindo.id/. [Accessed: Aug. 31, 2026].'
    179 = '[37] Balai Besar Perakitan dan Modernisasi Pertanian Bali, "KATAM Terpadu-SC," BRMP Bali. [Online]. Available: https://bali.brmp.pertanian.go.id/layanan/layanan-lainnya/katam-terpadu-sc. [Accessed: Aug. 31, 2026].'
    180 = '[38] Plantix, "Plantix: Free app for crop diagnosis and treatments," Plantix. [Online]. Available: https://plantix.net/en/. [Accessed: Aug. 31, 2026].'
  }

  foreach ($entry in $replacementByIndex.GetEnumerator()) {
    Set-ParagraphText $bodyParagraphs[[int]$entry.Key] ([string]$entry.Value) $namespaces
  }

  $tables = $documentXml.SelectNodes("//w:tbl", $namespaces)
  if ($tables.Count -lt 6) {
    throw "Expected at least six thesis tables; found $($tables.Count)."
  }

  $tableUpdates = @(
    @{ Table = 1; Row = 3; Cell = 0; Text = "Open-Meteo" },
    @{ Table = 2; Row = 1; Cell = 2; Text = "Exact-polygon validation, canonical geometry hash, area, and centroid computation" },
    @{ Table = 2; Row = 1; Cell = 3; Text = "Persisted field metadata plus a durable initial measurement job" },
    @{ Table = 2; Row = 2; Cell = 0; Text = "Measurement Processing" },
    @{ Table = 2; Row = 2; Cell = 1; Text = "Exact padi polygon, bounded window, Sentinel-2 B04/B08/B11" },
    @{ Table = 2; Row = 2; Cell = 2; Text = "Catalog discovery; native 10 m NDVI and 20 m NDMI Process responses; versioned SCL mask; strict source matching" },
    @{ Table = 2; Row = 2; Cell = 3; Text = "Typed dated observation, per-index statistics, quality state, and complete provenance" },
    @{ Table = 2; Row = 3; Cell = 0; Text = "Feasibility Research Path" },
    @{ Table = 2; Row = 3; Cell = 1; Text = "Approved Teluknaga padi polygon and one-year study window" },
    @{ Table = 2; Row = 3; Cell = 2; Text = "Exact-polygon acquisition, provisional 9/3 adjudication, site-specific wet/dry analysis, and request accounting" },
    @{ Table = 2; Row = 3; Cell = 3; Text = "Site-scoped provider-backed research observations and cadence evidence; not production measurements" },
    @{ Table = 3; Row = 1; Cell = 3; Text = "Implemented and verified locally; populated hosted history remains unverified" },
    @{ Table = 5; Row = 1; Cell = 1; Text = "Padi-only dated NDVI/NDMI time-series decision support" },
    @{ Table = 5; Row = 1; Cell = 2; Text = "Exact-polygon Sentinel-2 NDVI and NDMI path implemented locally" },
    @{ Table = 5; Row = 1; Cell = 5; Text = "Quality-gated raw observations with explicit state; no diagnosis; hosted persistence unverified" }
  )

  foreach ($update in $tableUpdates) {
    $rows = $tables[[int]$update.Table].SelectNodes("./w:tr", $namespaces)
    $cells = $rows[[int]$update.Row].SelectNodes("./w:tc", $namespaces)
    Set-TableCellText $cells[[int]$update.Cell] ([string]$update.Text) $namespaces
  }

  Set-ComparisonTable $tables[5] $namespaces

  $imageUri = [System.IO.Packaging.PackUriHelper]::CreatePartUri(
    [System.Uri]::new("/word/media/image2.png", [System.UriKind]::Relative)
  )
  if (-not $package.PartExists($imageUri)) {
    throw "Expected Figure 2 image part was not found."
  }
  $imagePart = $package.GetPart($imageUri)
  $imageBytes = [System.IO.File]::ReadAllBytes($resolvedImage)
  $imageStream = $imagePart.GetStream([System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
  try {
    $imageStream.Write($imageBytes, 0, $imageBytes.Length)
  }
  finally {
    $imageStream.Dispose()
  }

  $allText = (($documentXml.SelectNodes("//w:t", $namespaces) | ForEach-Object { $_.InnerText }) -join " ")
  foreach ($forbidden in @(
    "Under representative Indonesian padi-field",
    "RQ2 remains unanswered",
    "two developer-supplied",
    "two private, developer-supplied",
    "representative multi-region sampling",
    "approved quality thresholds remain necessary",
    "production satellite route remains a partially connected bbox-based prototype",
    "AccuWeather & Open-Meteo",
    "Not present in the current production app",
    "PRELIMINARY RESULTS"
  )) {
    if ($allText.Contains($forbidden)) {
      throw "Forbidden stale wording remains: $forbidden"
    }
  }
  if ($allText -match '\b(?:DEC-|OBS-|HYP-|M[0-4])\d*\b') {
    throw "Internal decision/evidence/roadmap identifier remains in the public thesis: $($Matches[0])"
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

Write-Output "Created synchronized thesis candidate: $resolvedOutput"
