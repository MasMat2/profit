# acceso-service

Servicio local de identificación por huella para el control de acceso del gimnasio. Corre **en
la PC del kiosco**, junto al lector y al torniquete.

1. El navegador captura la huella con el Web SDK de DigitalPersona y la manda a `/api/identify`.
2. El servicio la identifica contra los templates de `tbhuellas` y devuelve el `socio`.
3. El navegador llama a NestJS (`POST /asistencia/acceso/:id`), que valida membresía y registra
   la asistencia.
4. **Sólo si eso devolvió `acceso: true`**, el navegador pide abrir el torniquete.

Ese paso 4 es la diferencia con el sample original del SDK, que abría ante cualquier match
aunque la membresía estuviera vencida.

## Sin dependencias

El servidor HTTP es el del JDK (`com.sun.net.httpserver`), el cliente HTTP es
`java.net.http.HttpClient`, y el puerto serial se configura con el `mode` de Windows. **La única
dependencia externa es `dpuareu.jar`**, que ya viene con el U.are.U SDK instalado en cualquier
máquina que tenga el lector — no se copia al repo, se referencia por ruta.

El SDK Java es un wrapper JNI: aunque el navegador sea el dueño del lector, este servicio
necesita las DLL nativas (`dpuareu_jni.dll`, `dpfj`, `dpfpdd`) para importar y comparar
templates. Vienen con el U.are.U SDK / Lite Client, que de todos modos hacen falta en el kiosco
(el Lite Client es lo que atiende `wss://localhost:52181` para el navegador).

Hace falta JDK 17+ para compilar; en el kiosco basta un JRE 17+.

## Build

```powershell
.\build.ps1          # → build\acceso-service.jar
```

Un `javac` y un `jar`. Si el SDK está en otro lado: `.\build.ps1 -SdkHome "D:\...\Windows"`.

## Probar sin lector de huellas

No hace falta hardware. `docs/samples/*.txt` son capturas reales del Web SDK — el mismo payload
que manda el navegador — y el torniquete viene deshabilitado por defecto, así que
`/api/turnstile/open` responde `opened: false` sin tocar el puerto serial.

```powershell
cd ..\api ; npm run start:dev          # el API sirve los templates
cd ..\acceso-service
.\scripts\run-dev.ps1 -ApiKey "<la de api\.env>"
.\scripts\test-identify.ps1            # health + identify + turnstile
```

El servicio arranca aunque el API no responda: la caché queda vacía, `/api/health` dice
`SIN_TEMPLATES` y `/api/identify` devuelve `socio: null`. Sirve para verificar que el SDK nativo
cargó bien antes de tener nada más listo.

Desde la app Angular, el bloque `DEV_MODE` de `acceso-cliente.component.ts` permite escribir un
ID de socio a mano y ejercita el resto del flujo sin pasar por el lector.

## Endpoints

| Método | Ruta | Respuesta |
|---|---|---|
| `POST` | `/api/identify` | `{"socio":9063,"score":0}` o `{"socio":null,"score":null}` |
| `POST` | `/api/turnstile/open` | `{"opened":true,"enabled":true}` · 503 si el puerto falla |
| `POST` | `/api/templates/refresh` | `{"templates":812,...}` · 502 si el API no responde |
| `GET` | `/api/health` | Estado de la caché, formato en uso y config del torniquete |
| `GET` | `/api/ping` | Vivo, sin tocar el SDK |

## Configuración

Todo en `application.properties`, con esta precedencia: `-Dclave=valor` > variable de entorno >
archivo > default. El nombre de la variable es la clave en mayúsculas con puntos como guión
bajo (`acceso.api.url` → `ACCESO_API_URL`), que es como `winsw/acceso-service.xml` configura
todo sin tocar el archivo.

Las cuatro que se tocan en un despliegue:

| Clave | Para qué |
|---|---|
| `acceso.api.url` · `acceso.api.key` | De dónde bajar los templates y con qué llave. |
| `acceso.allowed.origins` | Desde dónde se sirve la app Angular. |
| `acceso.turnstile.enabled` · `.port` | `false` en máquinas sin hardware. |
| `acceso.ssl.keystore` · `.password` | PKCS12 para TLS; vacío = HTTP plano. |

El resto está documentado en el propio archivo.

## El formato del template: comprobado contra la base real

Las 4 muestras de `docs/samples/` son del **socio 9063**, que está enrolado en `tbhuellas`. Se
identificaron contra su plantilla real (id 391, dedo 2, 1632 bytes) y dieron
`{"socio":9063,"score":0}` en las cuatro, a través del servicio HTTP completo.

