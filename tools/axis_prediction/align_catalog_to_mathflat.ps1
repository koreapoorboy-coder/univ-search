# ASCII ONLY (standing rule). Align a slot-scheme catalog to a mathflat raw taxonomy
# by ORDER, using a monotone dynamic program, to identify the owners of empty slots.
#
# WHY THIS EXISTS (review ruling 10, 2026-08-20, step 2):
#   "raw mathflat 81 types: find candidates at the empty slot positions and compare.
#    The name systems differ but the concepts can still overlap - the 2/53 figure was
#    an EXACT-STRING match."
#   Exact matching answers the wrong question. Both lists are the same curriculum in
#   the same teaching order, so the evidence lives in the ORDER, not in the strings.
#
# METHOD
#   catalog slot s -> base name (type_name minus the trailing " - <suffix>")
#   every mathflat group is assigned to exactly one slot, order preserving, >=1 per slot
#   objective: maximise the sum of char-bigram Jaccard(slot base, group name)
#   an empty slot scores 0 on every group, so it collects whatever its neighbours,
#   competing for their own high-scoring groups, leave behind at that position.
#   => the groups that land on an empty slot are that slot's candidate owners.
#
#   The alignment is monotone BY CONSTRUCTION, so monotonicity is not evidence here.
#   The evidence is the score of the OCCUPIED slots: if the two lists were unrelated,
#   the occupied slots could not score highly under an order-preserving map.
#
# GUARDS (test 3 - do not emit a confident alignment on unrelated input)
#   - occupied-slot mean similarity must clear -MinMeanSim
#   - occupied-slot top-1 rate (share of slots whose assigned run contains their own
#     global best match) must clear -MinTop1
#   Failing either is reported as REFUSED, not as a low-confidence table.
#
# USAGE
#   powershell -File tools\axis_prediction\align_catalog_to_mathflat.ps1
#   powershell -File tools\axis_prediction\align_catalog_to_mathflat.ps1 -Slots 59 -ReportPath out.txt
#   powershell -File tools\axis_prediction\align_catalog_to_mathflat.ps1 -Catalog <f> -Mathflat <f> -Slots <n>

