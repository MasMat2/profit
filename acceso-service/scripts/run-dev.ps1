<#
.SYNOPSIS
  Arranca acceso-service en modo desarrollo, con el SDK y sus librerías nativas en su lugar.

.DESCRIPTION
  Dos cosas que hay que acertar para que arranque:
    - dpuareu.jar en el classpath (es la única dependencia externa).
    - java.library.path apuntando a las DLL nativas, o revienta con UnsatisfiedLinkError
      al primer uso del SDK.

  No hace falta lector ni torniquete: el torniquete viene deshabilitado por defecto y las
  huellas se prueban con los archivos de docs/samples/.

.EXAMPLE
  .\scripts\run-dev.ps1
  .\scripts\run-dev.ps1 -Probe -SampleFile docs\samples\intermediate-1.txt
#>
param(
  [string]$SdkHome = "C:\Program Files\DigitalPersona\U.are.U SDK\Windows",
  [string]$ApiUrl,
  [string]$ApiKey,

  # Modo diagnóstico de formatos en vez de levantar el servicio
  [switch]$Probe,
  [string]$SampleFile,
  [string]$TemplateFile
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root

try {
  $appJar = Join-Path $root "build\acceso-service.jar"
  $sdkJar = Join-Path $SdkHome "Lib\Java\dpuareu.jar"
  $native = Join-Path $SdkHome "Lib\x64"

  if (-not (Test-Path $appJar)) {
    Write-Error "No existe $appJar. Corre .\build.ps1 primero."
    exit 1
  }
  if (-not (Test-Path $sdkJar)) {
    Write-Error "No existe $sdkJar. ¿Está instalado el U.are.U SDK?"
    exit 1
  }

  $jvmArgs = @(
    "-cp", "$appJar;$sdkJar",
    "-Djava.library.path=$native",
    "--enable-native-access=ALL-UNNAMED"
  )

  $appArgs = @()

  if ($Probe) {
    $appArgs += "--probe"
    if ($SampleFile)   { $appArgs += "--sample-file=$SampleFile" }
    if ($TemplateFile) { $appArgs += "--template-file=$TemplateFile" }
  } else {
    if ($ApiUrl) { $env:ACCESO_API_URL = $ApiUrl }
    if ($ApiKey) { $env:ACCESO_API_KEY = $ApiKey }

    Write-Host "acceso-service -> http://localhost:8080" -ForegroundColor Cyan
    Write-Host "API de templates: $(if ($env:ACCESO_API_URL) { $env:ACCESO_API_URL } else { 'http://localhost:3000 (por omisión)' })" -ForegroundColor DarkGray
    if (-not $env:ACCESO_API_KEY) {
      Write-Warning "Sin ACCESO_API_KEY: la descarga de templates fallará con 401."
    }
    Write-Host "Prueba con: .\scripts\test-identify.ps1" -ForegroundColor DarkGray
    Write-Host ""
  }

  & java @jvmArgs com.profit.acceso.Main @appArgs
}
finally {
  Pop-Location
}
