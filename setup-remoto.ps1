<#
.SYNOPSIS
  Deja el kiosco accesible por SSH desde fuera de la sucursal, via Tailscale.

.DESCRIPTION
  Dos piezas independientes:

    - OpenSSH Server (viene con Windows, no se instala nada de terceros): un servicio 'sshd'
      que atiende el 22 y da una consola de PowerShell. Es la "terminal de fondo": no hay una
      sesion viva esperando, hay un servicio al que te conectas cuando quieras.

    - Tailscale: le da a la maquina una IP privada 100.x.y.z alcanzable desde tus dispositivos
      sin abrir puertos en el router ni depender de la IP publica de la sucursal.

  El puerto 22 se abre SOLO para el rango de Tailscale (100.64.0.0/10) y la LAN de la sucursal.
  Aun si alguien hiciera un port-forward por error, el firewall no dejaria entrar a nadie mas.
  Importa: esta maquina tiene las credenciales de MySQL en texto plano en api\.env.

  Una sesion SSH de un miembro de Administradores llega ya elevada, asi que desde ahi se pueden
  reiniciar los servicios sin UAC.

.PARAMETER LlavePublica
  Contenido de tu id_ed25519.pub. Sin esto queda autenticacion por contrasena de Windows.

.PARAMETER SoloLlave
  Apaga la autenticacion por contrasena. Usalo DESPUES de comprobar que entras con la llave,
  o te quedas fuera.

.EXAMPLE
  .\setup-remoto.ps1 -LlavePublica "ssh-ed25519 AAAAC3Nza... max@laptop"
  .\setup-remoto.ps1 -SoloLlave
#>
param(
  [string]$LlavePublica,
  [switch]$SoloLlave,
  [switch]$SinTailscale,
  [string]$RangoLan = "192.168.15.0/24"
)

$ErrorActionPreference = "Stop"

$id = [Security.Principal.WindowsIdentity]::GetCurrent()
if (-not (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole(
      [Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Error "Este script instala servicios y reglas de firewall: necesita PowerShell elevado."
  exit 1
}

function Paso($texto) { Write-Host "`n== $texto" -ForegroundColor Cyan }

Paso "OpenSSH Server"
$cap = Get-WindowsCapability -Online -Name OpenSSH.Server*
if ($cap.State -ne "Installed") {
  Write-Host "Instalando (baja ~2 MB de Windows Update)..."
  Add-WindowsCapability -Online -Name $cap.Name | Out-Null
} else {
  Write-Host "Ya estaba instalado." -ForegroundColor DarkGray
}

Set-Service sshd -StartupType Automatic
Start-Service sshd

Paso "Shell por defecto de las sesiones SSH"
# Sin esto caes en cmd.exe y ni Get-Service ni el update.ps1 funcionan como estan escritos.
New-ItemProperty -Path "HKLM:\SOFTWARE\OpenSSH" -Name DefaultShell `
  -Value "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" `
  -PropertyType String -Force | Out-Null

Paso "Firewall: 22 solo desde Tailscale y la LAN"
$regla = "Profit - SSH (tailnet y LAN)"
# Windows crea 'OpenSSH-Server-In-TCP' abierta a cualquier origen al instalar la capability.
Get-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -ErrorAction SilentlyContinue |
  Disable-NetFirewallRule
Get-NetFirewallRule -DisplayName $regla -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName $regla -Direction Inbound -Protocol TCP -LocalPort 22 `
  -Action Allow -Profile Any -RemoteAddress @("100.64.0.0/10", $RangoLan) | Out-Null
Write-Host "Origenes permitidos: 100.64.0.0/10, $RangoLan"

if ($LlavePublica) {
  Paso "Llave publica"
  # Para cuentas de Administradores, sshd NO lee ~\.ssh\authorized_keys: lee este archivo, y
  # exige que solo Administradores y SYSTEM tengan permiso o lo ignora en silencio.
  $archivo = "$env:ProgramData\ssh\administrators_authorized_keys"
  $llaves = @()
  if (Test-Path $archivo) { $llaves = Get-Content $archivo }
  if ($llaves -notcontains $LlavePublica.Trim()) { $llaves += $LlavePublica.Trim() }
  Set-Content -Path $archivo -Value $llaves -Encoding ascii

  # Por SID y no por nombre: en un Windows en espanol el grupo es 'Administradores', icacls
  # aborta sin aplicar nada y la herencia se queda puesta. sshd entonces descarta el archivo
  # por permisos y cae a contrasena sin decirlo en ningun log.
  #   *S-1-5-32-544 = Administradores    *S-1-5-18 = SYSTEM
  icacls $archivo /inheritance:r /grant "*S-1-5-32-544:F" /grant "*S-1-5-18:F" | Out-Null
  if ($LASTEXITCODE -ne 0) { Write-Error "icacls fallo: sshd ignoraria la llave." ; exit 1 }
  Write-Host "Escrita en $archivo"
}

if ($SoloLlave) {
  Paso "Apagando la autenticacion por contrasena"
  $cfg = "$env:ProgramData\ssh\sshd_config"
  Copy-Item $cfg "$cfg.bak" -Force
  (Get-Content $cfg) -replace '^\s*#?\s*PasswordAuthentication\s+.*$', 'PasswordAuthentication no' |
    Set-Content $cfg -Encoding ascii
  if (-not (Select-String -Path $cfg -Pattern '^PasswordAuthentication no' -Quiet)) {
    Add-Content $cfg "PasswordAuthentication no"
  }
  Restart-Service sshd
  Write-Host "Respaldo del config en $cfg.bak" -ForegroundColor DarkGray
}

if (-not $SinTailscale) {
  Paso "Tailscale"
  $ts = "C:\Program Files\Tailscale\tailscale.exe"
  if (-not (Test-Path $ts)) {
    $msi = Join-Path $env:TEMP "tailscale-setup.msi"
    Write-Host "Descargando el instalador..."
    Invoke-WebRequest "https://pkgs.tailscale.com/stable/tailscale-setup-latest-amd64.msi" `
      -OutFile $msi -UseBasicParsing
    Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /qn" -Wait
  } else {
    Write-Host "Ya estaba instalado." -ForegroundColor DarkGray
  }

  Write-Host "`nFalta un paso a mano: autenticar la maquina en tu tailnet." -ForegroundColor Yellow
  Write-Host '  & "C:\Program Files\Tailscale\tailscale.exe" up --unattended'
  Write-Host "  (abre el navegador; --unattended la deja conectada aunque nadie tenga sesion abierta)"
  Write-Host "`nDespues, la IP del kiosco sale de:"
  Write-Host '  & "C:\Program Files\Tailscale\tailscale.exe" ip -4'
}

Paso "Estado"
Get-Service sshd | Format-Table Name,Status,StartType -AutoSize | Out-String | Write-Host
Write-Host "Conexion desde tu maquina:  ssh $env:USERNAME@<ip-de-tailscale>"
Write-Host "Una vez dentro:             cd C:\Users\Admin\Documents\profit; .\update.ps1 -Estado"
