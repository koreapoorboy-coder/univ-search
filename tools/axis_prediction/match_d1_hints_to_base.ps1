# ASCII ONLY (standing rule). Compare D1 item hints against the base name of the
# problem type they were assigned to, and surface BASE-COLLISION candidates.
#
# WHY THIS EXISTS (review ruling 13 section 5, 2026-08-21):
#   The GPT transcription spec forbids catalog type names, so D1 items carry only a
#   free-text type-candidate hint (Korean prefix U+C720 U+D615 U+D6C4 U+BCF4) in source_note. The review specified the decision rule:
#     base collision - the hint's topic family differs from the assigned base. The
#                      prescription misfires. This is what we are hunting.
#     cell collision - same family, splits between neighbouring slots. limited damage.
#   Items whose hint cannot decide are reported as HOLD, never forced into a bucket.
#
# INPUT
#   -D1 <file>   TSV or CSV exported from the D1 console. A header row is required and
#                must contain: bulk_batch_id, question_no, problem_type_id, source_note
#                (difficulty is optional). Column order does not matter.
#
# METHOD
#   assigned base   problem_type_id -> slot -> catalog base name
#   hint            source_note, type-candidate prefix stripped, other prefixes dropped
#   score           char-bigram Jaccard(hint, base) and Jaccard(hint, every other base)
#   verdict         OK        best-matching base IS the assigned base
#                   CELL      best base is a neighbouring slot (|slot delta| <= 2)
#                   BASE      best base is far away AND clearly better than assigned
#                   HOLD      scores too close / too low to decide
#
# NOTE: the score is a shortlist device, not a judgement. Every BASE row is a CANDIDATE for
#  the review to rule on. The tool never rewrites data.
#
# USAGE
#   powershell -File tools\axis_prediction\match_d1_hints_to_base.ps1 -D1 <file>
#   powershell -File tools\axis_prediction\match_d1_hints_to_base.ps1 -D1 <file> -ReportPath out.txt

param(
  [string]$Repo = 'C:\Users\user\projects\scshstudy',
  [Parameter(Mandatory=$true)][string]$D1,
  [string]$Catalog = '',
  [double]$MinDecide = 0.10,
  [double]$Margin = 0.06,
  [int]$NeighbourSlots = 2,
  [string]$SlotFamily = '',
  [double]$BigGap = 0.15,
  [string]$ReportPath = ''
)
$ErrorActionPreference = 'Stop'

# --- ASCII SELF-CHECK (standing rule, enforced in-tool 2026-08-18) ---------
$__selfPath = $MyInvocation.MyCommand.Path
if ($__selfPath -and (Test-Path $__selfPath)) {
  $__bad = @([System.IO.File]::ReadAllBytes($__selfPath) | Where-Object { $_ -gt 127 }).Count
  if ($__bad -gt 0) {
    throw ("ASCII RULE VIOLATION: " + [System.IO.Path]::GetFileName($__selfPath) + " contains " + $__bad + " non-ASCII byte(s).")
  }
}
# --- end ASCII SELF-CHECK --------------------------------------------------

if ($Catalog -eq '') {
  $Catalog = Join-Path $Repo 'public\math-weakness-engine\data\problem_types\m2_similarity_pythagoras.problem_types.v1.json'
}
if (-not (Test-Path $D1))      { throw ("input not found: " + $D1) }
if (-not (Test-Path $Catalog)) { throw ("catalog not found: " + $Catalog) }

# ------------------------------------------------- catalog: slot -> base name
$cat = $null
try { $cat = Get-Content $Catalog -Raw -Encoding UTF8 | ConvertFrom-Json }
catch { throw ("REFUSED: catalog is not valid JSON: " + $Catalog) }
if ($null -eq $cat.problem_types) { throw ("REFUSED: catalog has no 'problem_types': " + $Catalog) }

$slotBase = @{}
foreach ($e in @($cat.problem_types)) {
  if ([string]$e.problem_type_id -notmatch 'PT(\d+)$') { continue }
  $n = [int]$matches[1]
  $s = [int][math]::Ceiling($n / 3.0)
  $tn = [string]$e.type_name
  $i = $tn.LastIndexOf(' - ')
  if ($i -gt 0) { $tn = $tn.Substring(0, $i) }
  # one base name per slot is what makes the slot scheme a scheme. A catalog that
  # numbers every type separately (mathflat scheme) fails here instead of being
  # silently reinterpreted as ceil(id/3) slots (tool-test 3, 2026-08-21).
  if ($slotBase.ContainsKey($s) -and $slotBase[$s] -ne $tn) {
    throw ('REFUSED: slot ' + $s + ' carries two different base names - this catalog is not on the 3-cell slot scheme: ' + $Catalog)
  }
  $slotBase[$s] = $tn
}
if ($slotBase.Count -eq 0) { throw ('REFUSED: no PT<number> ids in the catalog - slot scheme not applicable') }

