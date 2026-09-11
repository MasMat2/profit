<#
.SYNOPSIS
  Compila acceso-service. Sin Maven ni Gradle: javac + jar.

.DESCRIPTION
  La unica dependencia externa es dpuareu.jar, que ya viene con el U.are.U SDK instalado en la
  maquina. No se copia al proyecto: se referencia por ruta, la misma que necesita en tiempo de
  ejecucion para cargar sus DLL nativas.

.EXAMPLE
  .\build.ps1
  .\build.ps1 -SdkHome "D:\DigitalPersona\U.are.U SDK\Windows"
#>
param(
  [string]$SdkHome = "C:\Program Files\DigitalPersona\U.are.U SDK\Windows"
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$jar = Join-Path $SdkHome "Lib\Java\dpuareu.jar"
$classes = Join-Path $root "build\classes"
$salida = Join-Path $root "build\acceso-service.jar"

if (-not (Test-Path $jar)) {
  Write-Error @"
No se encontro dpuareu.jar en:
  $jar

Instala el U.are.U SDK de DigitalPersona, o pasa la ruta con:
  .\build.ps1 -SdkHome "<ruta>\U.are.U SDK\Windows"
"@
  exit 1
}

Write-Host "SDK:    $jar" -ForegroundColor DarkGray

if (Test-Path $classes) { Remove-Item -Recurse -Force $classes }
New-Item -ItemType Directory -Force -Path $classes | Out-Null

$fuentes = Get-ChildItem -Path (Join-Path $root "src") -Filter *.java -Recurse |
  ForEach-Object { $_.FullName }

Write-Host "Compilando $($fuentes.Count) archivos..." -ForegroundColor Cyan
# -serial: las excepciones de este servicio nunca se serializan, el warning solo hace ruido.
& javac -cp $jar -d $classes --release 17 -Xlint:all,-serial $fuentes
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Solo Main-Class: dpuareu.jar se pasa en el -cp al ejecutar (ver run-dev.ps1). El atributo
# Class-Path del manifiesto solo admite rutas relativas al jar, y el SDK vive en Program Files.
$manifest = Join-Path $root "build\MANIFEST.MF"
@"
Main-Class: com.profit.acceso.Main

"@ | Set-Content -Path $manifest -Encoding ascii

& jar --create --file $salida --manifest $manifest -C $classes .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "OK -> $salida" -ForegroundColor Green
Write-Host "Arrancar con: .\scripts\run-dev.ps1" -ForegroundColor DarkGray
