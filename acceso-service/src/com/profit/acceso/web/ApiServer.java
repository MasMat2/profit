package com.profit.acceso.web;

import com.profit.acceso.Log;
import com.profit.acceso.ServiceException;
import com.profit.acceso.fingerprint.FmdImporter;
import com.profit.acceso.fingerprint.MatcherService;
import com.profit.acceso.fingerprint.TemplateLoader;
import com.profit.acceso.fingerprint.TemplateSnapshot;
import com.profit.acceso.json.Json;
import com.profit.acceso.turnstile.TurnstileService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpsConfigurator;
import com.sun.net.httpserver.HttpsServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;

/**
 * Servidor HTTP del servicio, sobre {@code com.sun.net.httpserver} del JDK.
 *
 * <p>Cuatro endpoints y payloads triviales no justifican un framework: esto son ~230 lineas
 * contra las ~40 dependencias que arrastraria Spring Boot, en una maquina donde lo que importa
 * es que arranque sola y no se caiga.
 */
public final class ApiServer implements AutoCloseable {

  /**
   * El unico dato que hay que sacar del body de /api/identify.
   *
   * <p>Basta un regex en vez de un parser: el alfabeto base64url ({@code A-Za-z0-9-_=}) no tiene
   * comillas ni backslashes, asi que {@code [^"]+} no se puede confundir.
   */
  private static final Pattern CAMPO_FINGERPRINT =
      Pattern.compile("\"fingerprint\"\\s*:\\s*\"([^\"]+)\"");

  private final MatcherService matcher;
  private final TurnstileService torniquete;
  private final TemplateLoader templates;
  private final FmdImporter importer;
  private final List<String> origenesPermitidos;

  private HttpServer server;

  public ApiServer(
      MatcherService matcher,
      TurnstileService torniquete,
      TemplateLoader templates,
      FmdImporter importer,
      List<String> origenesPermitidos) {
    this.matcher = matcher;
    this.torniquete = torniquete;
    this.templates = templates;
    this.importer = importer;
    this.origenesPermitidos = origenesPermitidos;
  }

  /** @param keystore ruta al PKCS12 para TLS, o null para HTTP plano */
  public void iniciar(int puerto, Path keystore, String keystorePassword) throws Exception {
    InetSocketAddress direccion = new InetSocketAddress(puerto);

    if (keystore != null) {
      HttpsServer https = HttpsServer.create(direccion, 0);
      https.setHttpsConfigurator(new HttpsConfigurator(sslContext(keystore, keystorePassword)));
      server = https;
    } else {
      server = HttpServer.create(direccion, 0);
    }

    server.createContext("/api/identify", ex -> manejar(ex, "POST", this::identify));
    server.createContext("/api/turnstile/open", ex -> manejar(ex, "POST", ig -> abrirTorniquete()));
    server.createContext("/api/templates/refresh", ex -> manejar(ex, "POST", ig -> refrescar()));
    server.createContext("/api/health", ex -> manejar(ex, "GET", ig -> health()));
    server.createContext(
        "/api/ping", ex -> manejar(ex, "GET", ig -> Map.of("service", "acceso-service")));

    // Cuatro hilos sobran: el matching se serializa en NativeExecutor de todos modos.
    server.setExecutor(Executors.newFixedThreadPool(4));
    server.start();

    Log.info("Escuchando en %s://localhost:%d", keystore != null ? "https" : "http", puerto);
  }

  private static SSLContext sslContext(Path keystore, String password) throws Exception {
    if (!Files.isReadable(keystore)) {
      throw new IllegalStateException("No se puede leer el keystore: " + keystore);
    }
    char[] clave = password == null ? new char[0] : password.toCharArray();

    KeyStore ks = KeyStore.getInstance("PKCS12");
    try (var in = Files.newInputStream(keystore)) {
      ks.load(in, clave);
    }

    KeyManagerFactory kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
    kmf.init(ks, clave);

    SSLContext ctx = SSLContext.getInstance("TLS");
    ctx.init(kmf.getKeyManagers(), null, null);
    return ctx;
  }

  // ------------------------------------------------------------------ endpoints

  private Object identify(HttpExchange ex) throws IOException {
    String cuerpo = new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
    Matcher campo = CAMPO_FINGERPRINT.matcher(cuerpo);

    if (!campo.find()) {
      throw ServiceException.peticionInvalida("Falta el campo 'fingerprint'");
    }

    Optional<MatcherService.Match> match = matcher.identificar(campo.group(1));

    Map<String, Object> respuesta = new LinkedHashMap<>();
    respuesta.put("socio", match.map(MatcherService.Match::socio).orElse(null));
    respuesta.put("score", match.map(MatcherService.Match::score).orElse(null));
    return respuesta;
  }

