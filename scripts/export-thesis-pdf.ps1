param(
  [string]$InputPath = ".agent\thesis-aligned-2026-08-21.docx",
  [string]$OutputPath = ".agent\thesis-aligned-2026-08-21.pdf"
)

$ErrorActionPreference = "Stop"

$workspaceRoot = (Resolve-Path -LiteralPath ".").Path
$resolvedInput = (Resolve-Path -LiteralPath $InputPath).Path
$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path $workspaceRoot $OutputPath))

if (-not $resolvedOutput.StartsWith($workspaceRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Output path must stay inside the Matani workspace: $resolvedOutput"
}

$word = $null
$document = $null
$pageCount = $null
$wordCount = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $document = $word.Documents.Open($resolvedInput, $false, $false)
  [void]$document.Repaginate()
  [void]$document.Fields.Update()
  $pageCount = $document.ComputeStatistics(2)
  $wordCount = $document.ComputeStatistics(0)
  $document.Save()
  $document.ExportAsFixedFormat($resolvedOutput, 17)
}
finally {
  if ($null -ne $document) {
    $document.Close($false)
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($document)
  }
  if ($null -ne $word) {
    $word.Quit()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

Write-Output "Exported thesis PDF: $resolvedOutput ($pageCount pages, $wordCount words)"