# ------------------------------------------------- read the export
$delim = "`t"
$firstLine = ''
foreach ($ln in (Get-Content $D1 -Encoding UTF8)) { if ($ln.Trim() -ne '') { $firstLine = $ln; break } }
if ($firstLine -eq '') { throw ('REFUSED: export is empty: ' + $D1) }
if (($firstLine -split "`t").Count -lt 3) {
  if (($firstLine -split ',').Count -ge 3) { $delim = ',' }
  else { throw ('REFUSED: header has fewer than 3 columns under both TAB and comma: ' + $firstLine) }
}
$rows = @(Import-Csv -Path $D1 -Delimiter $delim -Encoding UTF8)

# --- UNIT PREFIX GUARD (review ruling 24 section 7, 2026-08-21) -------------
# A tool that reads a catalog and a D1 export together must confirm they belong to the
# same unit. Without it the PT numbers still line up arithmetically and the tool prints a
# plausible result that means nothing (caught 2026-08-21: m3_statistics catalog + M2_SIMPY
# D1 produced "EXISTS 19 / MISSING 71" with no error).
$__pfxCat = ""
foreach ($__e in @($cat.problem_types)) { if ([string]$__e.problem_type_id -match "^(.*PT)\d+$") { $__pfxCat = $matches[1]; break } }
$__pfxD1 = ""
foreach ($__r in $rows) { if ([string]$__r.problem_type_id -match "^(.*PT)\d+$") { $__pfxD1 = $matches[1]; break } }
if ($__pfxCat -ne "" -and $__pfxD1 -ne "" -and $__pfxCat -ne $__pfxD1) {
  throw ("REFUSED: catalog/D1 unit mismatch. catalog ids look like " + $__pfxCat + "nnn but D1 ids look like " + $__pfxD1 + "nnn")
}
# --- end UNIT PREFIX GUARD --------------------------------------------------
if ($rows.Count -eq 0) { throw ('REFUSED: export has a header but no rows: ' + $D1) }
$cols = @($rows[0].PSObject.Properties.Name)
foreach ($need in @('question_no', 'problem_type_id', 'source_note')) {
  if ($cols -notcontains $need) {
    throw ('REFUSED: required column missing: ' + $need + ' (found: ' + ($cols -join ', ') + ')')
  }
}
$hasBatch = ($cols -contains 'bulk_batch_id')

Write-Output ('[in ] export  ' + $D1 + '  rows=' + $rows.Count + '  delim=' + $(if ($delim -eq ',') { 'comma' } else { 'tab' }))
Write-Output ('[in ] catalog ' + $Catalog + '  slots=' + $slotBase.Count)

# ------------------------------------------------- similarity
function Get-Bigrams([string]$s) {
  $t = ($s -replace '[\s\(\)\uFF08\uFF09\u00B7,;:\.\-]', '')
  $h = @{}
  for ($i = 0; $i -lt $t.Length - 1; $i++) { $h[$t.Substring($i, 2)] = 1 }
  return $h
}
function Jac($a, $b) {
  $ka = @($a.Keys)
  if ($ka.Count -eq 0 -or $b.Count -eq 0) { return 0.0 }
  $inter = 0
  foreach ($k in $ka) { if ($b.ContainsKey($k)) { $inter++ } }
  return ($inter / ($ka.Count + $b.Count - $inter))
}
# slot -> family (mid-domain), produced by align_catalog_to_mathflat.ps1 -EmitSlotFamily.
# Slot distance is NOT family: slots 21 and 22 are adjacent but different topics.
$famOf = @{}
if ($SlotFamily -ne '') {
  if (-not (Test-Path $SlotFamily)) { throw ("slot-family file not found: " + $SlotFamily) }
  foreach ($fr in @(Import-Csv -Path $SlotFamily -Encoding UTF8)) {
    if ($fr.PSObject.Properties.Name -notcontains 'slot') { throw ('REFUSED: slot-family file has no slot column: ' + $SlotFamily) }
    $famOf[[int]$fr.slot] = [string]$fr.family
  }
  Write-Output ('[in ] family  ' + $SlotFamily + '  slots=' + $famOf.Count)
}
$slotIdx = @($slotBase.Keys | Sort-Object)
$baseBg = @{}
foreach ($s in $slotIdx) { $baseBg[$s] = Get-Bigrams $slotBase[$s] }

# ------------------------------------------------- classify
$out = New-Object System.Collections.ArrayList
$stat = @{ ok = 0; cell = 0; base = 0; hold = 0; noid = 0; nohint = 0; unknown = 0 }
$cands = New-Object System.Collections.ArrayList

