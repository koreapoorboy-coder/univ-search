# make_catalog_short.ps1 (ASCII-only; data I/O is UTF-8)
# Purpose: extract [{problem_type_id, type_name}] from a unit's problem_types catalog
#          for reviewer (2nd-tier) mechanical comparison against GPT "유형후보" hints.
# Reusable per-unit. Reads index.v1.json to resolve the catalog file the WORKER validates against.
#
# Usage:
#   powershell -File make_catalog_short.ps1                 # all units
#   powershell -File make_catalog_short.ps1 -Unit M2_GEOMETRY_PROPERTIES
#
param(
  [string]$Unit = "",
  [string]$Base = "C:\Users\user\projects\scshstudy\public\math-weakness-engine",
  [string]$OutDir = ""
)
$ErrorActionPreference = "Stop"
if (-not $OutDir) { $OutDir = Join-Path $Base "data\problem_types_short" }
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }

$idx = Get-Content (Join-Path $Base "data\index.v1.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$units = $idx.units
if ($Unit) { $units = $units | Where-Object { $_.unit_id -eq $Unit } }
if (-not $units) { Write-Error "unit not found: $Unit"; exit 1 }

$summary = @()
foreach ($u in $units) {
  $rel = $u.problem_types
  if (-not $rel) { $summary += "SKIP $($u.unit_id) (no problem_types path)"; continue }
  $fp = Join-Path $Base $rel
  if (-not (Test-Path $fp)) { $summary += "MISSING $($u.unit_id) -> $rel"; continue }
  $pack = Get-Content $fp -Raw -Encoding UTF8 | ConvertFrom-Json
  $short = @($pack.problem_types | ForEach-Object {
    [ordered]@{ problem_type_id = $_.problem_type_id; type_name = $_.type_name }
  })
  $obj = [ordered]@{
    unit_id = $u.unit_id
    unit_name = $u.unit_name
    source_file = $rel
    count = $short.Count
    types = $short
  }
  $outFile = Join-Path $OutDir ("{0}.catalog_short.v1.json" -f $u.unit_id)
  # Write UTF-8 without BOM so it serves/loads cleanly.
  $json = $obj | ConvertTo-Json -Depth 5
  [System.IO.File]::WriteAllText($outFile, $json, (New-Object System.Text.UTF8Encoding($false)))
  $summary += ("OK  {0}  types={1}  -> {2}" -f $u.unit_id, $short.Count, (Split-Path $outFile -Leaf))
}
$summary | ForEach-Object { Write-Output $_ }
Write-Output ("DONE. out={0}" -f $OutDir)
