# ASCII ONLY (standing rule). Compare each D1 item's ASSIGNED problem type against the
# type the worksheet itself printed above that problem.
#
# WHY THIS EXISTS (review ruling 15 section 5, path A promoted to primary, 2026-08-21):
#   Path B scored a free-text hint against a base name and produced HOLDs. Path A does
#   not need scoring at all: the worksheet prints the original type name per problem, and
#   that name maps to a canonical slot through the mapping the ingested items already
#   attest. So the comparison is CATEGORICAL:
#       expected slot  = PDF label -> canonical slot
#       assigned slot  = problem_type_id -> slot
#   Equal is fine. Different is a misassignment, and its severity is whether the two
#   slots belong to the same topic family.
#
# VERDICTS
#   OK        expected == assigned
#   CELL      different slot, SAME family        (neighbouring type, limited damage)
#   BASE      different slot, DIFFERENT family   (prescription misfires - the target)
#   NEWLABEL  the worksheet label has no canonical slot yet (one of the newly observed
#             types). Not a misassignment - it is a missing catalog entry.
#   NOID      the item carries no problem_type_id at all
#
# The tool ranks and lists candidates. It never edits data and never decides; every
# BASE row is a candidate for the review.
#
# USAGE
#   powershell -File tools\axis_prediction\compare_pdf_label_to_assignment.ps1 `
#     -D1 <tsv> -Headers <csv> -Pairing <csv> -SlotFamily <csv> -ReportPath out.txt
#   -Pairing is a two-column csv: bulk_batch_id,set_declared

