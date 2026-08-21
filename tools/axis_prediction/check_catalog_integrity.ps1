# ASCII ONLY (standing rule). Catalog / manifest integrity auditor.
#
# WHY THIS EXISTS (incident 2026-08-20):
#   A hand-rolled audit loop read docs/patch*_validation.json and skipped any file
#   that lacked canonical_unit_id with a bare `continue`. 21 of 38 docs lacked it,
#   so 21 units were silently missing from the audit table - including a unit with
#   1,950 registered items. No error, no warning, just an incomplete table.
#   Same failure class as collect_gaps.ps1 mis-detecting M2_GEOM concept_map.
#
# RULES ENFORCED HERE:
#   - Units are enumerated from DATA (problem_types/*.json), never from a doc list.
#   - Nothing is skipped silently. Every unreadable file / missing declaration is
#     printed under [WARN] and counted in the summary.
#
# CHECKS
#   1 path existence   : every path in index.v1.json and manifest.json resolves
#   2 declared count   : catalog entry count vs canonical_problem_type_count in docs
#   3 slot arithmetic  : declared count divisible by 3 (base x 3 slot scheme)
#   4 concept 1:1      : one concept per base, concept_ids length 1
#   5 truncation       : max numeric id vs entry count (gaps = missing entries)
#   6 slot integrity   : id -> slot/position; one base name per slot, suffix order
#   7 concept witness  : concept number == slot number, and concept max x 3 == declared
#                        (the concept layer was not truncated, so it still records the
#                         real base count - independent witness to the declared size)
#   8 accounting       : manifest declared total == in-index actual + truncation deficit
#                        any remainder is printed as UNEXPLAINED, never absorbed
#
# USAGE
#   powershell -File tools\axis_prediction\check_catalog_integrity.ps1
#   powershell -File tools\axis_prediction\check_catalog_integrity.ps1 -Unit M3_CIRCLE_PROPERTIES
#   powershell -File tools\axis_prediction\check_catalog_integrity.ps1 -FailOnly

