# ASCII ONLY (standing rule). Identify which worksheet set each D1 bulk batch is.
#
# WHY THIS EXISTS (review ruling 14/15/16, 2026-08-21):
#   The repo declares nine worksheet sets; D1 holds eight bulk batches. Only two sets
#   are anchored (set04, set09 - hash + 150/150 content). Pairing the rest by file
#   name or by batch number is a guess, and a wrong pairing makes every downstream
#   comparison meaningless. So pair them by CONTENT.
#
# METHOD
#   For every (batch, set) pair, walk question_no 1..150 and score
#     Jaccard( char-bigrams of the D1 type-candidate hint ,
#              char-bigrams of the PDF header label at the same question_no )
#   The mean over the 150 questions is the pair score. A batch that really is a set
#   scores far above its runners-up because the hint describes that very problem.
#
# DECISION (fail closed)
#   A pairing is ACCEPTED only when
#     best mean  >= -MinScore            (the match is substantive at all)
#     best / second-best >= -MinRatio    (it is clearly better than the alternative)
#     the winning set is not already taken by a different batch
#   Anything else is reported UNRESOLVED. The tool never guesses.
#
# USAGE
#   powershell -File tools\axis_prediction\identify_batch_to_set.ps1 -D1 <tsv> -Headers <csv>