foreach ($r in $rows) {
  $qid = [string]$r.problem_type_id
  $batch = ''
  if ($hasBatch) { $batch = [string]$r.bulk_batch_id }
  $qno = [string]$r.question_no
  $note = [string]$r.source_note

  if ($qid.Trim() -eq '') { $stat.noid++; [void]$cands.Add([pscustomobject]@{v='NOID';batch=$batch;q=$qno;slot=0;best=0;sa=0;sb=0;note=$note}); continue }
  if ($qid -notmatch 'PT(\d+)$') { $stat.unknown++; continue }
  $n = [int]$matches[1]
  $slot = [int][math]::Ceiling($n / 3.0)
  if (-not $slotBase.ContainsKey($slot)) { $stat.unknown++; continue }

  # hint text: keep only the type-candidate segment
  $hint = $note
  $parts = $hint -split '\|'
  $keep = @()
  foreach ($p in $parts) {
    $q = $p.Trim()
    if ($q -match '^\uC720\uD615\uD6C4\uBCF4\s*:') { $keep += ($q -replace '^\uC720\uD615\uD6C4\uBCF4\s*:\s*', '') }
  }
  if ($keep.Count -eq 0) { $stat.nohint++; continue }
  $hint = ($keep -join ' ')

  $hb = Get-Bigrams $hint
  $sAssigned = Jac $hb $baseBg[$slot]
  $bestSlot = $slot; $bestScore = -1.0
  foreach ($s in $slotIdx) {
    $sc = Jac $hb $baseBg[$s]
    if ($sc -gt $bestScore) { $bestScore = $sc; $bestSlot = $s }
  }

  $v = 'OK'
  if ($bestSlot -eq $slot) {
    $v = 'OK'; $stat.ok++
  } elseif ($bestScore -lt $MinDecide -or ($bestScore - $sAssigned) -lt $Margin) {
    $v = 'HOLD'; $stat.hold++
  } else {
    $sameFam = $false
    if ($famOf.Count -gt 0) {
      $sameFam = ($famOf.ContainsKey($slot) -and $famOf.ContainsKey($bestSlot) -and $famOf[$slot] -eq $famOf[$bestSlot] -and $famOf[$slot] -ne '')
    } else {
      $sameFam = ([math]::Abs($bestSlot - $slot) -le $NeighbourSlots)
    }
    if ($sameFam -and ($bestScore - $sAssigned) -lt $BigGap) {
      $v = 'CELL'; $stat.cell++
    } else {
      $v = 'BASE'; $stat.base++
    }
  }
  if ($v -ne 'OK') {
    $ft = 'fam?'
    if ($famOf.Count -gt 0 -and $famOf.ContainsKey($slot) -and $famOf.ContainsKey($bestSlot)) {
      if ($famOf[$slot] -eq $famOf[$bestSlot]) { $ft = 'same-family' } else { $ft = 'DIFF-family' }
    }
    [void]$cands.Add([pscustomobject]@{ v = $v; batch = $batch; q = $qno; slot = $slot; best = $bestSlot; sa = [math]::Round($sAssigned,3); sb = [math]::Round($bestScore,3); note = $hint; ft = $ft })
  }
}

function Emit($s) { Write-Output $s; [void]$out.Add($s) }
Emit ''
Emit '=== SUMMARY ==='
Emit ('  OK   assigned base is the best match     : ' + $stat.ok)
Emit ('  CELL best base is a neighbouring slot    : ' + $stat.cell)
Emit ('  BASE best base is a different family     : ' + $stat.base + '   <== candidates for review')
Emit ('  HOLD hint cannot decide                  : ' + $stat.hold)
Emit ('  NOID item has no problem_type_id         : ' + $stat.noid)
Emit ("  no type-candidate segment in source_note : " + $stat.nohint)
Emit ('  id not in this catalog                   : ' + $stat.unknown)
Emit ('  thresholds: MinDecide=' + $MinDecide + ' Margin=' + $Margin + ' NeighbourSlots=' + $NeighbourSlots)

foreach ($tag in @('BASE', 'CELL', 'NOID', 'HOLD')) {
  $sel = @($cands | Where-Object { $_.v -eq $tag })
  if ($sel.Count -eq 0) { continue }
  Emit ''
  Emit ('=== ' + $tag + ' (' + $sel.Count + ') ===')
  foreach ($c in $sel) {
    if ($tag -eq 'NOID') {
      Emit ('  ' + $c.batch + '  q' + $c.q + '  (no problem_type_id)  ' + $c.note)
    } else {
      $an = $slotBase[[int]$c.slot]
      $bn = ''
      if ($c.best -gt 0) { $bn = $slotBase[[int]$c.best] }
      Emit ('  ' + $c.batch + '  q' + $c.q + '  slot ' + $c.slot + ' -> ' + $c.best + '   sim ' + $c.sa + ' -> ' + $c.sb + '   ' + $c.ft)
      Emit ('      assigned : ' + $an)
      Emit ('      best     : ' + $bn)
      Emit ('      hint     : ' + $c.note)
    }
  }
}

if ($ReportPath -ne '') {
  [System.IO.File]::WriteAllText($ReportPath, (($out -join "`r`n") + "`r`n"), (New-Object System.Text.UTF8Encoding($false)))
  Write-Output ('[report] ' + $ReportPath)
}
