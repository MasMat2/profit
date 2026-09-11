# Bitácora del control de acceso

Registro de los reportes recibidos sobre el torniquete y el lector de huellas, qué se comprobó de
cada uno y qué quedó pendiente. Complementa a `DESPLIEGUE.md`, que documenta cómo está montado el
kiosco; aquí va lo que se ha *encontrado* operándolo.

Sesión del **8 de septiembre de 2026**. Horas en local (`America/Monterrey`, UTC-6).

---

## Resumen

| Reporte | Veredicto |
|---|---|
| "El torniquete está permanentemente desconectado" | **Descartado** — es la vista de BDK, no el torniquete |
| "El torniquete está permanentemente desbloqueado" | **Explicado** — cada `R01` rearma el temporizador del controlador y la gente llega más rápido de lo que tarda en cerrar. Ver sección 2. |
| "No detecta a algunos socios" / "a los nuevos ingresos no les funciona" | **Dos causas distintas** — (a) el match cae en un expediente dado de baja, ya corregido con el filtro por socio activo; (b) enrolamientos que salen inservibles. Ver 3.1b y 3.2. |

> **Lo importante en una línea:** eran **dos** fallas superpuestas. La primera —y la que más
> gente afectaba— era que el kiosco metía al motor de matching las 2963 plantillas de socios
> **dados de baja**, cosa que BDK nunca hizo: un socio al corriente con un expediente viejo era
> identificado por el viejo y rechazado por inactivo. **Corregido el 8-sep** (sección 3.1b). La
> segunda, enrolamientos que producen templates que no identifican, sigue abierta.

> **Nota sobre la sesión anterior:** la conclusión de que "la falla es física, el lector está
> sucio" se apoyaba en el par de control Sofia/Francisco, y **ese par estaba mal leído**. Ver la
> corrección en 3.2b antes de ir a limpiar nada.

---

## Topología (se descubrió durante esta sesión)

Cuatro orígenes distintos escriben a la base `bdksiste_bdkgym2` en **ProfitSRV**
(`192.168.15.65`, MySQL 5.1.40 — *no* la .193.62):

| Host | Usuario | Qué hace |
|---|---|---|
| `DESKTOP-VK579FE` | `bdk` | **El kiosco.** Sólo lee `tbhuellas` y escribe `tbasistencia`. |
| `DESKTOP-NEILI8S` | `gym` | **Administración y enrolamiento.** socios, mensualidades, ingresos, tickets, rutinas. **Las 11 escrituras a `tbhuellas` del 7-sep salieron de aquí.** |
| `DESKTOP-G0B5JS5` | `gym` | Segunda estación, mismo perfil, mucho menos volumen. |
| `localhost` | `root` | El propio servidor. |

**En el kiosco no se enrola.** Es de acceso solamente.

> Nota de seguridad, sin relación con las fallas: el usuario `bdk` con el que se conecta el API
> tiene `ALL PRIVILEGES ON *.* … WITH GRANT OPTION`. Para un servicio que lee `tbhuellas` y escribe
> `tbasistencia` es muchísimo más de lo necesario.

---

## 1. "El torniquete está permanentemente desconectado"

**Descartado.** El torniquete responde normal: 757 líneas de actividad ese día, la última a minutos
de la revisión, y **cero errores** en todo el log del servicio.

- `GET /api/health` → `turnstile: {port: "COM3", enabled: true}`
- COM3 sano: `Prolific USB-to-Serial Comm Port`, status OK, a 9600 8N1

Lo que sí está permanentemente desconectado es **el torniquete visto desde BDK**. `acceso-service`
corre `mode COM3:` antes de cada escritura y le reconfigura el puerto al BDK aunque lo tenga
abierto. Ver `DESPLIEGUE.md`, sección *COM3 y BDK*.

### Trampa de precedencia

`C:\ProfitAcceso\application.properties` dice `acceso.turnstile.enabled=false`, pero el servicio
corre con el torniquete **habilitado**: `acceso-service.xml` define
`<env name="ACCESO_TURNSTILE_ENABLED" value="true"/>`, y la variable de entorno gana sobre el
archivo. **Al diagnosticar, creerle a `/api/health`, no al `.properties`.**

---

## 2. "El torniquete está permanentemente desbloqueado"

**Explicado el 8-sep por la noche.** El reporte se afinó: *"a veces se bloquea, pero parece ser
después de mucho tiempo"*. Con ese matiz los números del log cierran.

`R01` es lo único que sale por COM3 — nunca un cierre — así que el re-bloqueo depende del
temporizador del controlador, **y cada `R01` lo vuelve a armar**. Reparto de huecos entre
aperturas consecutivas (1621 aperturas, 11 días):

| Hueco | Veces |
|---|---|
| < 30 s | 685 (42%) |
| 30 s – 1 min | 251 |
| 1 – 2 min | 316 |
| 2 – 5 min | 266 |
| > 5 min | 98 |