param(
  [Parameter(Mandatory=$true)][string]$D1,
  [Parameter(Mandatory=$true)][string]$Headers,
  [string]$ItemBankDir = 'C:\Users\user\projects\scshstudy\public\math-weakness-engine\data\source_item_bank\m2_similarity_pythagoras',
  [double]$MinScore = 0.45,
  [double]$MinRatio = 1.15,
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

foreach ($p in @($D1, $Headers)) { if (-not (Test-Path $p)) { throw ('input not found: ' + $p) } }

$rows = @(Import-Csv -Path $D1 -Delimiter "`t" -Encoding UTF8)
if ($rows.Count -eq 0) { throw ('REFUSED: no rows in ' + $D1) }
$cols = @($rows[0].PSObject.Properties.Name)
foreach ($need in @('bulk_batch_id', 'question_no', 'source_note')) {
  if ($cols -notcontains $need) { throw ('REFUSED: required column missing: ' + $need + ' (found: ' + ($cols -join ', ') + ')') }
}
$hdr = @(Import-Csv -Path $Headers -Encoding UTF8)
foreach ($need in @('set_declared', 'question_no', 'source_type_label')) {
  if (@($hdr[0].PSObject.Properties.Name) -notcontains $need) { throw ('REFUSED: headers file missing column: ' + $need) }
}

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

# D1: batch -> question_no -> hint bigrams
$hintPrefix = '^' + ([char]0xC720).ToString() + ([char]0xD615).ToString() + ([char]0xD6C4).ToString() + ([char]0xBCF4).ToString() + '\s*:\s*'
$batches = @{}
foreach ($r in $rows) {
  $b = [string]$r.bulk_batch_id
  $q = 0; if (-not [int]::TryParse(([string]$r.question_no), [ref]$q)) { continue }
  $keep = @()
  foreach ($seg in (([string]$r.source_note) -split '\|')) {
    $s = $seg.Trim()
    if ($s -match $hintPrefix) { $keep += ($s -replace $hintPrefix, '') }
  }
  if ($keep.Count -eq 0) { continue }
  if (-not $batches.ContainsKey($b)) { $batches[$b] = @{} }
  $batches[$b][$q] = Get-Bigrams ($keep -join ' ')
}

# PDF: set -> question_no -> label bigrams
$sets = @{}
foreach ($h in $hdr) {
  $s = [string]$h.set_declared
  $q = [int]$h.question_no
  if (-not $sets.ContainsKey($s)) { $sets[$s] = @{} }
  $sets[$s][$q] = Get-Bigrams ([string]$h.source_type_label)
}

$bKeys = @($batches.Keys | Sort-Object)
$sKeys = @($sets.Keys | Sort-Object)
Write-Output ('[in ] batches=' + $bKeys.Count + '  sets=' + $sKeys.Count)

$out = New-Object System.Collections.ArrayList
function Emit($s) { Write-Output $s; [void]$out.Add($s) }

# ------------------------------------------------- score matrix
$score = @{}
foreach ($b in $bKeys) {
  foreach ($s in $sKeys) {
    $sum = 0.0; $n = 0
    foreach ($q in $batches[$b].Keys) {
      if (-not $sets[$s].ContainsKey($q)) { continue }
      $sum += (Jac $batches[$b][$q] $sets[$s][$q]); $n++
    }
    $score[($b + '|' + $s)] = if ($n -gt 0) { $sum / $n } else { 0.0 }
  }
}

Emit ''
Emit '=== MEAN HINT-vs-LABEL SCORE (rows = D1 batch, cols = declared set) ==='
$head = '{0,-32}' -f 'batch'
foreach ($s in $sKeys) { $head += ('{0,7}' -f $s) }
Emit $head
foreach ($b in $bKeys) {
  $line = '{0,-32}' -f $b
  foreach ($s in $sKeys) { $line += ('{0,7}' -f [math]::Round($score[($b + '|' + $s)], 3)) }
  Emit $line
}

# ------------------------------------------------- per-question vote
# The mean score is diluted: a hint is a long sentence, a label is a short phrase, so
# bigram Jaccard sits near 0.09 even for the right pair. Asking WHICH set wins each
# single question is far sharper - a wrong pairing cannot win most of 150 questions.
Emit ''
Emit '=== PER-QUESTION VOTE (share of 150 questions won by each set) ==='
$head2 = '{0,-32}' -f 'batch'
foreach ($s in $sKeys) { $head2 += ('{0,7}' -f $s) }
Emit $head2
$vote = @{}
foreach ($b in $bKeys) {
  $tally = @{}
  foreach ($s in $sKeys) { $tally[$s] = 0 }
  $qn = 0
  foreach ($q in $batches[$b].Keys) {
    $bs = ''; $bvq = -1.0
    foreach ($s in $sKeys) {
      if (-not $sets[$s].ContainsKey($q)) { continue }
      $v = Jac $batches[$b][$q] $sets[$s][$q]
      if ($v -gt $bvq) { $bvq = $v; $bs = $s }
    }
    if ($bs -ne '') { $tally[$bs]++; $qn++ }
  }
  $line = '{0,-32}' -f $b
  foreach ($s in $sKeys) {
    $sh = if ($qn -gt 0) { $tally[$s] / $qn } else { 0.0 }
    $vote[($b + '|' + $s)] = $sh
    $line += ('{0,7}' -f [math]::Round($sh, 3))
  }
  Emit $line
}

# ------------------------------------------------- categorical slot agreement
# Sharpest of the three. Both sides are reduced to a SLOT number, so the comparison is
# categorical instead of fuzzy:
#   PDF label -> slot   via the label->PT mapping already attested by the ingested items
#   D1 problem_type_id -> slot
# A correct pairing agrees on most questions; a wrong one cannot. The residual
# disagreement on the correct pairing is exactly the misassignment we are hunting.
$lab2slot = @{}
if (Test-Path $ItemBankDir) {
  foreach ($f in (Get-ChildItem $ItemBankDir -Filter '*.source_items.v1.json')) {
    $j = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($it in @($j.items)) {
      $l = ([string]$it.normalized_statement_features.source_type_label) -replace '\s', ''
      if ([string]$it.primary_problem_type_id -match 'PT(\d+)$') {
        $lab2slot[$l] = [int][math]::Ceiling([int]$matches[1] / 3.0)
      }
    }
  }
}
$agree = @{}
if ($lab2slot.Count -eq 0) {
  Emit ''
  Emit '[WARN] no label->slot mapping available - categorical panel skipped, decision falls back to vote'
} else {
  $setExp = @{}
  foreach ($h in $hdr) {
    $s = [string]$h.set_declared; $q = [int]$h.question_no
    $l = ([string]$h.source_type_label) -replace '\s', ''
    if (-not $setExp.ContainsKey($s)) { $setExp[$s] = @{} }
    if ($lab2slot.ContainsKey($l)) { $setExp[$s][$q] = $lab2slot[$l] }
  }
  $batAsg = @{}
  foreach ($r in $rows) {
    $b = [string]$r.bulk_batch_id; $q = 0
    if (-not [int]::TryParse(([string]$r.question_no), [ref]$q)) { continue }
    if (-not $batAsg.ContainsKey($b)) { $batAsg[$b] = @{} }
    if ([string]$r.problem_type_id -match 'PT(\d+)$') { $batAsg[$b][$q] = [int][math]::Ceiling([int]$matches[1] / 3.0) }
  }
  Emit ''
  Emit ('=== CATEGORICAL SLOT AGREEMENT (label->slot map covers ' + $lab2slot.Count + ' labels) ===')
  $head3 = '{0,-32}' -f 'batch'
  foreach ($s in $sKeys) { $head3 += ('{0,7}' -f $s) }
  Emit $head3
  foreach ($b in $bKeys) {
    $line = '{0,-32}' -f $b
    foreach ($s in $sKeys) {
      $ok = 0; $n = 0
      if ($batAsg.ContainsKey($b) -and $setExp.ContainsKey($s)) {
        foreach ($q in $batAsg[$b].Keys) {
          if (-not $setExp[$s].ContainsKey($q)) { continue }
          $n++
          if ($setExp[$s][$q] -eq $batAsg[$b][$q]) { $ok++ }
        }
      }
      $v = if ($n -gt 0) { $ok / $n } else { 0.0 }
      $agree[($b + '|' + $s)] = $v
      $line += ('{0,7}' -f [math]::Round($v, 3))
    }
    Emit $line
  }
}

# ------------------------------------------------- decide
Emit ''
Emit '=== PAIRING ==='
$taken = @{}
$decided = @{}
$order = @()
foreach ($b in $bKeys) {
  $best = ''; $bv = -1.0; $second = -1.0
  foreach ($s in $sKeys) {
    # decide on the CATEGORICAL agreement when it is available (sharpest), else the vote
    $v = if ($agree.Count -gt 0) { $agree[($b + '|' + $s)] } else { $vote[($b + '|' + $s)] }
    if ($v -gt $bv) { $second = $bv; $bv = $v; $best = $s }
    elseif ($v -gt $second) { $second = $v }
  }
  $order += [pscustomobject]@{ b = $b; best = $best; bv = $bv; second = $second }
}
foreach ($o in ($order | Sort-Object { - $_.bv })) {
  $ratio = if ($o.second -gt 0) { $o.bv / $o.second } else { 99.0 }
  $why = ''
  if ($o.bv -lt $MinScore) { $why = 'score below floor' }
  elseif ($ratio -lt $MinRatio) { $why = 'runner-up too close' }
  elseif ($taken.ContainsKey($o.best)) { $why = ('set already taken by ' + $taken[$o.best]) }
  if ($why -eq '') {
    $taken[$o.best] = $o.b
    $decided[$o.b] = $o.best
    Emit ('  ACCEPT     {0}  ->  {1}   score {2}  runner-up {3}  ratio {4}' -f $o.b, $o.best, [math]::Round($o.bv,3), [math]::Round($o.second,3), [math]::Round($ratio,2))
  } else {
    Emit ('  UNRESOLVED {0}  ->  ({1})  score {2}  runner-up {3}  ratio {4}   [{5}]' -f $o.b, $o.best, [math]::Round($o.bv,3), [math]::Round($o.second,3), [math]::Round($ratio,2), $why)
  }
}
$unmatched = @($sKeys | Where-Object { -not $taken.ContainsKey($_) })
Emit ''
Emit ('  accepted ' + $decided.Count + ' / ' + $bKeys.Count + ' batches')
Emit ('  sets with no batch: ' + ($unmatched -join ', '))
Emit ('  thresholds: MinScore=' + $MinScore + ' MinRatio=' + $MinRatio)

if ($ReportPath -ne '') {
  [System.IO.File]::WriteAllText($ReportPath, (($out -join "`r`n") + "`r`n"), (New-Object System.Text.UTF8Encoding($false)))
  Write-Output ('[report] ' + $ReportPath)
}