  /**
   * Abre el torniquete. Lo llama el front SOLO despues de que el API confirmo el acceso, para que
   * una membresia vencida no gire la barrera.
   */
  private Object abrirTorniquete() {
    torniquete.abrir();
    // Con el torniquete deshabilitado (maquinas de prueba) no se abrio nada de verdad:
    // devolverlo como opened=true haria pasar por exito algo que no ocurrio.
    return Map.of("opened", torniquete.habilitado(), "enabled", torniquete.habilitado());
  }

  private Object refrescar() {
    try {
      return resumenTemplates(templates.refrescar());
    } catch (ServiceException e) {
      throw e;
    } catch (Exception e) {
      throw ServiceException.apiNoDisponible(
          "No se pudieron recargar los templates: " + ServiceException.motivo(e));
    }
  }

  private Object health() {
    TemplateSnapshot snapshot = templates.current();

    Map<String, Object> salud = new LinkedHashMap<>();
    salud.put("status", snapshot.isEmpty() ? "SIN_TEMPLATES" : "OK");
    salud.putAll(resumenTemplates(snapshot));
    salud.put("matchFormat", importer.formatoEnUso().toString());
    salud.put("turnstile", Map.of("enabled", torniquete.habilitado(), "port", torniquete.puerto()));
    return salud;
  }

  private Map<String, Object> resumenTemplates(TemplateSnapshot snapshot) {
    Map<String, Object> resumen = new LinkedHashMap<>();
    resumen.put("templates", snapshot.size());
    resumen.put("descartados", snapshot.descartados());
    resumen.put("loadedAt", snapshot.loadedAt() == null ? null : snapshot.loadedAt().toString());
    return resumen;
  }

  // -------------------------------------------------------------------- plomeria

  @FunctionalInterface
  private interface Accion {
    Object ejecutar(HttpExchange ex) throws IOException;
  }

  private void manejar(HttpExchange ex, String metodoEsperado, Accion accion) throws IOException {
    try {
      cors(ex);

      if ("OPTIONS".equalsIgnoreCase(ex.getRequestMethod())) {
        ex.sendResponseHeaders(204, -1);
        return;
      }

      if (!metodoEsperado.equalsIgnoreCase(ex.getRequestMethod())) {
        responder(ex, 405, Map.of("error", "metodo_no_permitido", "esperado", metodoEsperado));
        return;
      }

      responder(ex, 200, accion.ejecutar(ex));

    } catch (ServiceException e) {
      if (e.status() >= 500) {
        Log.error("%s: %s", e.code(), e.getMessage());
      } else {
        Log.warn("%s: %s", e.code(), e.getMessage());
      }
      responder(ex, e.status(), Map.of("error", e.code(), "message", String.valueOf(e.getMessage())));
    } catch (Exception e) {
      Log.error("Error inesperado en %s: %s", ex.getRequestURI(), e);
      responder(ex, 500, Map.of("error", "interno", "message", String.valueOf(e.getMessage())));
    } finally {
      ex.close();
    }
  }

  /**
   * CORS y Private Network Access.
   *
   * <p>La app Angular se sirve por HTTPS desde un servidor publico y pega a este servicio, que
   * vive en la red local del kiosco. Chrome trata eso como "public -> private" y manda un
   * preflight con {@code Access-Control-Request-Private-Network}; si la respuesta no trae el
   * permiso, bloquea la peticion real.
   */
  private void cors(HttpExchange ex) {
    String origen = ex.getRequestHeaders().getFirst("Origin");

    if (origen != null
        && (origenesPermitidos.contains("*") || origenesPermitidos.contains(origen))) {
      ex.getResponseHeaders().set("Access-Control-Allow-Origin", origen);
      ex.getResponseHeaders().set("Vary", "Origin");
    }

    ex.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    ex.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
    ex.getResponseHeaders().set("Access-Control-Max-Age", "1800");

    if ("true".equalsIgnoreCase(
        ex.getRequestHeaders().getFirst("Access-Control-Request-Private-Network"))) {
      ex.getResponseHeaders().set("Access-Control-Allow-Private-Network", "true");
    }
  }

  private void responder(HttpExchange ex, int estado, Object cuerpo) throws IOException {
    byte[] bytes = Json.write(cuerpo).getBytes(StandardCharsets.UTF_8);
    ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
    ex.sendResponseHeaders(estado, bytes.length);
    try (OutputStream salida = ex.getResponseBody()) {
      salida.write(bytes);
    }
  }

  @Override
  public void close() {
    if (server != null) {
      server.stop(1);
    }
  }
}
