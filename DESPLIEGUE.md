# Despliegue del kiosco

El control de acceso son **tres procesos** en la PC del kiosco, instalados como servicios de
Windows con [WinSW](https://github.com/winsw/winsw). Este documento es para operarlos: qué
levanta qué, cómo se actualiza cada pieza y qué cosas ya se rompieron una vez.

El diseño interno del servicio Java está en [`acceso-service/README.md`](acceso-service/README.md).

## Las tres piezas

| Servicio | Qué corre | Puerto | Depende de |
|---|---|---|---|
| `profit-api` | `node dist/main`, con cwd en `api\` | 3000 | MySQL de la sucursal |
| `acceso-service` | JVM + U.are.U SDK | 8080 | `profit-api` |
| `profit-web` | `web-server.js` sirviendo el `dist\` de Angular | 4200 | — |

Los puertos no son negociables por separado: `environment.ts` apunta a 3000 y 8080, y
`ACCESO_ALLOWED_ORIGINS` del servicio Java autoriza el 4200. Cambiar uno obliga a tocar los tres.

La dependencia `acceso-service → profit-api` está declarada en el XML y registrada en el SCM. Sin
ella, en el arranque el servicio Java le gana la carrera al API, la descarga inicial de templates
falla y la caché queda vacía hasta el refresco de los 15 minutos: el lector rechazaría a todo el
mundo ese rato.

## Dónde vive

Directorio de instalación: **`C:\ProfitAcceso`**

```
acceso-service.exe   profit-api.exe   profit-web.exe    <- WinSW v2.12.0, la misma copia renombrada
acceso-service.xml   profit-api.xml   profit-web.xml    <- una config por servicio
acceso-service.jar        <- copiado de acceso-service\build\
application.properties    <- copiado del repo
web-server.js             <- servidor estatico del bundle Angular
diag.html                 <- pagina de diagnostico del lector
logs\                     <- .out.log, .err.log y .wrapper.log de los tres
```

WinSW busca el XML **con su mismo nombre base**: por eso hay tres copias renombradas del binario.

Los servicios no corren desde `C:\ProfitAcceso`: `profit-api` apunta con `workingdirectory` a
`api\` del repo (para que `dotenv` encuentre el `.env`, una sola copia de las credenciales y fuera
del control de versiones) y `profit-web` sirve el `dist\` del repo. Sólo el jar y el
`application.properties` se copian.

> **`web-server.js`, `diag.html` y los tres XML existen únicamente en esa máquina**, no están
> versionados. Si se pierde el disco, se pierde el despliegue.

## Operación

Todo lo que sigue necesita **PowerShell elevado**. Sin elevar, `Start-Service` falla con
"No se puede abrir el servicio ... en el equipo '.'", que es un permiso denegado disfrazado.

```powershell
Start-Service acceso-service    # arrastra profit-api por la dependencia
Start-Service profit-web

Get-Service acceso-service,profit-api,profit-web | Format-Table Name,Status,StartType
```

### Arranque automático

```powershell
sc.exe config profit-api      start= delayed-auto
sc.exe config acceso-service  start= delayed-auto
sc.exe config profit-web      start= delayed-auto
```

El espacio después de `start=` es obligatorio. Se usa `sc.exe` y no
`Set-Service -StartupType Automatic` porque este último sólo da automático normal, y aquí interesa
el **retardado**: `profit-api` necesita la MySQL de la sucursal arriba, y la dependencia del SCM
garantiza el orden entre los servicios pero no espera a la base.

Cambiar el tipo de arranque no detiene ni reinicia nada, y es idempotente: se puede correr sobre
servicios que ya están corriendo.

Para dejarlos otra vez a mano: `Set-Service <nombre> -StartupType Manual`.

### Logs

`C:\ProfitAcceso\logs\<servicio>.out.log` — la salida del proceso. El del servicio Java trae las
identificaciones (`Huella identificada: socio=...`), la carga de templates y las aperturas del
torniquete. El de `profit-web` trae una línea por petición HTTP.

`.wrapper.log` es de WinSW, no del proceso: sirve para ver si arrancó, murió o lo reiniciaron.

### Salud

```powershell
(Invoke-WebRequest http://localhost:8080/api/health -UseBasicParsing).Content
```

Debe traer los templates cargados y `descartados: 0`. `SIN_TEMPLATES` significa que no alcanzó el
API o que la llave está mal.

**Salvo justo después de arrancar.** `acceso-service` responde en el 8080 unos dos segundos antes
de terminar de importar los templates, así que una consulta en esa ventana devuelve `SIN_TEMPLATES`
sin que nada esté mal. Antes de diagnosticar, compara el `loadedAt` de la respuesta con la línea
`Templates cargados:` del log.

### Interruptores del `.env`

`api\.env` no está versionado, así que lo que trae sólo vive en el disco del kiosco. Además de las
credenciales de MySQL y la `ACCESO_API_KEY`:

| Variable | Efecto |
|---|---|
| `ASISTENCIA_DENEGAR_ADEUDO` | `false` deja pasar al socio con adeudo y manda el motivo como `advertencia` en la respuesta, registrando la asistencia igual. Cualquier otro valor, o quitar la línea, vuelve a negar el acceso — que es el comportamiento de BDK |

Ninguno necesita `npm run build`: `asistencia.service.ts` los lee de `process.env` en cada llamada,
a propósito. **Sí necesitan reiniciar `profit-api`**, porque `dotenv.config()` corre una sola vez en
el arranque y el proceso vivo conserva el ambiente de cuando se levantó.

Al respaldar el archivo, usa el patrón `.env.bak-*`: es el único que el `.gitignore` del API cubre,
y esos respaldos llevan la contraseña de MySQL en claro.

## Acceso remoto

El kiosco es alcanzable por SSH desde fuera de la sucursal, vía Tailscale. Son dos piezas
independientes, y las instala `setup-remoto.ps1` (elevado, una sola vez).

| | |
|---|---|
| Tailnet | `masmat2.github` — la organización de GitHub, no una cuenta personal |
| Nombre del nodo | `desktop-vk579fe`, MagicDNS `desktop-vk579fe.tailac85ce.ts.net` |
| Servicio `sshd` | OpenSSH Server, capability de Windows, automático |
| Shell de la sesión | PowerShell (por `DefaultShell` en `HKLM:\SOFTWARE\OpenSSH`) |

```powershell
ssh Admin@desktop-vk579fe.tailac85ce.ts.net
cd C:\Users\Admin\Documents\profit; .\update.ps1 -Estado
```

La sesión SSH de un miembro de Administradores **llega ya elevada**, así que desde ahí sí corren
`Restart-Service` y `update.ps1 -Api` sin UAC.

El 22 no está abierto al mundo: la regla que crea Windows al instalar la capability
(`OpenSSH-Server-In-TCP`, origen `Any`) se deshabilita, y en su lugar queda
`Profit - SSH (tailnet y LAN)` acotada a `100.64.0.0/10` y `192.168.15.0/24`. Aun con un
port-forward hecho por error, el firewall no deja entrar a nadie más. Importa porque **esta máquina
tiene las credenciales de MySQL en texto plano** en `api\.env`.

### Dos cosas que muerden

**La ACL de la llave se aplica por SID, no por nombre.** Para cuentas de Administradores sshd no lee
`~\.ssh\authorized_keys` sino `C:\ProgramData\ssh\administrators_authorized_keys`, y exige que sólo
Administradores y SYSTEM tengan permiso. En un Windows en español `icacls ... /grant
"Administrators:F"` falla con *"No se efectuó ninguna asignación entre los nombres de cuenta y los
identificadores de seguridad"*, **aborta sin aplicar nada** y deja la herencia puesta. sshd entonces
descarta el archivo y cae a pedir contraseña, sin decirlo en ningún log. Por eso el script usa
`*S-1-5-32-544` y `*S-1-5-18`. Para comprobarlo, `icacls` sobre el archivo no debe mostrar ningún
`(I)` ni a `Authenticated Users`.

**La llave del nodo caduca.** Por defecto a los ~6 meses, y ese día el kiosco se sale del tailnet
solo — justo cuando haga falta entrar. Se apaga únicamente desde la web: admin console → *Machines*
→ `desktop-vk579fe` → *Disable key expiry*.

Nota sobre el proveedor de identidad: Tailscale **no puede migrar un tailnet desde o hacia GitHub**,
ni cambiarle el IdP a uno creado con un Gmail. Mover esto a otra identidad significa crear un
tailnet nuevo y re-autenticar cada nodo (`tailscale logout` y `tailscale up --unattended`).

### Ver el código ejecutándose

`.vscode/launch.json` trae una configuración de *attach* al inspector de Node. Requiere el flag en
`C:\ProfitAcceso\profit-api.xml`, que **todavía no está puesto**:

```xml
<arguments>--inspect=127.0.0.1:9229 dist/main</arguments>
```

`127.0.0.1` a propósito: el inspector de Node es ejecución de código sin autenticación, nunca
`0.0.0.0`. Desde fuera se llega tunelizando el 9229, que Remote-SSH hace solo.

**En horario de gimnasio, logpoints y no breakpoints.** Un breakpoint congela el API, y con el API
congelado la huella se identifica pero no registra asistencia ni abre el torniquete: el socio se
queda parado en el torniquete hasta que le des *continue*.

Lo que no se puede remoto es la captura de huella — el dueño del lector es el navegador del kiosco
vía el Lite Client. Para eso está `diag.html`, más abajo.

## Actualizar cada pieza

`update.ps1`, en la raíz del repo, automatiza todo lo de esta sección y codifica las dos trampas de
abajo: `-Api`, `-Web`, `-Java`, `-Todo`, `-Estado`, `-SinPull`. Se niega a hacer `git pull` con el
árbol sucio. Lo que sigue es lo mismo a mano.

### La app Angular

```powershell
cd C:\Users\Admin\Documents\profit\profit-web
npm run build -- --configuration development
```

**`--configuration development` no es opcional.** `npm run build` a secas usa la configuración de
producción, que aplica el `fileReplacements` de `angular.json` y sustituye `environment.ts` por
`environment.prod.ts` — con lo cual la app del kiosco quedaría apuntando a
`https://your-production-api.com/api` y al puerto 8443. No falla en el build: falla en el kiosco,
en silencio.

No hace falta reiniciar `profit-web`: `web-server.js` lee del disco en cada petición. Sí hace falta
**Ctrl+Shift+R** en el navegador, porque en el build de desarrollo `main.js` no lleva hash y el
navegador puede quedarse con el viejo.

### El API

```powershell
cd C:\Users\Admin\Documents\profit\api
npm run build
Restart-Service profit-api -Force   # elevado
Start-Service acceso-service        # NO se levanta solo
```

El `-Force` es obligatorio: sin él, `Restart-Service` se niega porque `acceso-service` depende del
API. Y `acceso-service` **se queda detenido** — la dependencia del SCM garantiza el orden de
arranque, no que al dependiente lo vuelvan a levantar. Hay que arrancarlo explícitamente.

**El corte son ~25 segundos, no dos o tres.** El API vuelve en pocos segundos; lo que se lleva el
tiempo es `acceso-service` reimportando los ~4000 templates al arrancar. En esa ventana el lector no
se queda ciego (los templates viven en la JVM del proceso que se está reiniciando), pero una huella
identificada **no registra asistencia ni abre el torniquete**. Antes de reiniciar en horario de
gimnasio, mira la cola de `logs\acceso-service.out.log`: si hay identificaciones en los últimos
minutos, espera.

### El servicio Java

```powershell
cd C:\Users\Admin\Documents\profit\acceso-service
.\build.ps1
Stop-Service acceso-service                                   # elevado
Copy-Item build\acceso-service.jar C:\ProfitAcceso -Force
Start-Service acceso-service
```

## El lector de huellas: tres trampas ya pagadas

Las tres daban el mismo síntoma —el lector no entrega nada— y ninguna produce un error visible.
Están arregladas en el componente; esto es para no volver a diagnosticarlas desde cero.

**`startAcquisition` necesita el UID del lector.** Sin el segundo argumento manda el GUID nulo
(`00000000-...`), que el SDK documenta como "cualquier lector". Con el Lite Client esa variante
*resuelve la promesa sin llegar a tomar el lector*: no hay excepción, no hay mensaje, y el dedo
apoyado no produce ninguna muestra. El UID sale de `enumerateDevices()`.

**`onDeviceConnected` no puede re-capturar sin condición.** El SDK emite ese evento como respuesta
a `startAcquisition`, así que re-capturar ahí es un bucle que se realimenta solo — se midieron
4010 vueltas en 7 minutos, y entre vuelta y vuelta la captura se reiniciaba antes de que llegara
la muestra. Sólo se re-enumera cuando no hay captura activa.

**La captura hay que re-armarla después de cada muestra.** Si no, llega la primera y ninguna más:
el lector sigue reportando calidad buena y nunca vuelve a emitir `onSamplesAcquired`. Lo que
re-arma el canal es el `stopAcquisition`, no el `startAcquisition` que va detrás. Y ese `stop` es
asíncrono: reabrir a los 300 ms fallaba con `Communication failure.`, que el SDK convierte en
`onCommunicationFailed` — el aviso de "Lite Client caído" sobre un lector que estaba leyendo bien.

## Diagnóstico sin la consola del navegador

`http://localhost:4200/diag.html` corre la secuencia completa del SDK (`enumerateDevices` →
`getDeviceInfo` → `startAcquisition`), con timeout en cada paso, y **postea el resultado a
`/diag-log`**, que `web-server.js` escribe en `logs\profit-web.out.log`. Sirve para leer el
diagnóstico desde otra máquina, sin que nadie copie nada a mano, y distingue lo que desde Angular
se ve igual: una promesa que rechaza de una que nunca resuelve.

Vive fuera del `dist\` a propósito, para que un `ng build` no se la lleve puesta.

El mismo `/diag-log` acepta cualquier POST, así que el componente se puede instrumentar temporalmente
contra él cuando haga falta seguir un flujo completo.

## COM3 y BDK

`acceso-service` abre el puerto serial del torniquete sólo para escribir el comando y lo cierra,
pero antes de cada escritura corre `mode COM3: BAUD=9600 ...`, y **eso reconfigura el puerto aunque
el BDK lo tenga abierto**.

Los dos sistemas no pueden atender el torniquete a la vez. Con arranque automático, `acceso-service`
levanta armado en cada reinicio: si se vuelve a usar BDK en esa máquina hay que dejar los servicios
en `Manual`.

Lo que **no** se pisa con BDK: el lector de huella (en este diseño el dueño es el navegador), los
puertos 3000/4200/8080, y la base — sólo lecturas de `tbhuellas` cada 15 minutos.

## Requisitos de la máquina

| | |
|---|---|
| JRE 17+ | Para compilar hace falta JDK 17+ |
| Node | El path del `node.exe` está escrito en los XML de `profit-api` y `profit-web` |
| U.are.U SDK | `dpuareu.jar` y las DLL de `Lib\x64`; las rutas están en el XML de `acceso-service` |
| DigitalPersona Lite Client | Es quien atiende `localhost:52181` para el navegador. Sin él, `enumerateDevices()` falla con `Communication failure.` y el lector no existe para la página |
