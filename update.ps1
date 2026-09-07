<#
.SYNOPSIS
  Actualiza las piezas del kiosco (API, web Angular, servicio Java) desde el repo.

.DESCRIPTION
  Automatiza lo que DESPLIEGUE.md describe a mano, respetando las dos cosas que ya se rompieron:

    - La app Angular SIEMPRE se compila con --configuration development. Un 'npm run build'
      a secas aplica el fileReplacements de angular.json y deja el kiosco apuntando a
      https://your-production-api.com. No falla en el build: falla en el kiosco, en silencio.

    - acceso-service depende de profit-api en el SCM, asi que reiniciar el API tumba el servicio
      Java y NO lo vuelve a levantar. Aqui se levanta explicitamente al final.

  Los reinicios necesitan PowerShell elevado. -Web y -Estado no, porque web-server.js lee del
  disco en cada peticion y no hay nada que reiniciar.

.EXAMPLE
  .\update.ps1 -Estado
  .\update.ps1 -Web
  .\update.ps1 -Api
  .\update.ps1 -Todo
#>
param(
  [switch]$Api,
  [switch]$Web,
  [switch]$Java,
  [switch]$Todo,
  [switch]$Estado,
  # Compila y reinicia lo que ya esta en el disco, sin traer nada de origin.
  [switch]$SinPull
)

$ErrorActionPreference = "Stop"
$repo    = $PSScriptRoot
$destino = "C:\ProfitAcceso"

if ($Todo) { $Api = $true; $Web = $true; $Java = $true }

if (-not ($Api -or $Web -or $Java -or $Estado)) {
  Write-Host "Uso: .\update.ps1 [-Api] [-Web] [-Java] [-Todo] [-Estado] [-SinPull]"
  exit 1
}

function Test-Elevado {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Paso($texto) { Write-Host "`n== $texto" -ForegroundColor Cyan }

function Mostrar-Estado {
  Paso "Servicios"
  Get-Service profit-api,acceso-service,profit-web |
    Format-Table Name,Status,StartType -AutoSize | Out-String | Write-Host

  Paso "Salud del servicio de acceso"
  try {
    (Invoke-WebRequest http://localhost:8080/api/health -UseBasicParsing -TimeoutSec 5).Content |
      Write-Host
  } catch {
    Write-Host "  no responde: $($_.Exception.Message)" -ForegroundColor Yellow
  }

  Paso "Ultimas lineas de cada log"
  foreach ($s in "profit-api","acceso-service","profit-web") {
    $log = Join-Path $destino "logs\$s.out.log"
    Write-Host "`n-- $s" -ForegroundColor DarkGray
    if (Test-Path $log) { Get-Content $log -Tail 8 } else { Write-Host "  (sin log)" }
  }
}

if ($Estado) {
  Mostrar-Estado
  if (-not ($Api -or $Web -or $Java)) { exit 0 }
}

# Los reinicios son lo unico que necesita elevacion; se avisa antes de compilar nada.
if (($Api -or $Java) -and -not (Test-Elevado)) {
  Write-Error "Se necesita PowerShell elevado para reiniciar servicios. Sin elevar, Start-Service falla con 'No se puede abrir el servicio', que es un permiso denegado disfrazado."
  exit 1
}

if (-not $SinPull) {
  Paso "git pull"
  Push-Location $repo
  try {
    # Un pull sobre un arbol sucio deja el kiosco a medias entre dos versiones.
    $sucio = git status --porcelain
    if ($sucio) {
      Write-Host $sucio
      Write-Error "El arbol tiene cambios sin commitear. Resuelvelos o corre con -SinPull."
      exit 1
    }
    $antes = git rev-parse HEAD
    git pull --ff-only
    if ($LASTEXITCODE -ne 0) { Write-Error "git pull fallo."; exit 1 }
    $script:cambios = git diff --name-only $antes HEAD
    if (-not $script:cambios) { Write-Host "Ya estaba al dia." -ForegroundColor DarkGray }
  } finally { Pop-Location }
}

if ($Web) {
  Paso "Compilando la app Angular"
  Push-Location (Join-Path $repo "profit-web")
  try {
    if ($script:cambios -match "^profit-web/package-lock\.json$") { npm install }
    # --configuration development no es opcional: ver el comentario de arriba.
    npm run build -- --configuration development
    if ($LASTEXITCODE -ne 0) { Write-Error "El build de Angular fallo."; exit 1 }
  } finally { Pop-Location }
  Write-Host "Listo. No hay que reiniciar profit-web, pero SI hay que hacer Ctrl+Shift+R en el kiosco: en el build de desarrollo main.js no lleva hash." -ForegroundColor Yellow
}

if ($Api) {
  Paso "Compilando el API"
  Push-Location (Join-Path $repo "api")
  try {
    if ($script:cambios -match "^api/package-lock\.json$") { npm install }
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Error "El build del API fallo."; exit 1 }
  } finally { Pop-Location }

  Paso "Reiniciando profit-api"
  # -Force porque acceso-service depende de el; el dependiente queda detenido y se levanta abajo.
  Restart-Service profit-api -Force
}

if ($Java) {
  Paso "Compilando acceso-service"
  Push-Location (Join-Path $repo "acceso-service")
  try {
    .\build.ps1
    if ($LASTEXITCODE -ne 0) { Write-Error "El build del servicio Java fallo."; exit 1 }
  } finally { Pop-Location }

  Paso "Reemplazando el jar"
  Stop-Service acceso-service -Force
  Copy-Item (Join-Path $repo "acceso-service\build\acceso-service.jar") $destino -Force
}

# El jar se copia con el servicio detenido; y un -Api solo tambien lo dejo abajo.
if ($Api -or $Java) {
  Paso "Levantando acceso-service"
  Start-Service acceso-service
  Start-Sleep -Seconds 3
  Mostrar-Estado
}
