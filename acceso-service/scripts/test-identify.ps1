<#
.SYNOPSIS
  Prueba el servicio sin lector de huellas, usando las muestras ya capturadas.

.DESCRIPTION
  docs/samples/*.txt son capturas reales del Web SDK guardadas en su momento en las notas
  (docs/websdk-notas.js). Mandarlas a /api/identify es exactamente lo que hará el navegador,
  así que sirven para probar todo el camino sin hardware.

.EXAMPLE
  .\test-identify.ps1
  .\test-identify.ps1 -SampleFile ..\docs\samples\intermediate-3.txt
#>
param(
  [string]$BaseUrl = "http://localhost:8080",
  [string]$SampleFile
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

if (-not $SampleFile) {
  $SampleFile = Join-Path $root "docs\samples\intermediate-1.txt"
} elseif (-not [System.IO.Path]::IsPathRooted($SampleFile)) {
  $SampleFile = Join-Path $root $SampleFile
}

if (-not (Test-Path $SampleFile)) {
  Write-Error "No existe la muestra: $SampleFile"
  exit 1
}

Write-Host "== GET $BaseUrl/api/health ==" -ForegroundColor Cyan
try {
  Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method Get | ConvertTo-Json -Depth 5
} catch {
  Write-Error "El servicio no responde en $BaseUrl. ¿Corriste run-dev.ps1?"
  exit 1
}

$fingerprint = (Get-Content $SampleFile -Raw).Trim()
$body = @{ fingerprint = $fingerprint } | ConvertTo-Json

Write-Host ""
Write-Host "== POST $BaseUrl/api/identify ==" -ForegroundColor Cyan
Write-Host "muestra: $(Split-Path -Leaf $SampleFile) ($($fingerprint.Length) chars base64url)" -ForegroundColor DarkGray

try {
  $res = Invoke-RestMethod -Uri "$BaseUrl/api/identify" -Method Post `
    -ContentType "application/json" -Body $body
  $res | ConvertTo-Json -Depth 5

  if ($null -eq $res.socio) {
    Write-Host ""
    Write-Host "socio = null: no hubo match." -ForegroundColor Yellow
    Write-Host "Es lo esperado si la cache esta vacia, o si esa huella no esta enrolada." -ForegroundColor DarkGray
  } else {
    Write-Host ""
    Write-Host "MATCH -> socio $($res.socio)" -ForegroundColor Green
  }
} catch {
  Write-Host ($_.ErrorDetails.Message) -ForegroundColor Red
}

Write-Host ""
Write-Host "== POST $BaseUrl/api/turnstile/open ==" -ForegroundColor Cyan
try {
  Invoke-RestMethod -Uri "$BaseUrl/api/turnstile/open" -Method Post | ConvertTo-Json
} catch {
  Write-Host ($_.ErrorDetails.Message) -ForegroundColor Red
}