**78% de las aperturas ocurren a menos de 2 minutos de la anterior.** La racha continua sin
alcanzar a re-bloquearse, según cuánto valga el temporizador:

| Temporizador | Tiempo seguido desbloqueado |
|---|---|
| 30 s | 2 min (8 aperturas) |
| 60 s | 6 min (15 aperturas) |
| 2 min | **33 min** (66 aperturas), 8-sep 7:35 → 8:08 |
| 5 min | **4 h 14 min** (300 aperturas), 8-sep 5:51 → 10:05 |

Eso reconcilia la contraevidencia de la sesión anterior ("se volvió a ver bloqueado, el
temporizador sí funciona"). **Las dos observaciones son ciertas:** el temporizador funciona, pero
en hora pico casi nunca llega a expirar. Quien lo vio bloqueado lo vio en un valle.

**Falta el número.** Todo lo anterior es condicional al valor del temporizador, que no se conoce.
Se mide gratis: en un rato de calma, anotar el minuto exacto en que se traba y restarle la última
apertura del log. Valles del 8-sep: 11:42–11:54, 12:26–12:37, 13:02–13:12; y de madrugada,
03:38→04:24 (45 min).

**Sospecha de fondo:** un torniquete normalmente no espera al temporizador — se traba en cuanto el
sensor detecta que el brazo giró. Si aquí sólo cierra por tiempo, el **sensor de giro** puede estar
desconectado o fallando. Conviene preguntar a recepción **desde cuándo** pasa: este mecanismo
predice el mismo comportamiento con BDK (también mandaba un pulso por entrada y tampoco mandaba
cierre), así que si siempre fue así, no tiene relación con el cambio de software.

### El software no abre de más (se mantiene de la sesión anterior)

El software **no** lo abre de más. Las aperturas del log cuadran 1:1 con `tbasistencia`:

| Día | Aperturas | Filas en `tbasistencia` |
|---|---|---|
| 05-sep | 207 | 207 |
| 07-sep | 612 | 612 |
| 08-sep | 346 | 347 |

### Trampa de diagnóstico

Las aperturas que **exceden** a las huellas identificadas son el **lector de tarjetas**: ese camino
entra por `identificarSocio()` sin pasar por el motor de huella, así que no deja línea en el log de
`acceso-service`. Comparar "aperturas vs. huellas identificadas" da un falso positivo — hay que
comparar contra `tbasistencia`.

### Lo que sí es cierto

**El software nunca manda un comando de cierre.** `R01` es lo único que sale por COM3; no hay `R00`
ni equivalente, ni en `TurnstileService` ni en el sample del SDK (`docs/Identification.java:22`). El
re-bloqueo depende **por completo** del temporizador del controlador del torniquete.

### Hipótesis abierta

`TurnstileService.configurar()` (`TurnstileService.java:63`) corre `mode COM3: BAUD=9600 …` antes de
**cada** escritura, y `mode` deja **DTR y RTS asertados**, cosa que persiste tras terminar el
proceso. Muchos controladores manejan el relé por esas líneas. **Es lo único que BDK nunca hizo.**
Y los 15 `WARN El comando 'mode' no termino a tiempo` están todos en 47 minutos del 7-sep
(05:26–06:13), donde el proceso se mata con `destroyForcibly()` y deja el puerto a medio configurar.

**Contraevidencia:** después se volvió a ver el torniquete **bloqueado**, que es el comportamiento
esperado. El temporizador del controlador sí funciona. (Ya explicado arriba: se vio en un valle.)

**Es la hipótesis más débil de las dos.** DTR/RTS asertados predicen "no se re-bloquea *nunca*",
no "se re-bloquea después de mucho tiempo", que es lo que se reporta y lo que sostienen los huecos
del log. El temporizador rearmado explica el reporte sin necesitar esta pieza.

**Puesta a prueba el 8-sep 22:20:** `acceso.turnstile.configure=false` en
`C:\ProfitAcceso\application.properties` (respaldo en `.bak`), aprovechando la misma ventana de
reinicio del filtro por socio activo. Comprobado antes de aplicarlo que **no hay trampa de
precedencia**: `acceso-service.xml` define `ACCESO_TURNSTILE_ENABLED` y `ACCESO_TURNSTILE_PORT`
pero **no** `ACCESO_TURNSTILE_CONFIGURE`, así que el archivo manda.

**Cómo leer el resultado:** si el torniquete sigue quedándose abierto en hora pico, la hipótesis
DTR/RTS queda descartada y la causa es el temporizador — que se arregla en el controlador, no en el
software. Revertir es volver a `true` y reiniciar `acceso-service` (~25 s).

---

## 3. Las huellas: el enrolamiento produce templates inservibles

### 3.1 Corrección importante — la primera causa raíz estaba mal

Durante la mañana se concluyó que *"el orden decide el ganador"*: como `listarHuellas` no tiene
`ORDER BY`, el enrolamiento más viejo iba primero en el arreglo y `Identify` se quedaba con él. **Es
falso.** El javadoc de `Engine.Identify` dice:

> *"when all possible candidates are identified (i.e., they meet the threshold), they are **ranked by
> their score**. Finally, the function returns as many candidates as requested, based on the
> candidates with the **lowest dissimilarity score**."*

`Identify` devuelve **el mejor match**, no el primero del arreglo. Por lo tanto:

- El `ORDER BY` propuesto **no arregla nada** y quedó retirado de los pendientes.
- Erika no perdía contra su registro dado de baja por orden: **4148 era el único template suyo que
  servía.** El duplicado no causaba la falla — la estaba *enmascarando*.
- Al vaciar 4148 se destapó que su template del registro activo lleva roto desde el enrolamiento.

Los cuatro "duplicados que estorbaban" eran en realidad cuatro socios cuyo enrolamiento reciente
falló, y que seguían entrando gracias a un template viejo bueno colgado de un registro inactivo.

### 3.1b La causa raíz principal: el kiosco matcheaba contra los socios dados de baja

**Aplicado en producción el 8-sep 22:20.** Es la falla que más gente afectaba, y era nuestra.

`listarHuellas` cargaba **todas** las plantillas. BDK no: el `general.log` de junio trae **4607
veces** la consulta con la que cargaba las suyas —

```sql
Select a.Socio, b.NomSocio, a.Huella
  From tbhuellas a left join tbsocios b on a.socio = b.socio
 WHERE b.Activo = 1
```

La divergencia estaba documentada a propósito en `api/.../asistencia.service.ts`, con este
razonamiento: cargarlas todas permite responder `Socio inactivo` en vez de "no reconocida", y *"no
cambia quién entra —el inactivo se rechaza igual—"*.

**Esa premisa era falsa.** `Engine.Identify` rankea por score sobre *todo* el pool (ver 3.1), así
que las plantillas de los dados de baja **compiten** contra las de los activos. Un socio al
corriente que además tiene un expediente viejo con huella es identificado por el expediente viejo y
rechazado por inactivo.

**La escala:** de 4038 plantillas cargadas, **2963 (73%) eran de socios de baja**. BDK matcheaba
contra 1075. Éramos 3.75× más candidatos, y casi tres cuartas partes eran gente que tiene prohibido
entrar.

**Casos confirmados en el log** (11 días, 13 socios inactivos identificados por huella):

| Socio | Expediente que ganaba | Activo real |
|---|---|---|
| Bárbara Rocha Lara | 3861 (baja) — `score=0x0` ×3, 8-sep 17:31 | **3870**, vigente al 10-sep, sin adeudo |
| Sofia Licona | 1952 (baja) — `score=0x0` ×4, 8-sep 15:41 | **5590** |
| Erika, Alejandro, Marian, Geraldine | ya parchados a mano en los pasos 3 y 5 | — |

**Por qué el filtro es seguro:** un match contra un inactivo termina siempre en `acceso: false`
(`registrarAcceso`, rama `if (!socio.activo)`). Quitar esas plantillas **sólo puede convertir
rechazos en entradas, nunca al revés** — no le quita el acceso a nadie. De paso baja el riesgo de
falso positivo: 1076 candidatos en vez de 4039 al mismo umbral.

**Lo que se pierde:** para un socio dado de baja de verdad, recepción ve ahora "huella no
reconocida" y ya no `Socio inactivo` — exactamente lo que veía con BDK. Recuperar ese mensaje sin
volver a meter las plantillas al pool requiere una **segunda pasada** de `Identify` contra sólo los
inactivos, en el camino de "no hubo match". Queda como pendiente.

**Lo que el filtro NO arregla.** Sigue habiendo socios sin ningún expediente duplicado cuyo template
simplemente no identifica — ver 3.2. Son dos fallas distintas y ésta sólo cierra la primera.

### 3.2 El número real: la mitad de los enrolamientos no sirve

Medir "¿identificó alguna vez?" está contaminado: depende de si el socio vino al gimnasio. El cruce
correcto es contra `tbasistencia` — **si entró (hay asistencia) pero nunca lo identificó la huella,
entró con tarjeta y su template falla de verdad.**

De los templates escritos desde el 7-sep, el marcador quedó en **7 fallan, 7 funcionan, 5 sin dato**
(no han vuelto al gimnasio, así que no hay evidencia).

| Falla — entró con tarjeta | Funciona |
|---|---|
| 3436 Gabriela Lopez Sandoval | 2488 Jose Prieto Garza |
| 2109 Claudia Gonzalez Chabre | 4791 Cecilia Madrazo Rangel |
| 5223 Patricio Rios Trevino | 5142 Daniel Guerra de la Fuente |
| 5579 Patricia Ma. Trevino Martinez | 5578 Emma Jasso Sanchez |
| 5195 Sandra Davila Gamez | 5588 Manuel Filizola |
| 5590 Sofia Licona | 2343 Alline Treviño Valdez |
| | 5591 Francisco Jesus Torres |

Más 5523 Marian Fernandez Alonso y 4144 Erika Rodriguez, con template viejo que tampoco sirve.

**Reclasificación (8-sep, noche).** Al revisar cada uno buscando expediente duplicado inactivo, la
lista se parte en dos:

| Lo explica el filtro por socio activo (3.1b) | Sin duplicado — template malo de verdad |
|---|---|
| 5590 Sofia Licona → 1952 | 3436 Gabriela Lopez |
| 3870 Bárbara Rocha → 3861 | 2109 Claudia Gonzalez |
| Erika, Alejandro, Marian, Geraldine (ya parchados) | 5223 Patricio Rios |
| | 5579 Patricia Trevino |
| | 5195 Sandra Davila |
| | 5237 Mariana Fernandez |
| | **5518 Juan Pablo Arce** |

**Juan Pablo Arce (5518) es el caso más informativo del segundo grupo.** Activo, vigente al 11-sep,
**único** "JUAN PABLO ARCE" en la base, sin expediente duplicado. En 11 días de log: **cero
identificaciones**, y asistencias el 30-ago y el 3-sep — entró con tarjeta las dos veces. Intentó el
8-sep a las 06:10 y quedó registrado como tres `Huella no identificada` en 28 segundos
(06:10:07, 06:10:21, 06:10:35), seguidas de otra persona entrando sin problema.

**Su template es del 11-jul-2026.** Eso mueve el problema del enrolamiento **dos meses antes** de la
ventana del 5–7 de septiembre en la que se había centrado esta bitácora.

> **Trampa al diagnosticar esto:** una huella **no identificada no deja ni una línea en el
> `general.log`** de MySQL — no se consulta la base, `Identify` falla contra el caché en memoria y
> ahí muere. Sólo los intentos que *sí* identificaron a alguien aparecen en el log del servidor.
> Para las fallas de reconocimiento, el único registro es `acceso-service.out.log`.

**Reenrolar no lo arregla.** A Sandra la reenrolaron el 8-sep 09:57 y volvió a fallar; a Erika el
7-sep 07:00 y otra vez el 8-sep 10:11. La falla se reproduce en el mismo lugar donde se origina.

### 3.2b El par de control: Sofia y Francisco, con una hora de diferencia

Es la evidencia más limpia de todas, y salió sola mientras se trabajaba en esto.

| | Sofia Licona (5590) | Francisco Jesus Torres (5591) |
|---|---|---|
| Enrolada/o | 8-sep 15:39, **reenrolada 15:42** | 8-sep 16:40:50, un solo `INSERT` |
| Estación | `DESKTOP-NEILI8S` | `DESKTOP-NEILI8S` |
| En el caché | a los ~4 min | 16:43:54 (a los 3 min) |
| Primera identificación | **ninguna en 1 h 40 min** | **16:44:13, `score=0x0`** |

**Misma estación, mismo lector, mismo operador, una hora de diferencia. Una perfecta, la otra
inservible.**

Esto aprieta el diagnóstico de forma decisiva: descarta una configuración equivocada, un formato mal
elegido o un procedimiento mal aprendido — todo eso fallaría *siempre*, no la mitad de las veces. Lo
que falla la mitad de las veces es **algo físico**: suciedad, un cable, un sensor gastado.

De paso, tercera confirmación independiente de que el caché no tiene nada que ver: **3 minutos** de
la escritura en la base a estar identificando.

> ### ⚠️ Corrección (8-sep, noche): el par de control no dice eso
>
> **El "ninguna identificación en 1 h 40 min" de Sofia es falso.** Su dedo sí identificó, y
> perfecto — contra su expediente **dado de baja**:
>
> ```
> 2026-09-08 15:41:20 INFO  Huella identificada: socio=1952 score=0x0
> 2026-09-08 15:41:23 INFO  Huella identificada: socio=1952 score=0x0
> 2026-09-08 15:41:25 INFO  Huella identificada: socio=1952 score=0x0
> 2026-09-08 15:41:32 INFO  Huella identificada: socio=1952 score=0x0
> ```
>
> `1952 = SOFIA T. LICONA`, inactiva, con huella de 2019. La activa es `5590 = SOFIA LICONA`. El
> nombre no es idéntico, por eso un cruce por homónimo exacto no la encuentra.
>
> Cuatro capturas seguidas con `score=0x0` dos minutos después de enrolarla: **el lector leyó su
> dedo perfectamente**. Recepción vio el rechazo por inactiva y la reenroló a las 15:42. Después de
> las 15:41:32 ella dejó de intentar — o sea, la "hora y cuarenta sin identificar" es un periodo en
> el que **no pasó el dedo**, no una ventana de fracaso.
>
> **Consecuencia:** el par de control se cae, y con él la inferencia de "algo físico / lector
> sucio". No queda descartado que el lector influya, pero **ya no hay evidencia que lo sostenga**.
>
> Ojo con una trampa de medición que quedó al descubierto: el template de 5590 se escribió a las
> 15:39 y el caché tarda 1–13 min, así que a las 15:41 **todavía no estaba cargado**. Los cuatro
> matches contra 1952 no prueban que el template de 5590 sea malo — sólo que el pool tenía a la
> inactiva. El caso de Sofia queda **sin veredicto** hasta que vuelva a intentar con el filtro ya
> puesto.

### 3.3 Lo que dijo el `general.log`

`C:\Users\Admin\Documents\db_logs\general copy 15.log` cubre 5-sep 13:42 → 7-sep 11:32. Trae **11
escrituras a `tbhuellas`, todas desde `DESKTOP-NEILI8S`**:

| Hora | Socio | | Resultado |
|---|---|---|---|
| 06:02:22 | 3436 Gabriela Lopez Sandoval | UPDATE | falla |
| 06:03:50 | 3436 Gabriela Lopez Sandoval — *otra vez, 88 s después* | UPDATE | falla |
| 06:10:44 | 2550 Manuel E. Familiar | UPDATE | sin dato |
| 07:00:24 | 4144 Erika Adriana Rodriguez | UPDATE | falla |
| 07:04:41 | 2488 Jose Prieto Garza | UPDATE | funciona |
| 07:15:28 | 4791 Cecilia Madrazo Rangel | UPDATE | funciona |
| 08:24:38 | 5142 Daniel Guerra de la Fuente | UPDATE | funciona |
| 08:26:12 | 5579 Patricia Ma. Trevino | INSERT | falla |
| 08:49:56 | 2109 Claudia Gonzalez Chabre | UPDATE | falla |
| 09:56:53 | 5578 Emma Jasso Sanchez | INSERT | funciona |
| 10:53:15 | 5585 Rodrigo Rivas Garza | INSERT | sin dato |

Dos señales de comportamiento:

- **A Gabriela la enrolaron dos veces con 88 segundos de diferencia.** Eso no es rutina: es el
  operador viendo que algo salió mal y repitiendo en el acto. Las dos veces quedó inservible.
- **8 de las 11 escrituras son `UPDATE`**, o sea reenrolamientos de gente que ya tenía huella.
  Recepción lleva días repitiendo enrolamientos sin saber que el problema se reproduce cada vez.

*(El otro respaldo, `general copy 16.log`, es de junio y no cubre la ventana. Sirvió sólo para la
topología.)*

### 3.4 Por qué nadie lo nota en el momento

**Un template malo es indistinguible de uno bueno desde la base.** Se comparó byte a byte los que
fallan contra los que funcionan: mismo header (`413709ab…`), los mismos 1632 bytes, `descartados: 0`
al importar, y el conteo de bytes no-cero se traslapa por completo (1536–1549 en ambos grupos).

Sólo el motor de matching sabe que no sirve. Recepción enrola, el sistema dice "listo", y el socio
se estrella contra el torniquete al día siguiente.

---

## 4. Qué dice el SDK sobre calidad (`U.are.U SDK\Windows\Docs`)

### No se puede medir la calidad de lo ya guardado

- **El `Engine` de Java no expone calidad.** La interfaz completa es `SelectEngine`, `CreateFmd`
  (×2), `Compare`, `Identify`, `CreateEnrollmentFmd`.
- **Una plantilla de registro no puede usarse como sonda.** Se intentó comparar el template viejo
  bueno de Erika contra el nuevo: `Compare` e `Identify` rechazan ambos con
  **`URU_E_INVALID_PARAMETER` (0x5BA0014)**, incluso comparando una plantilla consigo misma.
  Importan bien (`views=1, bytes=1632`) pero el motor sólo las acepta del lado enrolado.
- **La interfaz `Quality` trabaja sobre imágenes, no sobre templates.** Sus dos métodos,
  `NfiqFid(Fid, view, alg)` y `NfiqRaw(bytes, w, h, dpi, bpp, alg)`, calculan NFIQ (escala NIST,
  1 = excelente a 5 = mala) con `QUALITY_NFIQ_NIST` o `QUALITY_NFIQ_AWARE`. `tbhuellas` guarda
  `Fmd`; la imagen se descarta al enrolar y nunca llega a la base.

**Conclusión: comparar necesita una lectura viva y medir calidad necesita la imagen. Ninguna de las
dos sobrevive a lo que se persiste.**

### El SDK no valida calidad automáticamente al enrolar

`CreateEnrollmentFmd(format, callback)` llama repetidamente a `EnrollmentCallback.GetFmd()` para
juntar varias capturas, y recibe un `PreEnrollmentFmd` con **exactamente dos campos: `fmd` y
`view_index`**. No hay campo de calidad y el SDK no calcula NFIQ por su cuenta.

Lo que sí exige es que las capturas sean **consistentes entre sí** — mismo dedo. Pero consistencia
no es calidad: varias capturas igual de malas son perfectamente consistentes entre ellas. El SDK las
acepta y sale un template pobre pero coherente, que después falla contra una captura buena.

**Validar calidad es opt-in:** la aplicación debe llamar `Quality.Nfiq*` sobre la imagen, por su
cuenta, antes de pasar el FMD al callback. Si BDK no lo hace —su ActiveX es de 2010— nada impide que
un enrolamiento malo se guarde como bueno.

### `Reader.CaptureQuality` incluye `READER_DIRTY`

El enum de retroalimentación por captura trae `GOOD`, `NO_FINGER`, `FINGER_OFF_CENTER`,
`FINGER_TOO_HIGH/LOW/LEFT/RIGHT`, `SCAN_SKEWED`, `SCAN_TOO_FAST/SLOW/LONG/SHORT`, `FAKE_FINGER`,
`TIMED_OUT` y **`READER_DIRTY` — "reader needs cleaning"**.

DigitalPersona considera "el lector está sucio" una condición lo bastante común como para darle su
propio valor de retorno. Encaja con un lector que produce capturas buenas la mitad de las veces.

### Sobre bajar el umbral

`acceso.match.false.positive.denominator=100000` se pasa como `PROBABILITY_ONE / denominador` a
`Identify`. Bajarlo lo hace más permisivo; es sólo config más un reinicio de `acceso-service`.

**No arregla estos casos.** Todas las identificaciones exitosas del log salen con `score=0x0` —
disimilitud cero, match perfecto. Los que fallan no están *apenas debajo* del umbral: no aparecen
como candidatos. Y el costo es real: un falso positivo abre el torniquete a la persona equivocada
**y registra la asistencia en la cuenta de otro socio**.

**Sí sirve como diagnóstico temporal:** si al bajarlo Erika o Sandra entran, sus templates son
marginales; si no, son basura. Se revierte en un minuto.

---

## Acciones ejecutadas

1. **Refresh del caché** (`POST /api/templates/refresh`). Devolvió `4040 / 0 descartados`, idéntico:
   **el caché no era la causa.**
2. **Respaldo** de cuatro huellas → `C:\ProfitAcceso\backup-huellas-inactivos-20260908.json`.
3. **Parche interino** (`~11:14`): vaciada la columna `huella` de cuatro registros dados de baja.
   4 filas afectadas; `tbhuellas` pasó a `4040 filas / 4036 con huella`.

   ```sql
   UPDATE tbhuellas h
     JOIN tbsocios s ON s.socio = h.socio
      SET h.huella = ''
    WHERE h.id IN (745, 1610, 2411, 2788)   -- socios 2111, 2965, 32586, 4148
      AND s.activo = 0;
   ```

   Se vació la columna en vez de borrar la fila: `listarHuellas` filtra
   `WHERE huella IS NOT NULL AND huella <> ''`, así que sale del caché y se conserva la fila, su
   `dedo`, su `fecnvo` y el rastro de auditoría.
4. **Refresh** → `4036 templates`, en caliente y sin corte.

> **Este parche no cambió quién entra, pero tiró evidencia valiosa.** Antes, Erika y Alejandro eran
> reconocidos por el registro inactivo y rechazados con `Socio inactivo`; después, no son
> reconocidos y salen como huella desconocida. **Denegados en ambos casos** — el parche no les quitó
> acceso.
>
> Lo que sí hizo fue vaciar cuatro templates que estaban *demostradamente buenos*: el de 4148
> identificó 8 veces, el de 32586 nueve, y los de 2111 y 2965 tres cada uno. Son capturas probadas
> del dedo de esas cuatro personas — y eso resultó ser justo el material del paso 5.

5. **Copia de los templates probados al registro activo** (`17:11:49`). Confirmado con recepción que
   cada par es la misma persona. Se movió la captura *probada* del registro dado de baja al registro
   que sí está activo:

   | Persona | Template | → Registro activo | Matches probados |
   |---|---|---|---|
   | Erika Adriana Rodriguez | de 4148 | **4144** | 8 |
   | Alejandro Serrano Villalvazo | de 32586 | **3766** | 9 |
   | Marian Fernandez Alonso | de 2111 | **5523** | 3 |
   | Geraldine Reyes Garcia | de 2965 | **2969** | 3 |

   Es el arreglo de fondo para esas cuatro, y no depende del lector ni de reenrolar: no son capturas
   nuevas de una estación sospechosa, son capturas que ya demostraron identificar y sólo estaban
   colgadas del registro equivocado.

   **Dos trampas que costó pasar:**

   - **MySQL 5.1 no tiene `FROM_BASE64`** (llegó en 5.6). El primer intento abortó ahí.
   - **`huella` es `mediumtext` en `latin1_swedish_ci`.** Hay que escribir con el introducer
     `_latin1` sobre un literal hexadecimal, que es como lo hace BDK; sin eso MySQL convierte los
     bytes al charset de la conexión y corrompe el template — la misma trampa que documenta
     `listarHuellas` para la lectura. Verificado byte a byte contra el respaldo: intactos.

   ```sql
   UPDATE tbhuellas h JOIN tbsocios s ON s.socio = h.socio
      SET h.huella = _latin1 0x<hex del template probado>
    WHERE h.socio = <socio activo> AND s.activo = 1;
   ```

   Lo que tenían antes quedó respaldado en `C:\ProfitAcceso\backup-huellas-destino-20260908.json`.

6. **Refresh** → `4038 templates`, en caliente y sin corte.

**Hasta aquí, la tanda de la mañana.** No se tocó la config del torniquete ni se reinició nada.

---

### Tanda de la noche (8-sep 22:20) — dos cambios en una sola ventana

7. **Filtro por socio activo en `listarHuellas`** (ver 3.1b). El query pasó a

   ```sql
   SELECT h.socio, CAST(h.huella AS BINARY) AS huella
     FROM tbhuellas h JOIN tbsocios s ON s.socio = h.socio
    WHERE h.huella IS NOT NULL AND h.huella <> '' AND s.activo = 1
   ```

   Compilado con `npm run build`. El comentario del método, que argumentaba lo contrario, se
   reescribió con el porqué del cambio.

8. **`acceso.turnstile.configure=false`** en `C:\ProfitAcceso\application.properties` (respaldo en
   `application.properties.bak`), para probar la hipótesis DTR/RTS de la sección 2.

9. **Reinicio.** `acceso-service` **depende** de `profit-api`, así que no basta reiniciar el API:
   la secuencia es `Stop-Service acceso-service; Restart-Service profit-api; Start-Service
   acceso-service`. Se esperó a un hueco de 38 min sin aperturas (última: 21:42:34).

   **Resultado: `Templates cargados: 1076 importados, 0 descartados de 1076 filas`**, contra 4039
   antes. `/api/health` → `{"status":"OK","templates":1076,"turnstile":{"port":"COM3",
   "enabled":true}}`.

> **Tropiezo, para no repetirlo:** al arrancar los dos servicios seguidos, `acceso-service` levantó
> **antes** de que Nest terminara de escuchar y se quedó con `ConnectException` y **0 templates en
> caché** — el torniquete no habría identificado a nadie durante los 15 min hasta el refresh
> siguiente. Se resolvió reiniciando sólo `acceso-service` una segunda vez. **Dejar más margen
> entre el `Restart-Service profit-api` y el `Start-Service acceso-service`, y siempre verificar la
> línea `Templates cargados` antes de dar por buena la ventana.**

> **Rastro en el `general.log`:** las escrituras de esta sesión aparecen atribuidas a
> `DESKTOP-VK579FE` — un `UPDATE` a las 17:10:54 (el intento fallido de `FROM_BASE64`) y cuatro a
> las 17:11:49. Anotado para que nadie las confunda con enrolamientos de recepción al auditar.

---

## Pendientes

- [ ] **PRIMERO: verificar el filtro con gente real.** Mañana 9-sep, revisar que no haya un pico de
      `Huella no identificada` ni quejas nuevas. Comprobar en particular a **Bárbara Rocha (3870)** y
      **Sofia Licona (5590)**, que son los dos casos que el filtro debería destrabar. Si Bárbara
      sigue fallando es porque su dedo bueno está en `dedo=7` (expediente 3861) y el activo tiene
      `dedo=2`: entonces toca copiarle el template probado como en el paso 5, o reenrolarla.
- [ ] **Medir el temporizador del torniquete** (sección 2). En un valle, anotar el minuto en que se
      traba y restarle la última apertura del log. Y preguntar a recepción **desde cuándo** se queda
      abierto: si "siempre", no tiene relación con el cambio de software.
- [ ] **Leer el resultado de `configure=false`** (sección 2). Si el torniquete sigue igual en hora
      pico, la hipótesis DTR/RTS queda descartada y la causa es el temporizador del controlador.
- [ ] **Limpiar el lector de `DESKTOP-NEILI8S`.** Sigue siendo gratis y `READER_DIRTY` sigue siendo
      una constante de primera clase del SDK — pero **ya no hay evidencia que lo señale**: el par de
      control que lo sostenía se cayó (ver la corrección en 3.2b). Hacerlo por higiene, no como
      diagnóstico.
- [ ] **Segunda pasada de `Identify` contra los inactivos** para recuperar el mensaje
      `Socio inactivo` que el filtro de 3.1b le quitó a recepción. Sólo en el camino de "no hubo
      match", así que no toca el camino normal.
- [ ] **Verificar que las cuatro del paso 5 ya entran.** Erika (4144), Alejandro (3766), Marian
      (5523) y Geraldine (2969). Al cierre de la sesión ninguna había pasado el dedo todavía. Si
      alguna sigue fallando, ya no es el duplicado ni el enrolamiento: habría que mirar su caso
      aparte.
- [ ] **Verificar el enrolamiento en el acto.** Que después de enrolar, la persona pase el dedo en
      el torniquete antes de irse de recepción. Es la única verificación real que existe hoy — y el
      caso Francisco (3 min del enrolamiento a identificar) muestra que el tiempo de espera no es
      excusa para saltárselo.
- [ ] **Detección automática al día siguiente.** Listar socios enrolados en los últimos N días que
      registraron asistencia pero nunca por huella — el mismo cruce de 3.2. Convierte una falla
      silenciosa en un aviso.
- [ ] **Reenrolar a los que quedan fallando** — los que **no** tienen expediente duplicado, o sea
      los que el filtro no arregla: 3436 Gabriela Lopez, 2109 Claudia Gonzalez, 5223 Patricio Rios,
      5579 Patricia Trevino, 5195 Sandra Davila, 5237 Mariana Fernandez Garza y **5518 Juan Pablo
      Arce**. Sofia (5590) sale de esta lista: su caso queda sin veredicto hasta que reintente con
      el filtro puesto.
- [ ] **Borrar los dos respaldos biométricos** cuando ya no hagan falta, en
      `C:\ProfitAcceso\`:
      - `backup-huellas-inactivos-20260908.json` — ya no es copia única: sus cuatro templates viven
        ahora en los registros activos.
      - `backup-huellas-destino-20260908.json` — **sí es copia única** de los cuatro templates malos
        que se sobreescribieron. Sólo tiene valor si hay que revertir el paso 5.

### Opcional, si se quiere instrumentar de verdad

El kiosco captura en `SampleFormat.Intermediate`. Si capturara además la imagen (`Raw` o
`PngImage`), `acceso-service` podría llamar `NfiqRaw` y **registrar el NFIQ de cada intento**. Eso
separaría dos cosas que hoy no se distinguen: si un fallo viene de un template malo guardado o de
una lectura mala en el torniquete.

---

## Hipótesis descartadas

Anotadas para que nadie las vuelva a recorrer.

| Hipótesis | Por qué se cayó |
|---|---|
| El caché está viejo | Recarga puntual cada 15 min; un enrolamiento nuevo aparece en **1–13 min**. Verificado 12:28 → 15:58 sin fallar. |
| Cambio de formato en los templates | Headers idénticos entre los que sirven y los que no; mismos 1632 bytes; `descartados: 0`. |
| El orden del arreglo decide el match | `Identify` rankea por score y devuelve el mejor. Ver 3.1. |
| El build del 7-sep 18:41 rompió el enrolamiento | Los fallos y aciertos se alternan a ambos lados de esa hora. No hay corte temporal. |
| El kiosco le pelea el lector a BDK al enrolar | En el kiosco no se enrola. Confirmado por el `general.log`: las escrituras salen de `DESKTOP-NEILI8S`. |
| Los registros duplicados causaban la falla | Al revés: eran lo único que hacía entrar a esos socios. Ver 3.1. **Matizado el 8-sep:** sí causaban falla, pero por competir en el pool de `Identify`, no por orden. Ver 3.1b. |
| Cargar las plantillas de los inactivos "no cambia quién entra" | Falso. Compiten en el ranking de `Identify` y le ganan al expediente activo. 2963 de 4038 plantillas eran de socios de baja. Ver 3.1b. |
| El par Sofia/Francisco prueba que la falla es física | El "nunca identificó" de Sofia era en realidad *identificó cuatro veces contra su expediente inactivo*. Ver la corrección en 3.2b. |
| El torniquete se queda abierto porque el software no cierra | El software efectivamente nunca cierra, pero eso no basta: el controlador **sí** tiene temporizador. Lo que pasa es que cada `R01` lo rearma y en hora pico no alcanza a expirar. Ver sección 2. |

---

## Consultas útiles

**Separar fallas reales de "no ha vuelto"** — el cruce que resolvió el caso: identificaciones en el
log de `acceso-service` contra filas en `tbasistencia`, ambas posteriores a la escritura del
template. Si hay asistencia pero no identificación, entró con tarjeta y la huella falla.

**Pares activo/inactivo homónimos con huella.** Agrupar por nombre normalizado en la aplicación; el
self-join en SQL tarda minutos porque `tbsocios.nomsocio` no tiene índice.

```sql
SELECT s.socio, TRIM(s.nomsocio) nombre, s.activo
  FROM tbhuellas h JOIN tbsocios s ON s.socio = h.socio
 WHERE h.huella IS NOT NULL AND h.huella <> '';
```

**Aperturas contra asistencias**, para saber si el torniquete se abre de más:

```bash
grep -c "^<fecha>.*Torniquete abierto" logs/acceso-service.out.log
```
```sql
SELECT DATE(fecha) dia, COUNT(*) FROM tbasistencia GROUP BY 1;
```

**Quién escribe `tbhuellas`**, sobre el `general.log` del servidor (`general_log = ON`,
`log_output = FILE`, en `C:\ProgramData\MySQL\MySQL Server 5.1\data\`). Mapear el id de hilo de las
líneas `Connect` a las de `Query` para atribuir cada escritura a su host.
