param(
  [string]$Url = 'http://127.0.0.1:5173/',
  [string]$Output = 'doc/parity-evidence/ui-check-lowres.png',
  [ValidateRange(160, 1280)][int]$Width = 480,
  [ValidateRange(90, 720)][int]$Height = 270,
  [ValidateRange(0, 30000)][int]$DelayMs = 1200
)

$ErrorActionPreference = 'Stop'
$chromeCandidates = @(
  'C:\Program Files\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
)
$chrome = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $chrome) {
  throw 'Google Chrome was not found in a standard installation path.'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$outputPath = if ([System.IO.Path]::IsPathRooted($Output)) {
  [System.IO.Path]::GetFullPath($Output)
} else {
  [System.IO.Path]::GetFullPath((Join-Path $repoRoot $Output))
}
$outputDirectory = Split-Path -Parent $outputPath
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

$profilePath = Join-Path ([System.IO.Path]::GetTempPath()) ('keynot-lowres-' + [guid]::NewGuid().ToString('N'))
try {
  & $chrome `
    '--headless=new' `
    '--hide-scrollbars' `
    '--disable-gpu' `
    "--user-data-dir=$profilePath" `
    "--window-size=$Width,$Height" `
    "--virtual-time-budget=$DelayMs" `
    "--screenshot=$outputPath" `
    $Url | Out-Null
  if (-not (Test-Path -LiteralPath $outputPath)) {
    throw "Chrome did not create the screenshot: $outputPath"
  }
  $file = Get-Item -LiteralPath $outputPath
  Write-Output "Captured $($file.FullName) ($Width x $Height, $($file.Length) bytes)"
}
finally {
  if (Test-Path -LiteralPath $profilePath) {
    $resolvedProfile = (Resolve-Path -LiteralPath $profilePath).Path
    $resolvedTemp = (Resolve-Path -LiteralPath ([System.IO.Path]::GetTempPath())).Path
    if ($resolvedProfile.StartsWith($resolvedTemp, [System.StringComparison]::OrdinalIgnoreCase)) {
      Remove-Item -LiteralPath $resolvedProfile -Recurse -Force
    }
  }
}