param(
  [string]$Repo = 'C:\Users\user\projects\scshstudy',
  [string]$Unit = '',
  [switch]$FailOnly
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
$data = Join-Path $root 'data'
if (-not (Test-Path $data)) { throw ("data dir not found: " + $data) }

$warn = New-Object System.Collections.ArrayList
function Add-Warn($msg) { [void]$warn.Add($msg) }

function Read-Json($path) {
  if (-not (Test-Path $path)) { Add-Warn ("missing file: " + $path); return $null }
  try { return (Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json) }
  catch { Add-Warn ("parse failed: " + $path + " :: " + $_.Exception.Message); return $null }
}

# ---------------------------------------------------------------- declarations
# Collected from every json under docs/. Two key shapes exist:
#   "canonical_unit_id" + "canonical_problem_type_count"
#   "<unit_lowercase>_canonical_problem_type_count" inside base_engine_check
$decl = @{}
$docDir = Join-Path $root 'docs'
$docCount = 0; $docNoDecl = 0
if (Test-Path $docDir) {
  foreach ($d in (Get-ChildItem $docDir -Filter '*.json')) {
    $docCount++
    $raw = ''
    try { $raw = Get-Content $d.FullName -Raw -Encoding UTF8 }
    catch { Add-Warn ("doc unreadable: " + $d.Name); continue }
    $found = $false
    $uid = [regex]::Match($raw, '"canonical_unit_id"\s*:\s*"([^"]+)"')
    $cnt = [regex]::Match($raw, '"canonical_problem_type_count"\s*:\s*(\d+)')
    if ($uid.Success -and $cnt.Success) {
      $u = $uid.Groups[1].Value
      if (-not $decl.ContainsKey($u)) { $decl[$u] = @{} }
      $decl[$u][[int]$cnt.Groups[1].Value] = $d.Name
      $found = $true
    }
    foreach ($m in [regex]::Matches($raw, '"([a-z0-9_]+)_canonical_problem_type_count"\s*:\s*(\d+)')) {
      $u = $m.Groups[1].Value.ToUpper()
      if (-not $decl.ContainsKey($u)) { $decl[$u] = @{} }
      $decl[$u][[int]$m.Groups[2].Value] = $d.Name
      $found = $true
    }
    if (-not $found) { $docNoDecl++ }
  }
}
Write-Output ("[docs] scanned " + $docCount + " json, " + $docNoDecl + " carry no canonical declaration (not an error; listed for transparency)")

# ---------------------------------------------------------------- CHECK 1
Write-Output ''
Write-Output '=== CHECK 1 : manifest path existence ==='
$c1bad = 0; $c1total = 0
$idx = Read-Json (Join-Path $data 'index.v1.json')
if ($idx) {
  foreach ($u in @($idx.units)) {
    foreach ($p in $u.PSObject.Properties) {
      $v = $p.Value
      if ($v -isnot [string]) { continue }
      if ($v -notmatch '^data/') { continue }
      $c1total++
      if (-not (Test-Path (Join-Path $root $v))) {
        $c1bad++
        Write-Output ("  DANGLING  " + $u.unit_id + "  " + $p.Name + " -> " + $v)
      }
    }
  }
} else { Add-Warn 'index.v1.json unreadable - CHECK 1 incomplete' }
$mf = Join-Path $root 'manifest.json'
if (Test-Path $mf) {
  $mraw = Get-Content $mf -Raw -Encoding UTF8
  foreach ($m in [regex]::Matches($mraw, '"(data/[^"]+\.(?:json|csv))"')) {
    $v = $m.Groups[1].Value; $c1total++
    if (-not (Test-Path (Join-Path $root $v))) { $c1bad++; Write-Output ("  DANGLING  manifest.json -> " + $v) }
  }
} else { Add-Warn 'manifest.json not found - CHECK 1 incomplete' }
Write-Output ("  result: " + $c1bad + " dangling / " + $c1total + " paths checked")

# ---------------------------------------------------------------- per-unit
Write-Output ''
Write-Output '=== CHECK 2-6 : per-unit catalog audit ==='
Write-Output ('{0,-34} {1,6} {2,6} {3,6} {4,7} {5,6} {6}' -f 'unit_id','entry','maxId','decl','base*3','conc','verdict')

$files = Get-ChildItem (Join-Path $data 'problem_types') -Filter '*.problem_types.v1.json' | Sort-Object Name
$sum = @{ units = 0; c2 = 0; c3 = 0; c4 = 0; c5 = 0; c6 = 0; c7 = 0; na = 0; deficit = 0; c9 = 0; c10 = 0 }

foreach ($f in $files) {
  $j = Read-Json $f.FullName
  if ($null -eq $j) { continue }
  $uid = [string]$j.unit_id
  if ([string]::IsNullOrEmpty($uid)) { Add-Warn ("no unit_id: " + $f.Name); continue }
  if ($Unit -and $uid -ne $Unit) { continue }
  $sum.units++

  $pts = @($j.problem_types)
  $entry = $pts.Count
  if ($entry -eq 0) { Add-Warn ("zero entries: " + $f.Name); continue }

  # numeric id tail
  $nums = @(); $noNum = 0
  foreach ($t in $pts) {
    $m = [regex]::Match([string]$t.problem_type_id, '(\d+)$')
    if ($m.Success) { $nums += [int]$m.Groups[1].Value } else { $noNum++ }
  }
  if ($noNum -gt 0) { Add-Warn ($uid + ": " + $noNum + " ids without numeric tail (CHECK 5/6 partial)") }
  $maxId = if ($nums.Count -gt 0) { ($nums | Measure-Object -Maximum).Maximum } else { 0 }

  # base name = type_name minus trailing ' - <suffix>' (no Korean literal needed)
  $baseOf = @{}
  foreach ($t in $pts) {
    $n = [string]$t.type_name
    $i = $n.LastIndexOf(' - ')
    if ($i -gt 0) { $n = $n.Substring(0, $i) }
    $baseOf[[string]$t.problem_type_id] = $n
  }
  $baseCount = @($baseOf.Values | Select-Object -Unique).Count

  # declared
  $declVals = if ($decl.ContainsKey($uid)) { @($decl[$uid].Keys | Sort-Object) } else { @() }
  $declTxt = if ($declVals.Count -eq 0) { '-' } else { ($declVals -join '/') }
  if ($declVals.Count -eq 0) { Add-Warn ($uid + ": no canonical declaration found in docs (CHECK 2/3 skipped - REPORTED, not silent)") }
  if ($declVals.Count -gt 1) { Add-Warn ($uid + ": conflicting declarations " + ($declVals -join ', ')) }

  # CHECK 2 entries vs declared
  $c2 = 'n/a'
  if ($declVals.Count -ge 1) {
    if ($declVals -contains $entry) { $c2 = 'ok' } else { $c2 = 'FAIL'; $sum.c2++ }
  }
  # CHECK 3 declared divisible by 3
  $c3 = 'n/a'
  if ($declVals.Count -ge 1) {
    $d0 = $declVals[$declVals.Count - 1]
    if ($d0 % 3 -eq 0) { $c3 = 'ok' } else { $c3 = 'FAIL'; $sum.c3++ }
  }
  # --- structure detection (do NOT assume the 3-slot scheme) ------------------
  # The "base x 3 suffix" scheme exists only in catalogs assembled that way.
  # Applying CHECK 4/6 to a catalog built differently produces meaningless FAILs
  # (tool-test 3, "mis-detection"). So detect first, then judge.
  $suffixed = 0
  foreach ($t in $pts) { if (([string]$t.type_name).LastIndexOf(' - ') -gt 0) { $suffixed++ } }
  $slotBase = @{}; $c6bad = 0
  foreach ($t in $pts) {
    $id = [string]$t.problem_type_id
    $m = [regex]::Match($id, '(\d+)$')
    if (-not $m.Success) { continue }
    $n = [int]$m.Groups[1].Value
    $slot = [math]::Ceiling($n / 3.0)
    $b = $baseOf[$id]
    if ($slotBase.ContainsKey($slot)) {
      if ($slotBase[$slot] -ne $b) { $c6bad++ }
    } else { $slotBase[$slot] = $b }
  }
  $suffixRate = if ($entry -gt 0) { 1.0 * $suffixed / $entry } else { 0 }
  $violRate = if ($entry -gt 0) { 1.0 * $c6bad / $entry } else { 1 }
  $scheme = ($suffixRate -ge 0.9 -and $violRate -le 0.1)

  # CHECK 4 concept 1:1 (only meaningful under the slot scheme)
  $cids = @(); $badLen = 0
  foreach ($t in $pts) {
    $c = @($t.concept_ids)
    if ($c.Count -ne 1) { $badLen++ }
    foreach ($x in $c) { if ("$x" -ne '') { $cids += [string]$x } }
  }
  $concCount = @($cids | Select-Object -Unique).Count
  if (-not $scheme) {
    $c4 = 'n/a'
  } elseif ($concCount -eq 0) {
    $c4 = 'empty'
  } elseif ($badLen -gt 0) {
    $c4 = 'FAIL'; $sum.c4++; Add-Warn ($uid + ": " + $badLen + " entries whose concept_ids length != 1")
  } elseif ($concCount -ne $baseCount) {
    $c4 = 'FAIL'; $sum.c4++; Add-Warn ($uid + ": concepts " + $concCount + " != bases " + $baseCount)
  } else { $c4 = 'ok' }

  # CHECK 5 truncation
  $c5 = 'ok'
  if ($maxId -gt $entry) { $c5 = 'FAIL'; $sum.c5++ }

  # CHECK 6 slot integrity
  if (-not $scheme) {
    $c6 = 'n/a'
    $sum.na++
    Add-Warn ($uid + ": 3-slot scheme not detected (suffix rate " + [math]::Round($suffixRate * 100) + "%, slot conflicts " + $c6bad + ") - CHECK 4/6 reported n/a, NOT pass")
  } elseif ($c6bad -gt 0) {
    $c6 = 'FAIL'; $sum.c6++; Add-Warn ($uid + ": " + $c6bad + " entries share a slot with a different base name")
  } else { $c6 = 'ok' }

  # CHECK 7 concept number == slot number, and concept max x 3 == declared count
  # WHY: the concept layer was NOT truncated along with the catalog, so the highest
  # concept number still records how many base slots the unit really has.
  # M2_SIMPY references C002..C059 with 6 gaps -> 59 bases -> 177 declared. That is
  # an independent witness to the declared size (2026-08-21 finding).
  # Applies ONLY where one concept per entry already holds (CHECK 4 ok). Units that
  # attach several concepts per type use their own concept numbering, and judging
  # them here produced 3 false FAILs on the first run (tool-test 3, mis-detection).
  $c7 = 'n/a'
  if ($scheme -and $concCount -gt 0 -and $c4 -eq 'ok') {
    $cnums = @(); $cmis = 0
    foreach ($t in $pts) {
      $m = [regex]::Match([string]$t.problem_type_id, '(\d+)$')
      if (-not $m.Success) { continue }
      $slotN = [int][math]::Ceiling([int]$m.Groups[1].Value / 3.0)
      foreach ($x in @($t.concept_ids)) {
        if ("$x" -eq '') { continue }
        $cm = [regex]::Match([string]$x, '(\d+)$')
        if (-not $cm.Success) { continue }
        $cn = [int]$cm.Groups[1].Value
        $cnums += $cn
        if ($cn -ne $slotN) { $cmis++ }
      }
    }
    if ($cnums.Count -eq 0) {
      $c7 = 'n/a'
    } elseif ($cmis -gt 0) {
      # a high mismatch rate means the unit numbers concepts on its own axis,
      # not that the catalog is broken. report n/a, do not FAIL.
      $misRate = 1.0 * $cmis / $cnums.Count
      if ($misRate -gt 0.5) {
        $c7 = 'n/a'
        Add-Warn ($uid + ": concept numbering is not slot-aligned (" + [math]::Round($misRate * 100) + "% differ) - CHECK 7 reported n/a, NOT pass")
      } else {
        $c7 = 'FAIL'; $sum.c7++
        Add-Warn ($uid + ": " + $cmis + " of " + $cnums.Count + " entries whose concept number != slot number (CHECK 7)")
      }
    } else {
      # The concept number is the base index, so the HIGHEST concept referenced is the
      # highest base slot the assembly ever reached. That is a LOWER BOUND on the real
      # base count, not an equality:
      #   cmax x3  >  declared  -> the declaration is too small. real defect.
      #   cmax x3  == declared  -> the assembly reached the last slot. declaration upheld.
      #   cmax x3  <  declared  -> the tail was simply never observed. NOT a defect.
      # M3_STATISTICS stops at C025 of 36 bases because no worksheet item reached slots
      # 26-36; the first version of this check called that FAIL (tool-test 3, 2026-08-21).
      $cmax = ($cnums | Measure-Object -Maximum).Maximum
      if ($declVals.Count -eq 0) {
        $c7 = 'n/a'
      } elseif (($cmax * 3) -gt $declVals[$declVals.Count - 1]) {
        $c7 = 'FAIL'; $sum.c7++
        Add-Warn ($uid + ": concept max " + $cmax + " x3 = " + ($cmax * 3) + " EXCEEDS declared " + $declTxt + " - the declaration is too small (CHECK 7)")
      } elseif ($declVals -contains ($cmax * 3)) {
        $c7 = 'ok'
      } else {
        $c7 = 'under'
        Add-Warn ($uid + ": concept max " + $cmax + " x3 = " + ($cmax * 3) + " < declared " + $declTxt + " - tail slots never observed, declaration NOT witnessed (CHECK 7 under, not a defect)")
      }
    }
  }

  # accumulate the accounting figures for CHECK 8
  if ($declVals.Count -ge 1) {
    $d1 = $declVals[$declVals.Count - 1]
    if ($d1 -gt $entry) { $sum.deficit += ($d1 - $entry) }
  }

  $verdict = @()
  if ($c7 -eq 'FAIL') { $verdict += 'C7' }
  if ($c2 -eq 'FAIL') { $verdict += 'C2' }
  if ($c3 -eq 'FAIL') { $verdict += 'C3' }
  if ($c4 -eq 'FAIL') { $verdict += 'C4' }
  if ($c5 -eq 'FAIL') { $verdict += 'C5' }
  if ($c6 -eq 'FAIL') { $verdict += 'C6' }
  $vtxt = if ($verdict.Count -eq 0) { 'ok' } else { ('FAIL ' + ($verdict -join ',')) }
  if ($FailOnly -and $verdict.Count -eq 0) { continue }
  Write-Output ('{0,-34} {1,6} {2,6} {3,6} {4,7} {5,6} {6}' -f $uid, $entry, $maxId, $declTxt, ($baseCount * 3), $concCount, $vtxt)
}

# ---------------------------------------------------------------- CHECK 8
# Accounting reconciliation (review ruling 12, 2026-08-21).
#   manifest problem_type_count  =  actual in-index total  +  truncation deficit
# When it does not close, the remainder is UNEXPLAINED and must be printed, not
# absorbed. The remainder is how the 2026-07-19 "+150 = worksheet item count"
# drift was found. Skipped when -Unit narrows the audit (partial totals).
if (-not $Unit) {
  Write-Output ''
  Write-Output '=== CHECK 8 : accounting reconciliation ==='
  $declTotal = 0
  if (Test-Path $mf) {
    $mraw2 = Get-Content $mf -Raw -Encoding UTF8
    $mm = [regex]::Match($mraw2, '"problem_type_count"\s*:\s*(\d+)')
    if ($mm.Success) { $declTotal = [int]$mm.Groups[1].Value } else { Add-Warn 'manifest.json has no problem_type_count - CHECK 8 incomplete' }
  }
  $inIndex = @{}
  if ($idx) { foreach ($u in @($idx.units)) { $inIndex[[string]$u.unit_id] = $true } }
  $actual = 0; $counted = 0; $skipped = 0
  foreach ($f in $files) {
    $j2 = Read-Json $f.FullName
    if ($null -eq $j2) { continue }
    $uid2 = [string]$j2.unit_id
    if ($inIndex.ContainsKey($uid2)) { $actual += @($j2.problem_types).Count; $counted++ }
    else { $skipped++; Add-Warn ($uid2 + ": catalog file exists but unit is not in index.v1.json - excluded from CHECK 8 total") }
  }
  Write-Output ('  manifest declared total      : ' + $declTotal)
  Write-Output ('  actual in-index total        : ' + $actual + '  (' + $counted + ' unit files; ' + $skipped + ' excluded)')
  Write-Output ('  truncation deficit (sum)     : ' + $sum.deficit)
  $unexplained = $declTotal - $actual - $sum.deficit
  Write-Output ('  unexplained remainder        : ' + $unexplained)
  if ($declTotal -eq 0) {
    Write-Output '  result: SKIPPED (no declared total)'
  } elseif ($unexplained -eq 0) {
    Write-Output '  result: CLOSES - declared = actual + deficit'
  } else {
    Write-Output '  result: DOES NOT CLOSE - remainder is unaccounted for, do not absorb it'
    Add-Warn ('CHECK 8: accounting does not close, remainder ' + $unexplained)
  }
}

# ---------------------------------------------------------------- CHECK 9
# PowerShell array-member contamination (review ruling 21 section 7, 2026-08-21).
#   Accessing .Property on an ARRAY in PowerShell enumerates the array's own members.
#   When that result is serialized, the member NAMES land in the data as if they were
#   values. It produces valid JSON and passes every parse, so nothing catches it.
#   Found 2026-08-21 in m2_similarity_pythagoras representation_types: 66 entries x 8.
# The check is built BEFORE the repair on purpose - a repair with no detector cannot be
# shown to have worked.
$PS_MEMBERS = @('Count', 'IsFixedSize', 'IsReadOnly', 'IsSynchronized', 'Length', 'LongLength', 'Rank', 'SyncRoot')
Write-Output ''
Write-Output '=== CHECK 9 : PowerShell array-member contamination ==='
$c9any = $false
foreach ($f in $files) {
  $j9 = Read-Json $f.FullName
  if ($null -eq $j9) { continue }
  $uid9 = [string]$j9.unit_id
  if ($Unit -and $uid9 -ne $Unit) { continue }
  $hit = @{}
  foreach ($e in @($j9.problem_types)) {
    foreach ($p in $e.PSObject.Properties) {
      $v = $p.Value
      if ($null -eq $v) { continue }
      if ($v -is [string]) { continue }
      foreach ($el in @($v)) {
        if ($el -isnot [string]) { continue }
        # -ccontains, NOT -contains. PowerShell's default comparison is case-INSENSITIVE,
        # and response_formats legitimately holds lowercase "count" and "length". Using
        # -contains reported 2 false positives on the first run (review-handoff section 7:
        # the checker is the thing that is wrong, not the data).
        if ($PS_MEMBERS -ccontains $el) {
          if (-not $hit.ContainsKey($p.Name)) { $hit[$p.Name] = 0 }
          $hit[$p.Name]++
        }
      }
    }
  }
  if ($hit.Count -gt 0) {
    $c9any = $true
    $sum.c9++
    foreach ($k in ($hit.Keys | Sort-Object)) {
      Write-Output ('  FAIL ' + $uid9 + '  field ' + $k + '  contaminated elements ' + $hit[$k])
      Add-Warn ($uid9 + ': field ' + $k + ' carries ' + $hit[$k] + ' PowerShell array-member name(s) as values (CHECK 9)')
    }
  }
}
if (-not $c9any) { Write-Output '  result: 0 contaminated fields' }

# ---------------------------------------------------------------- CHECK 10
# Catalog vs catalog_short drift (review ruling 21 section 5, 2026-08-21).
#   The short projection is regenerated by hand, so it silently freezes at the count it
#   had when it was last built. Found 2026-08-21: catalog said 91, short still said 87.
#   Most incidents in this project are "the declaration and the thing disagreed and
#   nobody noticed", so the two counts are compared every run.
Write-Output ''
Write-Output '=== CHECK 10 : catalog entries vs catalog_short count ==='
$shortDir = Join-Path $data 'problem_types_short'
if (-not (Test-Path $shortDir)) {
  Write-Output '  result: SKIPPED (no problem_types_short dir)'
  Add-Warn 'CHECK 10: problem_types_short dir not found - check skipped, not passed'
} else {
  # units not registered in index.v1.json are N/A: make_catalog_short.ps1 walks the index,
  # so a file outside it is not expected to have a short projection at all. Reporting it
  # as MISSING made an out-of-index platform view (M2_SIMILARITY, the mathflat 81 view)
  # look like a defect. Review ruling 22 section 3 / restated in ruling 23 section 6.
  $inIdx10 = @{}
  if ($idx) { foreach ($u in @($idx.units)) { $inIdx10[[string]$u.unit_id] = $true } }
  $c10any = $false
  $c10na = 0
  foreach ($f in $files) {
    $j10 = Read-Json $f.FullName
    if ($null -eq $j10) { continue }
    $uid10 = [string]$j10.unit_id
    if ($Unit -and $uid10 -ne $Unit) { continue }
    $entry10 = @($j10.problem_types).Count
    if (-not $inIdx10.ContainsKey($uid10)) {
      Write-Output ('  n/a     ' + $uid10 + '  catalog ' + $entry10 + '  (not in index.v1.json - no short expected)')
      $c10na++
      continue
    }
    $sp = Join-Path $shortDir ($uid10 + '.catalog_short.v1.json')
    if (-not (Test-Path $sp)) {
      Write-Output ('  MISSING ' + $uid10 + '  catalog ' + $entry10 + '  short (no file)')
      Add-Warn ($uid10 + ': in index.v1.json but has no catalog_short file (CHECK 10 - not counted as pass)')
      $sum.c10++
      $c10any = $true
      continue
    }
    $js = Read-Json $sp
    if ($null -eq $js) { Add-Warn ($uid10 + ': catalog_short unreadable (CHECK 10)'); $c10any = $true; continue }
    $declShort = -1
    if ($null -ne $js.count) { $declShort = [int]$js.count }
    $realShort = @($js.types).Count
    if ($declShort -ne $realShort) {
      Write-Output ('  FAIL ' + $uid10 + '  short count field ' + $declShort + ' != short types ' + $realShort)
      Add-Warn ($uid10 + ': catalog_short count field disagrees with its own types array (CHECK 10)')
      $sum.c10++
      $c10any = $true
    }
    if ($realShort -ne $entry10) {
      Write-Output ('  FAIL ' + $uid10 + '  catalog ' + $entry10 + '  short ' + $realShort + '  -> STALE, regenerate with make_catalog_short.ps1')
      Add-Warn ($uid10 + ': catalog ' + $entry10 + ' vs catalog_short ' + $realShort + ' (CHECK 10)')
      $sum.c10++
      $c10any = $true
    }
  }
  if (-not $c10any) { Write-Output '  result: catalog and short agree for every unit checked' }
  if ($c10na -gt 0) { Write-Output ('  n/a (out of index) : ' + $c10na + ' unit(s) - reported, not skipped silently') }
}

Write-Output ''
Write-Output ('=== SUMMARY : units audited ' + $sum.units + ' ===')
Write-Output ('  CHECK 2 declared-count mismatch : ' + $sum.c2)
Write-Output ('  CHECK 3 declared not /3         : ' + $sum.c3)
Write-Output ('  CHECK 4 concept 1:1 broken      : ' + $sum.c4)
Write-Output ('  CHECK 5 truncated (maxId>entry) : ' + $sum.c5)
Write-Output ('  CHECK 6 slot integrity broken   : ' + $sum.c6)
Write-Output ('  CHECK 7 concept/slot number bad : ' + $sum.c7)
Write-Output ('  CHECK 9  array-member contamination : ' + $sum.c9 + ' unit(s)')
Write-Output ('  CHECK 10 catalog/short drift        : ' + $sum.c10)
Write-Output ('  slot scheme NOT applicable (4/6 n/a) : ' + $sum.na)
Write-Output ''
Write-Output ('=== WARNINGS (' + $warn.Count + ') - nothing was skipped silently ===')
foreach ($w in $warn) { Write-Output ('  [WARN] ' + $w) }
