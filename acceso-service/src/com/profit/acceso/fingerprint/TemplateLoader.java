package com.profit.acceso.fingerprint;

import com.digitalpersona.uareu.Fmd;
import com.profit.acceso.Log;
import com.profit.acceso.ServiceException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Descarga los templates desde el API NestJS y mantiene la cache en memoria.
 *
 * <p>Se prefirio esto a un JDBC directo contra MySQL (como hace el sample del SDK) para no dejar
 * credenciales de base de datos en cada kiosco y mantener un solo punto de acceso a los datos.
 *
 * <p>El API responde texto plano, una linea por huella: {@code socio,base64}. La coma es
 * separador seguro porque el alfabeto base64 no la contiene. Es el unico consumidor de ese
 * endpoint, y asi el servicio no necesita parsear JSON.
 *
 * <p>Dos caminos para mantener la cache al dia. La <b>recarga completa</b> baja todo (~13 MB y
 * ~4000 importaciones del SDK) y es la red de seguridad: borrados, o cualquier cosa que el
 * sondeo no vea. El <b>sondeo</b> pide al API solo los socios que cambiaron desde la ultima
 * marca y los fusiona en el snapshot: es lo que hace que un socio recien enrolado en recepcion
 * pase el torniquete en segundos y no en 15 minutos. La marca es texto opaco que genera el API
 * (viaja en el header {@code X-Huellas-Marca}) y aqui solo se devuelve tal cual. Sin marca no
 * hay sondeo, asi que un API viejo que no la manda deja al servicio exactamente como antes.
 *
 * <p>El reemplazo de la cache es un swap atomico de la referencia: una identificacion en curso
 * sigue usando el arreglo con el que empezo y nunca ve un estado a medias. Si la descarga falla
 * se conserva el ultimo snapshot bueno: un corte de red no debe dejar el gimnasio sin acceso.
 *
 * <p>Ademas mantiene una segunda cache, {@link #currentInactivos()}, de solo socios dados de
 * baja: {@code MatcherService} la consulta como segunda pasada cuando la primera no encuentra
 * nada, para poder avisar "Socio inactivo" sin que esas plantillas compitan con las de un socio
 * al corriente. Se recarga junto con la principal, sin sondeo de cambios propio.
 */
public final class TemplateLoader implements AutoCloseable {

  /** Header con la marca, en ambas respuestas del API. {@code HttpHeaders} ignora mayusculas. */
  private static final String HEADER_MARCA = "X-Huellas-Marca";

  private final AtomicReference<TemplateSnapshot> cache =
      new AtomicReference<>(TemplateSnapshot.VACIO);

  /**
   * Sólo socios dados de baja. La usa {@code MatcherService} como segunda pasada de
   * {@code Identify}, nunca junto con {@link #cache} en el mismo llamado. Sin sondeo de cambios:
   * quién está dado de baja cambia poco y no vale la pena la complejidad para un mensaje que no
   * afecta a quién entra — se recarga completa junto con {@link #cache} en {@link #refrescar()}.
   */
  private final AtomicReference<TemplateSnapshot> cacheInactivos =
      new AtomicReference<>(TemplateSnapshot.VACIO);

  /**
   * Serializa descarga -> importacion -> swap -> marca. El scheduler es de un solo hilo, pero el
   * refresco manual ({@code POST /api/templates/refresh}) llega por el pool del ApiServer en
   * paralelo, y una recarga completa y un sondeo encimados podrian pisarse la marca. Las
   * identificaciones no lo toman: solo leen {@link #current()}.
   */
  private final Object lock = new Object();

  private final FmdImporter importer;
  private final NativeExecutor nativo;
  private final String apiBaseUrl;
  private final String apiKey;
  private final Duration intervaloCompleto;
  private final Duration intervaloSondeo;
  private final HttpClient client =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

  private final ScheduledExecutorService scheduler =
      Executors.newSingleThreadScheduledExecutor(
          runnable -> {
            Thread thread = new Thread(runnable, "template-refresh");
            thread.setDaemon(true);
            return thread;
          });

  /**
   * Marca del ultimo cuerpo aplicado. Null = sin sondeo: API sin la marca, o un sondeo que
   * respondio mal; la siguiente recarga completa la vuelve a traer y el sondeo se reactiva solo.
   */
  private volatile String marca;

  /** Guardados por {@link #lock}. */
  private boolean avisoSinMarca;
  private Set<Integer> ultimoDelta = Set.of();

  /** Solo lo toca el hilo del scheduler. */
  private boolean sondeoFallando;

  /**
   * @param intervaloCompleto cada cuanto se baja todo
   * @param intervaloSondeo cada cuanto se piden solo los cambios; cero o negativo lo apaga
   */
  public TemplateLoader(
      FmdImporter importer,
      NativeExecutor nativo,
      String apiBaseUrl,
      String apiKey,
      Duration intervaloCompleto,
      Duration intervaloSondeo) {
    this.importer = importer;
    this.nativo = nativo;
    this.apiBaseUrl =
        apiBaseUrl.endsWith("/") ? apiBaseUrl.substring(0, apiBaseUrl.length() - 1) : apiBaseUrl;
    this.apiKey = apiKey == null ? "" : apiKey;
    this.intervaloCompleto = intervaloCompleto;
    this.intervaloSondeo = intervaloSondeo;
  }

  public TemplateSnapshot current() {
    return cache.get();
  }

  public TemplateSnapshot currentInactivos() {
    return cacheInactivos.get();
  }

  /** Marca vigente, o null si el sondeo esta apagado. Para {@code /api/health}. */
  public String marca() {
    return marca;
  }

  public Duration intervaloSondeo() {
    return intervaloSondeo;
  }

  /**
   * Carga inicial, recarga completa periodica y sondeo de cambios. La carga inicial no tumba el
   * arranque si falla.
   */
  public void iniciar() {
    refrescarSinFallar();
    scheduler.scheduleWithFixedDelay(
        this::refrescarSinFallar,
        intervaloCompleto.toMillis(),
        intervaloCompleto.toMillis(),
        TimeUnit.MILLISECONDS);

    if (intervaloSondeo.isZero() || intervaloSondeo.isNegative()) {
      Log.info("Sondeo de cambios de huellas apagado por configuracion.");
      return;
    }
    scheduler.scheduleWithFixedDelay(
        this::sondearSinFallar,
        intervaloSondeo.toMillis(),
        intervaloSondeo.toMillis(),
        TimeUnit.MILLISECONDS);
  }

  private void refrescarSinFallar() {
    try {
      refrescar();
    } catch (Exception e) {
      Log.error(
          "No se pudieron refrescar los templates desde %s (%s). Se conservan %d en cache.",
          apiBaseUrl, ServiceException.motivo(e), cache.get().size());
    }
  }

  private void sondearSinFallar() {
    try {
      sondear();
      if (sondeoFallando) {
        sondeoFallando = false;
        Log.info("El sondeo de cambios de huellas volvio a responder.");
      }
    } catch (Exception e) {
      // Con el API caido esto se veria cada pocos segundos: se avisa una vez y se reintenta en
      // silencio. La cache sigue sirviendo mientras tanto.
      if (sondeoFallando) {
        Log.debug("El sondeo de cambios sigue fallando: %s", ServiceException.motivo(e));
      } else {
        sondeoFallando = true;
        Log.warn(
            "No se pudieron sondear cambios de huellas en %s (%s). Se conserva la cache y se"
                + " reintenta cada %d s en silencio.",
            apiBaseUrl, ServiceException.motivo(e), intervaloSondeo.toSeconds());
      }
    }
  }

  /** Descarga todo, importa y publica un snapshot nuevo. */
  public TemplateSnapshot refrescar() throws Exception {
    synchronized (lock) {
      Descarga descarga = descargarYImportar("/asistencia/huellas", "Templates");
      cache.set(descarga.snapshot());
      ultimoDelta = Set.of();
      adoptarMarca(descarga.response());

      refrescarInactivosSinFallar();
      return descarga.snapshot();
    }
  }

  /**
   * No debe poder tumbar la recarga de {@link #cache}, que es la que decide quien entra: un API
   * viejo sin este endpoint (404) o cualquier otro fallo sólo apaga la segunda pasada de
   * `Identify` y conserva la ultima carga de inactivos.
   */
  private void refrescarInactivosSinFallar() {
    try {
      Descarga descarga =
          descargarYImportar("/asistencia/huellas/inactivas", "Templates de inactivos");
      cacheInactivos.set(descarga.snapshot());
    } catch (Exception e) {
      Log.warn(
          "No se pudieron cargar las huellas de inactivos (%s); se conserva la ultima carga (%d"
              + " templates).",
          ServiceException.motivo(e), cacheInactivos.get().size());
    }
  }

  private record Descarga(TemplateSnapshot snapshot, HttpResponse<String> response) {}

  /** Fetch + import compartido por {@link #refrescar()} y {@link #refrescarInactivosSinFallar()}. */
  private Descarga descargarYImportar(String ruta, String etiqueta) throws Exception {
    HttpResponse<String> response = pedir(ruta, Duration.ofSeconds(60));

    if (response.statusCode() == 401 || response.statusCode() == 403) {
      throw ServiceException.apiNoDisponible(
          "El API rechazo la llave (HTTP " + response.statusCode() + "): revisa ACCESO_API_KEY");
    }
    if (response.statusCode() != 200) {
      throw ServiceException.apiNoDisponible("El API respondio HTTP " + response.statusCode());
    }

    List<String> lineas = lineas(response.body());
    TemplateSnapshot snapshot = nativo.call("importar " + etiqueta, () -> importar(lineas));
    Log.info(
        "%s cargados: %d importados, %d descartados de %d filas.",
        etiqueta, snapshot.size(), snapshot.descartados(), lineas.size());
    return new Descarga(snapshot, response);
  }

  /**
   * Pide al API solo lo que cambio desde la marca y lo fusiona en la cache. Sin marca no hace
   * nada.
   */
  public void sondear() throws Exception {
    synchronized (lock) {
      String desde = marca;
      if (desde == null) {
        return;
      }

      HttpResponse<String> response =
          pedir(
              "/asistencia/huellas/cambios?marca="
                  + URLEncoder.encode(desde, StandardCharsets.UTF_8),
              Duration.ofSeconds(30));

      if (response.statusCode() != 200) {
        // 404 es un API sin el endpoint; 400, una marca que no entiende. En los dos casos no hay
        // con que seguir: la proxima recarga completa trae una marca nueva y esto vuelve solo.
        marca = null;
        Log.warn(
            "El sondeo de cambios respondio HTTP %d. Se apaga hasta la proxima recarga completa"
                + " (cada %d min).",
            response.statusCode(), intervaloCompleto.toMinutes());
        return;
      }

      List<String> lineas = lineas(response.body());

      if (lineas.isEmpty()) {
        ultimoDelta = Set.of();
      } else {
        // Se toman de las lineas ANTES de importar: aunque un template no importe, lo viejo de
        // ese socio sale igual, que es lo que haria la recarga completa.
        Set<Integer> sociosCambiados = sociosDe(lineas);
        TemplateSnapshot delta = nativo.call("importar cambios", () -> importar(lineas));
        TemplateSnapshot fusionado = cache.get().fusionar(sociosCambiados, delta);
        cache.set(fusionado);

        // El margen de reloj del API reenvia lo mismo durante un par de minutos: solo la
        // primera vez es noticia.
        if (sociosCambiados.equals(ultimoDelta)) {
          Log.debug(
              "Sondeo: los mismos %d socios que la vez anterior, reimportados.",
              sociosCambiados.size());
        } else {
          Log.info(
              "Huellas actualizadas: %d templates de %d socios (%d en cache).",
              delta.size(), sociosCambiados.size(), fusionado.size());
        }
        ultimoDelta = sociosCambiados;
      }

      adoptarMarca(response);
    }
  }

  private HttpResponse<String> pedir(String rutaYQuery, Duration timeout) throws Exception {
    HttpRequest request =
        HttpRequest.newBuilder()
            .uri(URI.create(apiBaseUrl + rutaYQuery))
            .header("x-acceso-key", apiKey)
            .header("Accept", "text/plain")
            .timeout(timeout)
            .GET()
            .build();
    return client.send(request, HttpResponse.BodyHandlers.ofString());
  }

  private void adoptarMarca(HttpResponse<?> response) {
    String nueva = response.headers().firstValue(HEADER_MARCA).orElse(null);
    if (nueva == null) {
      if (!avisoSinMarca) {
        avisoSinMarca = true;
        Log.warn(
            "El API no manda %s: sin sondeo de cambios, solo la recarga completa cada %d min."
                + " Un socio recien enrolado tarda eso en poder entrar; actualiza el API.",
            HEADER_MARCA, intervaloCompleto.toMinutes());
      }
    } else {
      avisoSinMarca = false;
    }
    marca = nueva;
  }

  private static List<String> lineas(String cuerpo) {
    return cuerpo.lines().map(String::trim).filter(l -> !l.isEmpty()).toList();
  }

  private static Set<Integer> sociosDe(List<String> lineas) {
    Set<Integer> socios = new HashSet<>();
    for (String linea : lineas) {
      int coma = linea.indexOf(',');
      if (coma <= 0) {
        continue;
      }
      try {
        socios.add(Integer.parseInt(linea.substring(0, coma).trim()));
      } catch (NumberFormatException e) {
        // importar() la cuenta como descartada
      }
    }
    return socios;
  }

  /** Cada linea es {@code socio,base64}. */
  private TemplateSnapshot importar(List<String> lineas) {
    List<Fmd> fmds = new ArrayList<>(lineas.size());
    List<Integer> socios = new ArrayList<>(lineas.size());
    int descartados = 0;

    for (String linea : lineas) {
      int coma = linea.indexOf(',');
      if (coma <= 0 || coma == linea.length() - 1) {
        descartados++;
        continue;
      }

      try {
        int socio = Integer.parseInt(linea.substring(0, coma).trim());
        byte[] datos = Base64.getDecoder().decode(linea.substring(coma + 1));
        fmds.add(importer.importarPlantilla(datos));
        // Solo despues de que el import tuvo exito, para no desalinear los indices.
        socios.add(socio);
      } catch (Exception e) {
        descartados++;
        Log.debug(
            "Template descartado (%s): %s",
            linea.substring(0, Math.min(coma, 20)), UareUErrors.describir(e));
      }
    }

    if (descartados > 0) {
      Log.warn(
          "%d templates no se pudieron importar. Suele ser corrupcion de bytes en el traslado"
              + " desde MySQL; revisa el CAST(huella AS BINARY) del API.",
          descartados);
    }

    return new TemplateSnapshot(
        fmds.toArray(new Fmd[0]),
        socios.stream().mapToInt(Integer::intValue).toArray(),
        Instant.now(),
        null,
        descartados);
  }

  @Override
  public void close() {
    scheduler.shutdownNow();
  }
}