| Hallazgo | Consecuencia en el código |
|---|---|
| La muestra del navegador identifica como `DP_VER_FEATURES` **o** `DP_PRE_REG_FEATURES`; `DP_REG_FEATURES` falla con `URU_E_INVALID_FMD`. | `acceso.match.input.format=DP_VER_FEATURES`. El sample original usaba PRE_REG; ambos sirven. |
| Los tres formatos DP comparten contenedor: el mismo blob "importa" como los tres, pero sólo dos identifican. | **Un formato mal configurado no da error, da "sin match" silencioso.** Por eso no hay reintento de formatos en `FmdImporter`: no podría distinguir el caso malo. |
| `Engine.Identify` exige que el arreglo de candidatos sean plantillas de registro (declararlas VER → `URU_E_INVALID_PARAMETER`). | `TemplateLoader` importa siempre con `DP_REG_FEATURES`. |
| Un enrolamiento real pesa ~1600 bytes (se arma con 4 capturas); una muestra del navegador, 318. | Si un "template" de la base mide ~300 bytes no es un enrolamiento y `Identify` lo rechazará. |
| El `CAST(huella AS BINARY)` del API entrega los bytes intactos. | Si `descartados` sube en `/api/health`, ese CAST es el primer sospechoso. |

Para repetir el diagnóstico hace falta una plantilla real, en un archivo base64 (una por línea):

```powershell
.\scripts\run-dev.ps1 -Probe -SampleFile docs\samples\intermediate-1.txt -TemplateFile <ruta>
```

> El archivo con plantillas reales **no se guarda en el repo**: son datos biométricos de una
> persona. Extraerlo a una carpeta temporal cuando haga falta.

## TLS y Private Network Access (producción)

La app Angular se sirve por HTTPS desde un servidor público y pega a `localhost`. Chrome trata
eso como *public → private* y lo bloquea salvo tres cosas:

1. **El servicio local habla TLS** — igual que el Lite Client con `wss://localhost:52181`:

   ```powershell
   mkcert -install
   mkcert -pkcs12 -p12-file certs\localhost.p12 localhost 127.0.0.1
   ```

   Luego `acceso.ssl.keystore=certs/localhost.p12` y `server.port=8443`.

2. **El preflight responde `Access-Control-Allow-Private-Network: true`** — ya lo hace
   `ApiServer.cors()`; verificado que devuelve 204 con ese header y que el `Allow-Origin` sólo
   aparece para orígenes de la lista.

3. **En una flota de kioscos**, pre-autorizar por política de Chrome/Edge
   (`LocalNetworkAccessAllowedForUrls`) para que no salga el prompt de permiso.

Estandarizar los kioscos en Chrome o Edge; Firefox y Safari difieren en este punto.

## Instalación como servicio de Windows

Con [WinSW](https://github.com/winsw/winsw), en el directorio de instalación junto a
`acceso-service.jar` y `application.properties`:

```powershell
.\acceso-service.exe install
.\acceso-service.exe start
```

Ajustar antes las variables de entorno y las rutas al SDK en `winsw/acceso-service.xml`. Los
logs quedan en `.\logs\`. Como el servicio **no** toca el lector USB (eso es del navegador),
correr bajo LocalSystem en sesión 0 no da problemas: sólo necesita el puerto COM y salida a
internet.

## Notas de diseño

- **`NativeExecutor`**: todas las llamadas al SDK pasan por un solo hilo. `Engine` e `Importer`
  son objetos JNI sin garantía de reentrancia, y esto además asegura que sea siempre el mismo
  hilo el que entra al código nativo. En un kiosco pasa una persona a la vez.
- **Arreglos paralelos** `Fmd[]` / `int[] socios`: `Engine.Identify` devuelve índices, así que
  sólo se agrega al arreglo de socios cuando el import del template correspondiente tuvo éxito.
- **La caché sobrevive cortes**: si el refresco falla se conserva el último snapshot bueno.
- **Sin credenciales de MySQL en el kiosco**: los templates se piden al API, no a la base, y
  llegan como texto (`socio,base64` por línea) para no necesitar un parser de JSON.
- **`UareUErrors`**: `UareUException.getMessage()` devuelve null y toda la información está en
  `getCode()`; los nombres salen por reflexión de las constantes del SDK.

## `docs/`

- `Identification.java` — el sample original del SDK del que salió todo esto (Swing, JDBC
  hardcodeado, torniquete). Se conserva como referencia.
- `websdk-notas.js` — pruebas con el Web SDK: qué devuelve cada `SampleFormat`, con muestras
  reales capturadas.
- `samples/intermediate-*.txt` — las 4 muestras `Intermediate` de esas notas (socio 9063).
