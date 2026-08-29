package com.profit.acceso;

import com.digitalpersona.uareu.Fmd;
import com.profit.acceso.fingerprint.FmdFormatProbe;
import com.profit.acceso.fingerprint.FmdImporter;
import com.profit.acceso.fingerprint.MatcherService;
import com.profit.acceso.fingerprint.NativeExecutor;
import com.profit.acceso.fingerprint.TemplateLoader;
import com.profit.acceso.turnstile.TurnstileService;
import com.profit.acceso.web.ApiServer;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/** Arranque y cableado del servicio. */
public final class Main {

  public static void main(String[] args) throws Exception {
    List<String> argumentos = List.of(args);

    Config config = Config.load(Path.of(opcion(argumentos, "config", "application.properties")));
    Log.setDebug(config.getBool("acceso.debug", false));

    FmdImporter importer =
        new FmdImporter(config.getFormat("acceso.match.input.format", Fmd.Format.DP_VER_FEATURES));

    // Modo diagnostico: no levanta servidor ni descarga templates, solo analiza formatos.
    if (argumentos.contains("--probe")) {
      System.exit(
          FmdFormatProbe.ejecutar(
              opciones(argumentos, "sample"),
              opciones(argumentos, "sample-file"),
              opciones(argumentos, "template-file")));
      return;
    }

    NativeExecutor nativo = new NativeExecutor();

    TemplateLoader loader =
        new TemplateLoader(
            importer,
            nativo,
            config.get("acceso.api.url", "http://localhost:3000"),
            config.get("acceso.api.key", ""));

    MatcherService matcher =
        new MatcherService(
            loader,
            importer,
            nativo,
            config.getInt("acceso.match.false.positive.denominator", 100000));

    TurnstileService torniquete =
        new TurnstileService(
            config.getBool("acceso.turnstile.enabled", false),
            config.get("acceso.turnstile.port", "COM3"),
            config.getInt("acceso.turnstile.baud", 9600),
            config.get("acceso.turnstile.command", "R01"),
            config.getBool("acceso.turnstile.configure", true));

    ApiServer server =
        new ApiServer(
            matcher,
            torniquete,
            loader,
            importer,
            config.getList("acceso.allowed.origins", "http://localhost:4200"));

    String keystore = config.get("acceso.ssl.keystore", "");
    server.iniciar(
        config.getInt("server.port", 8080),
        keystore.isBlank() ? null : Path.of(keystore),
        config.get("acceso.ssl.password", ""));

    Runtime.getRuntime()
        .addShutdownHook(
            new Thread(
                () -> {
                  Log.info("Deteniendo acceso-service...");
                  server.close();
                  loader.close();
                  nativo.close();
                }));

    // Despues de abrir el puerto: si el API no responde, el servicio igual queda arriba y
    // /api/health lo reporta, en vez de no arrancar.
    loader.iniciar(Duration.ofMinutes(config.getInt("acceso.refresh.minutes", 15)));
  }

  /** Primer valor de {@code --clave=valor}, o el valor por omision. */
  private static String opcion(List<String> args, String clave, String porOmision) {
    for (String arg : args) {
      if (arg.startsWith("--" + clave + "=")) {
        return arg.substring(clave.length() + 3);
      }
    }
    return porOmision;
  }

  /** Todos los valores de {@code --clave=valor} (la opcion puede repetirse). */
  private static List<String> opciones(List<String> args, String clave) {
    List<String> valores = new ArrayList<>();
    for (String arg : args) {
      if (arg.startsWith("--" + clave + "=")) {
        valores.add(arg.substring(clave.length() + 3));
      }
    }
    return valores;
  }
}
