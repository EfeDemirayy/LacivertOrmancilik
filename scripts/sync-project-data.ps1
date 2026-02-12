param(
  [string]$ExcelPath = 'C:\Users\emirh.DESKTOP-0JGKFTV\Downloads\LACİVERT DOSYA (1).xlsx',
  [string]$OutputPath = (Join-Path $PSScriptRoot '..\js\proje-kayitlari.js')
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ExcelPath)) {
  throw "Excel dosyasi bulunamadi: $ExcelPath"
}

$excel = $null
$workbook = $null
$records = New-Object System.Collections.Generic.List[object]

function Normalize-Header([string]$value) {
  if ($null -eq $value) {
    $text = ''
  } else {
    $text = $value
  }
  $text = $text.Trim().ToUpperInvariant()
  $text = $text -replace 'İ','I'
  $text = $text -replace 'Ş','S'
  $text = $text -replace 'Ğ','G'
  $text = $text -replace 'Ü','U'
  $text = $text -replace 'Ö','O'
  $text = $text -replace 'Ç','C'
  return $text
}

try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $workbook = $excel.Workbooks.Open($ExcelPath)

  foreach ($sheet in $workbook.Worksheets) {
    $sheetName = [string]$sheet.Name
    if ($sheetName -notmatch '^\d{4}$') {
      [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($sheet)
      continue
    }

    $headerMap = @{}
    for ($col = 1; $col -le 40; $col++) {
      $headerRaw = [string]$sheet.Cells.Item(1, $col).Text
      $header = Normalize-Header $headerRaw

      switch ($header) {
        'TARIH' { $headerMap['tarih'] = $col }
        'FIRMA' { $headerMap['firma'] = $col }
        'KONUSU' { $headerMap['konu'] = $col }
        'KONU' { if (-not $headerMap.ContainsKey('konu')) { $headerMap['konu'] = $col } }
        'MADDE' { $headerMap['madde'] = $col }
        'GRUP' { $headerMap['grup'] = $col }
      }
    }

    $required = @('tarih', 'firma', 'konu', 'madde', 'grup')
    $missing = $required | Where-Object { -not $headerMap.ContainsKey($_) }
    if ($missing.Count -gt 0) {
      [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($sheet)
      continue
    }

    $usedRange = $sheet.UsedRange
    $rowCount = $usedRange.Rows.Count
    $order = 0

    for ($row = 2; $row -le $rowCount; $row++) {
      $tarih = ([string]$sheet.Cells.Item($row, $headerMap['tarih']).Text).Trim()
      $firma = ([string]$sheet.Cells.Item($row, $headerMap['firma']).Text).Trim()
      $konu = ([string]$sheet.Cells.Item($row, $headerMap['konu']).Text).Trim()
      $madde = ([string]$sheet.Cells.Item($row, $headerMap['madde']).Text).Trim()
      $grup = ([string]$sheet.Cells.Item($row, $headerMap['grup']).Text).Trim()

      if ([string]::IsNullOrWhiteSpace($firma)) {
        continue
      }

      $order++
      $records.Add([pscustomobject]@{
        yil = [int]$sheetName
        sira = $order
        tarih = $tarih
        firma = $firma
        konu = $konu
        madde = $madde
        grup = $grup
      })
    }

    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($usedRange)
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($sheet)
  }
}
finally {
  if ($workbook) {
    $workbook.Close($false)
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($workbook)
  }
  if ($excel) {
    $excel.Quit()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

$json = $records | ConvertTo-Json -Depth 4
$content = "window.PROJE_KAYITLARI = $json;`n"

$outputFull = (Resolve-Path (Split-Path -Parent $OutputPath)).Path + [IO.Path]::DirectorySeparatorChar + (Split-Path -Leaf $OutputPath)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outputFull, $content, $utf8NoBom)

$yearSummary = $records | Group-Object yil | Sort-Object Name | ForEach-Object { "{0}:{1}" -f $_.Name, $_.Count }
Write-Output "Rows exported: $($records.Count)"
Write-Output "Year summary: $($yearSummary -join ', ')"