param(
  [string]$Repo = 'C:\Users\user\projects\scshstudy',
  [string]$Catalog = '',
  [string]$Mathflat = '',
  [int]$Slots = 59,
  [double]$MinMeanSim = 0.20,
  [double]$MinTop1 = 0.60,
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

$root = Join-Path $Repo 'public\math-weakness-engine'
if ($Catalog  -eq '') { $Catalog  = Join-Path $root 'data\problem_types\m2_similarity_pythagoras.problem_types.v1.json' }
if ($Mathflat -eq '') { $Mathflat = Join-Path $root 'data\raw_taxonomy\m2_similarity.mathflat.v1.json' }
foreach ($p in @($Catalog, $Mathflat)) { if (-not (Test-Path $p)) { throw ("input not found: " + $p) } }
if ($Slots -lt 1) { throw ("REFUSED: -Slots must be >= 1, got " + $Slots) }

function Read-Json($path) {
  try { return (Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json) }
  catch { throw ("REFUSED: not valid JSON: " + $path) }
}
$cat = Read-Json $Catalog
$mf  = Read-Json $Mathflat
if ($null -eq $cat.problem_types) { throw ("REFUSED: catalog has no 'problem_types': " + $Catalog) }
if ($null -eq $mf.problem_types)  { throw ("REFUSED: mathflat has no 'problem_types': " + $Mathflat) }

# ------------------------------------------------- catalog: slot -> base name
$slotBase = @{}
$entries = @($cat.problem_types)
foreach ($e in $entries) {
  if ($e.problem_type_id -notmatch 'PT(\d+)$') {
    throw ("REFUSED: catalog id does not end in PT<number>: " + $e.problem_type_id + " - slot scheme not applicable")
  }
  $n = [int]$matches[1]
  $s = [int][math]::Ceiling($n / 3.0)
  $tn = [string]$e.type_name
  $i = $tn.LastIndexOf(' - ')
  if ($i -gt 0) { $tn = $tn.Substring(0, $i) }
  if ($slotBase.ContainsKey($s) -and $slotBase[$s] -ne $tn) {
    throw ("REFUSED: slot " + $s + " carries two different base names - slot scheme broken")
  }
  $slotBase[$s] = $tn
}
$maxSlot = 0
foreach ($k in $slotBase.Keys) { if ($k -gt $maxSlot) { $maxSlot = $k } }
if ($maxSlot -gt $Slots) { throw ("REFUSED: catalog reaches slot " + $maxSlot + " but -Slots is " + $Slots) }

$names = @(); $mids = @()
foreach ($g in @($mf.problem_types)) { $names += [string]$g.type_name; $mids += [string]$g.problem_type_id }
$M = $names.Count
$N = $Slots
if ($M -lt $N) { throw ("REFUSED: mathflat has " + $M + " groups but the catalog declares " + $N + " slots - cannot cover") }

Write-Output ("[in ] catalog  " + $Catalog)
Write-Output ("[in ] mathflat " + $Mathflat)
Write-Output ("[in ] slots=" + $N + " occupied=" + $slotBase.Count + " empty=" + ($N - $slotBase.Count) + " mathflat_groups=" + $M)

# ------------------------------------------------- similarity (char bigrams)
function Get-Bigrams([string]$s) {
  $t = ($s -replace '[\s\(\)\uFF08\uFF09\u00B7,;:\.\-]', '')
  $h = @{}
  for ($i = 0; $i -lt $t.Length - 1; $i++) { $h[$t.Substring($i, 2)] = 1 }
  return $h
}
$mfBg = @(); foreach ($nm in $names) { $mfBg += (Get-Bigrams $nm) }

$sim = New-Object 'double[,]' ($N + 1), ($M + 1)
for ($i = 1; $i -le $N; $i++) {
  if (-not $slotBase.ContainsKey($i)) { continue }
  $a = Get-Bigrams $slotBase[$i]
  $ka = @($a.Keys)
  for ($g = 1; $g -le $M; $g++) {
    $b = $mfBg[$g - 1]
    if ($ka.Count -eq 0 -or $b.Count -eq 0) { continue }
    $inter = 0
    foreach ($k in $ka) { if ($b.ContainsKey($k)) { $inter++ } }
    $sim[$i, $g] = $inter / ($ka.Count + $b.Count - $inter)
  }
}

# ------------------------------------------------- monotone DP
$NEG = -1000000000.0
$f  = New-Object 'double[,]' ($N + 1), ($M + 1)
$bk = New-Object 'int[,]'    ($N + 1), ($M + 1)
for ($i = 0; $i -le $N; $i++) { for ($j = 0; $j -le $M; $j++) { $f[$i, $j] = $NEG; $bk[$i, $j] = -1 } }
$f[0, 0] = 0.0
for ($i = 1; $i -le $N; $i++) {
  $jhi = $M - ($N - $i)
  for ($j = $i; $j -le $jhi; $j++) {
    $best = $NEG; $bestk = -1; $run = 0.0
    for ($k = $j - 1; $k -ge ($i - 1); $k--) {
      $run += $sim[$i, ($k + 1)]
      $prev = $f[($i - 1), $k]
      if ($prev -gt ($NEG / 2)) {
        $v = $prev + $run
        if ($v -gt $best) { $best = $v; $bestk = $k }
      }
    }
    $f[$i, $j] = $best; $bk[$i, $j] = $bestk
  }
}
$total = $f[$N, $M]
if ($total -le ($NEG / 2)) { throw 'REFUSED: no monotone assignment exists' }

$assign = @{}
$j = $M
for ($i = $N; $i -ge 1; $i--) {
  $k = $bk[$i, $j]
  if ($k -lt 0) { throw ('REFUSED: backtrace broke at slot ' + $i) }
  $assign[$i] = @(($k + 1)..$j)
  $j = $k
}

# ------------------------------------------------- confidence guards
$sumSim = 0.0; $occ = 0; $top1 = 0
for ($i = 1; $i -le $N; $i++) {
  if (-not $slotBase.ContainsKey($i)) { continue }
  $occ++
  $bestInRun = 0.0
  foreach ($g in $assign[$i]) { if ($sim[$i, $g] -gt $bestInRun) { $bestInRun = $sim[$i, $g] } }
  $sumSim += $bestInRun
  $globalBest = 0.0
  for ($g = 1; $g -le $M; $g++) { if ($sim[$i, $g] -gt $globalBest) { $globalBest = $sim[$i, $g] } }
  if ($globalBest -gt 0 -and [math]::Abs($bestInRun - $globalBest) -lt 0.0001) { $top1++ }
}
$meanSim = 0.0; if ($occ -gt 0) { $meanSim = $sumSim / $occ }
$top1rate = 0.0; if ($occ -gt 0) { $top1rate = $top1 / $occ }
Write-Output ("[conf] occupied-slot mean best-sim = " + [math]::Round($meanSim, 3) + "  (min " + $MinMeanSim + ")")
Write-Output ("[conf] occupied-slot top-1 rate    = " + [math]::Round($top1rate, 3) + "  (" + $top1 + "/" + $occ + ", min " + $MinTop1 + ")")
$refuse = $false
if ($meanSim  -lt $MinMeanSim) { Write-Output '[GUARD-FAIL] mean similarity below floor'; $refuse = $true }
if ($top1rate -lt $MinTop1)    { Write-Output '[GUARD-FAIL] top-1 rate below floor';     $refuse = $true }
if ($refuse) {
  throw 'REFUSED: the two lists do not align well enough to read anything off the empty slots. No table emitted.'
}

# ------------------------------------------------- output
$out = New-Object System.Collections.ArrayList
function Emit($s) { Write-Output $s; [void]$out.Add($s) }
Emit ''
Emit '=== FULL ALIGNMENT (slot -> mathflat groups) ==='
Emit ('{0,4} {1,-12} {2,6}  {3}' -f 'slot', 'mathflat', 'sim', 'catalog base  ||  mathflat name(s)')
for ($i = 1; $i -le $N; $i++) {
  $gs = $assign[$i]
  $tag = 'EMPTY'
  if ($slotBase.ContainsKey($i)) { $tag = $slotBase[$i] }
  $first = $true
  foreach ($g in $gs) {
    # PS 5.1 cannot parse a 2-D index inside a method-call argument list; use a temp.
    $svRaw = $sim[$i, $g]
    $sv = [math]::Round($svRaw, 3)
    if ($first) {
      Emit ('{0,4} {1,-12} {2,6}  {3}  ||  {4}' -f $i, ('mf#' + $g), $sv, $tag, $names[$g - 1])
      $first = $false
    } else {
      Emit ('{0,4} {1,-12} {2,6}  {3}  ||  {4}' -f '', ('mf#' + $g), $sv, '', $names[$g - 1])
    }
  }
}
Emit ''
Emit '=== EMPTY SLOTS - candidate owners (this is the answer) ==='
for ($i = 1; $i -le $N; $i++) {
  if ($slotBase.ContainsKey($i)) { continue }
  Emit ('slot ' + $i + ':')
  if ($i -gt 1 -and $slotBase.ContainsKey($i - 1)) { Emit ('   prev slot ' + ($i - 1) + ' = ' + $slotBase[$i - 1]) }
  foreach ($g in $assign[$i]) { Emit ('   -> mf#' + $g + '  ' + $names[$g - 1] + '   [' + $mids[$g - 1] + ']') }
  if ($slotBase.ContainsKey($i + 1)) { Emit ('   next slot ' + ($i + 1) + ' = ' + $slotBase[$i + 1]) }
}
Emit ''
Emit ('[score] DP total = ' + [math]::Round($total, 3))

if ($ReportPath -ne '') {
  [System.IO.File]::WriteAllText($ReportPath, (($out -join "`r`n") + "`r`n"), (New-Object System.Text.UTF8Encoding($false)))
  Write-Output ('[report] ' + $ReportPath)
}
