param(
  [Parameter(Mandatory=$true)][string]$Path,
  [int]$MaxRows = 0,
  [switch]$ListSheets
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-SiText($si) {
  # A shared-string item is either <t>text</t> or a sequence of <r><t>..</t></r> runs.
  $sb = New-Object System.Text.StringBuilder
  foreach ($child in $si.ChildNodes) {
    if ($child.LocalName -eq 't') { [void]$sb.Append($child.InnerText) }
    elseif ($child.LocalName -eq 'r') {
      foreach ($rc in $child.ChildNodes) {
        if ($rc.LocalName -eq 't') { [void]$sb.Append($rc.InnerText) }
      }
    }
  }
  $sb.ToString()
}

function Get-EntryXml($zip, $name) {
  $e = $zip.Entries | Where-Object { $_.FullName -eq $name }
  if (-not $e) { return $null }
  $sr = New-Object System.IO.StreamReader($e.Open(), [System.Text.Encoding]::UTF8)
  $text = $sr.ReadToEnd()
  $sr.Close()
  $x = New-Object System.Xml.XmlDocument
  $x.LoadXml($text)
  $x
}

# Column letters -> zero-based index (A->0, AB->27)
function Get-ColIndex([string]$ref) {
  $letters = ($ref -replace '\d','')
  $n = 0
  foreach ($ch in $letters.ToCharArray()) { $n = $n * 26 + ([int][char]$ch - 64) }
  $n - 1
}

$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $Path))
try {
  $wb = Get-EntryXml $zip 'xl/workbook.xml'
  $sheetNames = @()
  foreach ($s in $wb.DocumentElement.SelectNodes('*[local-name()="sheets"]/*[local-name()="sheet"]')) {
    $sheetNames += $s.GetAttribute('name')
  }

  if ($ListSheets) {
    for ($i = 0; $i -lt $sheetNames.Count; $i++) { "sheet$($i+1): $($sheetNames[$i])" }
    return
  }

  # shared strings
  $shared = @()
  $ss = Get-EntryXml $zip 'xl/sharedStrings.xml'
  if ($ss) {
    foreach ($si in $ss.DocumentElement.SelectNodes('*[local-name()="si"]')) {
      $shared += (Get-SiText $si)
    }
  }

  for ($sIdx = 1; $sIdx -le $sheetNames.Count; $sIdx++) {
    $sheet = Get-EntryXml $zip "xl/worksheets/sheet$sIdx.xml"
    if (-not $sheet) { continue }
    "===== SHEET $sIdx : $($sheetNames[$sIdx-1]) ====="
    $rows = $sheet.DocumentElement.SelectNodes('*[local-name()="sheetData"]/*[local-name()="row"]')
    $count = 0
    foreach ($row in $rows) {
      $cells = @{}
      $maxCol = -1
      foreach ($c in $row.SelectNodes('*[local-name()="c"]')) {
        $ref = $c.GetAttribute('r')
        $ci = if ($ref) { Get-ColIndex $ref } else { $maxCol + 1 }
        $t = $c.GetAttribute('t')
        $val = ''
        if ($t -eq 'inlineStr') {
          $isNode = $c.SelectSingleNode('*[local-name()="is"]')
          if ($isNode) { $val = Get-SiText $isNode }
        } else {
          $v = $c.SelectSingleNode('*[local-name()="v"]')
          if ($v) {
            if ($t -eq 's') { $val = $shared[[int]$v.InnerText] }
            else { $val = $v.InnerText }
          }
        }
        $cells[$ci] = ($val -replace '\r?\n', ' / ')
        if ($ci -gt $maxCol) { $maxCol = $ci }
      }
      $line = @()
      for ($i = 0; $i -le $maxCol; $i++) { $line += ($cells[$i]) }
      "$($row.GetAttribute('r'))`t" + ($line -join "`t")
      $count++
      if ($MaxRows -gt 0 -and $count -ge $MaxRows) { "... (truncated at $MaxRows rows; total rows in sheet: $($rows.Count))"; break }
    }
    "----- rows: $($rows.Count) -----"
  }
}
finally { $zip.Dispose() }