param(
  [Parameter(Mandatory=$true)][string]$D1,
  [Parameter(Mandatory=$true)][string]$Headers,
  [Parameter(Mandatory=$true)][string]$Pairing,
  [string]$SlotFamily = '',
  [string]$ItemBankDir = 'C:\Users\user\projects\scshstudy\public\math-weakness-engine\data\source_item_bank\m2_similarity_pythagoras',
  [string]$Catalog = 'C:\Users\user\projects\scshstudy\public\math-weakness-engine\data\problem_types\m2_similarity_pythagoras.problem_types.v1.json',
  [string]$ReportPath = '',
  [string]$CandidateCsv = '',
  [double]$MinOkShare = 0.40
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

foreach ($p in @($D1, $Headers, $Pairing)) { if (-not (Test-Path $p)) { throw ('input not found: ' + $p) } }
if (-not (Test-Path $Catalog)) { throw ('catalog not found: ' + $Catalog) }

# ---------------- catalog: slot -> base name
$cat = Get-Content $Catalog -Raw -Encoding UTF8 | ConvertFrom-Json
if ($null -eq $cat.problem_types) { throw ('REFUSED: catalog has no problem_types: ' + $Catalog) }
$slotBase = @{}
foreach ($e in @($cat.problem_types)) {
  if ([string]$e.problem_type_id -notmatch 'PT(\d+)$') { continue }
  $s = [int][math]::Ceiling([int]$matches[1] / 3.0)
  $tn = [string]$e.type_name
  $i = $tn.LastIndexOf(' - ')
  if ($i -gt 0) { $tn = $tn.Substring(0, $i) }
  if ($slotBase.ContainsKey($s) -and $slotBase[$s] -ne $tn) {
    throw ('REFUSED: slot ' + $s + ' carries two base names - not the 3-cell slot scheme')
  }
  $slotBase[$s] = $tn
}

# ---------------- label -> slot, from the ingested items
$lab2slot = @{}
if (-not (Test-Path $ItemBankDir)) { throw ('item bank dir not found: ' + $ItemBankDir) }
foreach ($f in (Get-ChildItem $ItemBankDir -Filter '*.source_items.v1.json')) {
  $j = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($it in @($j.items)) {
    $l = ([string]$it.normalized_statement_features.source_type_label) -replace '\s', ''
    if ([string]$it.primary_problem_type_id -match 'PT(\d+)$') { $lab2slot[$l] = [int][math]::Ceiling([int]$matches[1] / 3.0) }
  }
}
if ($lab2slot.Count -eq 0) { throw 'REFUSED: label->slot mapping is empty - cannot compare' }

# ---------------- family
$famOf = @{}
if ($SlotFamily -ne '') {
  if (-not (Test-Path $SlotFamily)) { throw ('slot-family file not found: ' + $SlotFamily) }
  foreach ($fr in @(Import-Csv -Path $SlotFamily -Encoding UTF8)) {
    if (@($fr.PSObject.Properties.Name) -notcontains 'slot') { throw ('REFUSED: slot-family file has no slot column') }
    $famOf[[int]$fr.slot] = [string]$fr.family
  }
}

# ---------------- pairing
$pair = @{}
foreach ($r in @(Import-Csv -Path $Pairing -Encoding UTF8)) {
  foreach ($need in @('bulk_batch_id', 'set_declared')) {
    if (@($r.PSObject.Properties.Name) -notcontains $need) { throw ('REFUSED: pairing file missing column: ' + $need) }
  }
  $pair[[string]$r.bulk_batch_id] = [string]$r.set_declared
}
if ($pair.Count -eq 0) { throw 'REFUSED: pairing file has no rows' }

# ---------------- headers: set -> q -> label
$hdr = @(Import-Csv -Path $Headers -Encoding UTF8)
$setLbl = @{}
foreach ($h in $hdr) {
  $s = [string]$h.set_declared; $q = [int]$h.question_no
  if (-not $setLbl.ContainsKey($s)) { $setLbl[$s] = @{} }
  $setLbl[$s][$q] = [string]$h.source_type_label
}

# ---------------- walk D1
$rows = @(Import-Csv -Path $D1 -Delimiter "`t" -Encoding UTF8)
foreach ($need in @('bulk_batch_id', 'question_no', 'problem_type_id')) {
  if (@($rows[0].PSObject.Properties.Name) -notcontains $need) { throw ('REFUSED: required column missing: ' + $need) }
}
Write-Output ('[in ] d1=' + $rows.Count + '  headers=' + $hdr.Count + '  pairing=' + $pair.Count + '  label->slot=' + $lab2slot.Count)

$stat = @{ ok = 0; cell = 0; base = 0; newlabel = 0; noid = 0; unpaired = 0; noq = 0 }
$cand = New-Object System.Collections.ArrayList
foreach ($r in $rows) {
  $b = [string]$r.bulk_batch_id
  if (-not $pair.ContainsKey($b)) { $stat.unpaired++; continue }
  $set = $pair[$b]
  $q = 0
  if (-not [int]::TryParse(([string]$r.question_no), [ref]$q)) { $stat.noq++; continue }
  if (-not ($setLbl.ContainsKey($set) -and $setLbl[$set].ContainsKey($q))) { $stat.noq++; continue }
  $lbl = $setLbl[$set][$q]
  $key = $lbl -replace '\s', ''
  $ptid = [string]$r.problem_type_id
  if ($ptid.Trim() -eq '') {
    $stat.noid++
    [void]$cand.Add([pscustomobject]@{ v = 'NOID'; batch = $b; set = $set; q = $q; exp = 0; asg = 0; lbl = $lbl; fam = '' })
    continue
  }
  if ($ptid -notmatch 'PT(\d+)$') { $stat.noq++; continue }
  $asg = [int][math]::Ceiling([int]$matches[1] / 3.0)
  if (-not $lab2slot.ContainsKey($key)) {
    $stat.newlabel++
    [void]$cand.Add([pscustomobject]@{ v = 'NEWLABEL'; batch = $b; set = $set; q = $q; exp = 0; asg = $asg; lbl = $lbl; fam = '' })
    continue
  }
  $exp = $lab2slot[$key]
  if ($exp -eq $asg) { $stat.ok++; continue }
  $same = $false
  if ($famOf.Count -gt 0 -and $famOf.ContainsKey($exp) -and $famOf.ContainsKey($asg)) { $same = ($famOf[$exp] -eq $famOf[$asg] -and $famOf[$exp] -ne '') }
  if ($same) { $stat.cell++; $v = 'CELL' } else { $stat.base++; $v = 'BASE' }
  [void]$cand.Add([pscustomobject]@{ v = $v; batch = $b; set = $set; q = $q; exp = $exp; asg = $asg; lbl = $lbl; fam = $(if ($same) { 'same-family' } else { 'DIFF-family' }) })
}

$out = New-Object System.Collections.ArrayList
function Emit($s) { Write-Output $s; [void]$out.Add($s) }
$tot = $stat.ok + $stat.cell + $stat.base + $stat.newlabel + $stat.noid
Emit ''
Emit '=== SUMMARY ==='
Emit ('  compared          : ' + $tot)
Emit ('  OK                : ' + $stat.ok)
Emit ('  CELL same family  : ' + $stat.cell)
Emit ('  BASE diff family  : ' + $stat.base + '   <== candidates for review')
Emit ('  NEWLABEL          : ' + $stat.newlabel)
Emit ('  NOID              : ' + $stat.noid)
Emit ('  skipped unpaired  : ' + $stat.unpaired + '   no question/label : ' + $stat.noq)

# A WRONG pairing still produces a full, confident-looking candidate list - it just
# makes almost everything look misassigned. Guard on the OK share (tool-test 3).
$okShare = if ($tot -gt 0) { $stat.ok / $tot } else { 0.0 }
Emit ('  OK share          : ' + [math]::Round($okShare, 3))
if ($okShare -lt $MinOkShare) {
  Emit ''
  Emit ('  [GUARD] OK share ' + [math]::Round($okShare, 3) + ' < ' + $MinOkShare + ' - the batch/set PAIRING is probably wrong.')
  Emit '  [GUARD] Do NOT read the candidate list below as misassignments. Fix the pairing first.'
}

Emit ''
Emit '=== PER BATCH ==='
Emit ('{0,-32} {1,6} {2,6} {3,6} {4,8} {5,6}' -f 'batch', 'OK', 'CELL', 'BASE', 'NEWLBL', 'NOID')
foreach ($b in (@($pair.Keys) | Sort-Object)) {
  $sel = @($cand | Where-Object { $_.batch -eq $b })
  $o = @($rows | Where-Object { $_.bulk_batch_id -eq $b }).Count - $sel.Count
  Emit ('{0,-32} {1,6} {2,6} {3,6} {4,8} {5,6}' -f $b, $o,
    @($sel | Where-Object { $_.v -eq 'CELL' }).Count,
    @($sel | Where-Object { $_.v -eq 'BASE' }).Count,
    @($sel | Where-Object { $_.v -eq 'NEWLABEL' }).Count,
    @($sel | Where-Object { $_.v -eq 'NOID' }).Count)
}

foreach ($tag in @('BASE', 'NEWLABEL', 'NOID')) {
  $sel = @($cand | Where-Object { $_.v -eq $tag } | Sort-Object batch, q)
  if ($sel.Count -eq 0) { continue }
  Emit ''
  Emit ('=== ' + $tag + ' (' + $sel.Count + ') ===')
  foreach ($c in $sel) {
    $en = ''; $an = ''
    if ($c.exp -gt 0 -and $slotBase.ContainsKey([int]$c.exp)) { $en = $slotBase[[int]$c.exp] }
    if ($c.asg -gt 0 -and $slotBase.ContainsKey([int]$c.asg)) { $an = $slotBase[[int]$c.asg] }
    Emit ('  ' + $c.batch + '  q' + ('{0:D3}' -f $c.q) + '  slot ' + $c.asg + ' -> ' + $c.exp + '  ' + $c.fam)
    Emit ('      worksheet : ' + $c.lbl)
    if ($an -ne '') { Emit ('      assigned  : ' + $an) }
    if ($en -ne '') { Emit ('      expected  : ' + $en) }
  }
}

if ($CandidateCsv -ne '') {
  $L = New-Object System.Collections.ArrayList
  [void]$L.Add('verdict,bulk_batch_id,set_declared,question_no,assigned_slot,expected_slot,family,worksheet_label,assigned_base,expected_base')
  foreach ($c in ($cand | Sort-Object v, batch, q)) {
    $en = ''; $an = ''
    if ($c.exp -gt 0 -and $slotBase.ContainsKey([int]$c.exp)) { $en = $slotBase[[int]$c.exp] }
    if ($c.asg -gt 0 -and $slotBase.ContainsKey([int]$c.asg)) { $an = $slotBase[[int]$c.asg] }
    [void]$L.Add(('{0},{1},{2},{3:D3},{4},{5},{6},"{7}","{8}","{9}"' -f $c.v, $c.batch, $c.set, $c.q, $c.asg, $c.exp, $c.fam, ($c.lbl -replace '"', '""'), ($an -replace '"', '""'), ($en -replace '"', '""')))
  }
  [System.IO.File]::WriteAllText($CandidateCsv, (($L -join "`r`n") + "`r`n"), (New-Object System.Text.UTF8Encoding($false)))
  Write-Output ('[cand] ' + $CandidateCsv + '  rows=' + ($L.Count - 1))
}
if ($ReportPath -ne '') {
  [System.IO.File]::WriteAllText($ReportPath, (($out -join "`r`n") + "`r`n"), (New-Object System.Text.UTF8Encoding($false)))
  Write-Output ('[report] ' + $ReportPath)
}
