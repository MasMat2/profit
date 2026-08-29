package com.profit.acceso.fingerprint;

import com.digitalpersona.uareu.Fmd;
import com.profit.acceso.Log;
import com.profit.acceso.ServiceException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
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
 * <p>El reemplazo de la cache es un swap atomico de la referencia: una identificacion en curso
 * sigue usando el arreglo con el que empezo y nunca ve un estado a medias. Si la descarga falla
 * se conserva el ultimo snapshot bueno: un corte de red no debe dejar el gimnasio sin acceso.
 */
public final class TemplateLoader implements AutoCloseable {

  private final AtomicReference<TemplateSnapshot> cache =
      new AtomicReference<>(TemplateSnapshot.VACIO);

  private final FmdImporter importer;
  private final NativeExecutor nativo;
  private final String apiBaseUrl;
  private final String apiKey;
  private final HttpClient client =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

  private final ScheduledExecutorService scheduler =
      Executors.newSingleThreadScheduledExecutor(
          runnable -> {
            Thread thread = new Thread(runnable, "template-refresh");
            thread.setDaemon(true);
            return thread;
          });

  public TemplateLoader(
      FmdImporter importer, NativeExecutor nativo, String apiBaseUrl, String apiKey) {
    this.importer = importer;
    this.nativo = nativo;
    this.apiBaseUrl =
        apiBaseUrl.endsWith("/") ? apiBaseUrl.substring(0, apiBaseUrl.length() - 1) : apiBaseUrl;
    this.apiKey = apiKey == null ? "" : apiKey;
  }

  public TemplateSnapshot current() {
    return cache.get();
  }

  /** Carga inicial + refresco periodico. La carga inicial no tumba el arranque si falla. */
  public void iniciar(Duration intervalo) {
    refrescarSinFallar();
    scheduler.scheduleWithFixedDelay(
        this::refrescarSinFallar,
        intervalo.toMillis(),
        intervalo.toMillis(),
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

  /** Descarga, importa y publica un snapshot nuevo. */
  public TemplateSnapshot refrescar() throws Exception {
    HttpRequest request =
        HttpRequest.newBuilder()
            .uri(URI.create(apiBaseUrl + "/asistencia/huellas"))
            .header("x-acceso-key", apiKey)
            .header("Accept", "text/plain")
            .timeout(Duration.ofSeconds(60))
            .GET()
            .build();

    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

    if (response.statusCode() == 401 || response.statusCode() == 403) {
      throw ServiceException.apiNoDisponible(
          "El API rechazo la llave (HTTP " + response.statusCode() + "): revisa ACCESO_API_KEY");
    }
    if (response.statusCode() != 200) {
      throw ServiceException.apiNoDisponible("El API respondio HTTP " + response.statusCode());
    }

    List<String> lineas =
        response.body().lines().map(String::trim).filter(l -> !l.isEmpty()).toList();

    TemplateSnapshot snapshot = nativo.call("importar templates", () -> importar(lineas));
    cache.set(snapshot);

    Log.info(
        "Templates cargados: %d importados, %d descartados de %d filas.",
        snapshot.size(), snapshot.descartados(), lineas.size());
    return snapshot;
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
        descartados);
  }

  @Override
  public void close() {
    scheduler.shutdownNow();
  }
}
