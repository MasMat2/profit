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

**La dependencia no basta al reiniciar a mano.** El SCM da por arrancado a `profit-api` en cuanto
WinSW lanza `node`, y Nest tarda unos 14 s más en escuchar. Un `Start-Service acceso-service`
inmediato pierde la misma carrera: ver [El API](#el-api).

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

**Si `loadedAt` sigue en `null` pasados unos segundos**, la carga inicial falló, casi siempre porque
el API todavía no escuchaba (`logs\acceso-service.err.log` trae el `ConnectException`). No hace
falta reiniciar nada: el servicio expone el refresco y tarda ~2 s.

```powershell
Invoke-WebRequest http://localhost:8080/api/templates/refresh -Method POST -UseBasicParsing
```

### El `.env`

`api\.env` no está versionado, así que lo que trae sólo vive en el disco del kiosco: credenciales de
MySQL y la `ACCESO_API_KEY`.

Al respaldar el archivo, usa el patrón `.env.bak-*`: es el único que el `.gitignore` del API cubre,
y esos respaldos llevan la contraseña de MySQL en claro.

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
while (-not (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)) { Start-Sleep 1 }
Start-Service acceso-service        # NO se levanta solo
```

El `-Force` es obligatorio: sin él, `Restart-Service` se niega porque `acceso-service` depende del
API. Y `acceso-service` **se queda detenido** — la dependencia del SCM garantiza el orden de
arranque, no que al dependiente lo vuelvan a levantar. Hay que arrancarlo explícitamente.

**Y hay que esperar a que Nest escuche antes de levantarlo.** El SCM da por arrancado a
`profit-api` en cuanto WinSW lanza `node`; Nest tarda unos 14 s más. Si el servicio Java pide los
templates antes, la carga inicial falla y **la caché queda vacía hasta el refresco de los 15
minutos**, con el lector rechazando a todos. Pasó el 2026-09-07 a las 18:43 con un `Start-Service`
inmediato: `node` a los 3 s, Java escuchando a los 8 s, Nest a los 17 s, y diez huellas rechazadas
hasta que se forzó el refresco tres minutos después. `update.ps1` ya espera el puerto y, si aun
así la salud no llega a `OK`, dispara el refresco; a mano es el `while` de arriba, o el refresco de
la sección [Salud](#salud) si ya pasó.

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
