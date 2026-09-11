package com.profit.acceso.turnstile;

import com.profit.acceso.Log;
import com.profit.acceso.ServiceException;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

/**
 * Abre el torniquete escribiendo el comando por el puerto serial.
 *
 * <p>Sin dependencias: el puerto se configura con el comando {@code mode} de Windows y despues se
 * escribe al dispositivo, que es como lo hacia el sample del SDK. La diferencia con el sample es
 * que aquel nunca fijaba baud rate ni paridad y dependia de como hubiera quedado el puerto.
 *
 * <p>Si algun dia hace falta control fino (handshake, leer respuesta del torniquete, detectar
 * desconexion), la libreria jSerialComm es un jar suelto sin dependencias transitivas y solo hay
 * que reemplazar esta clase.
 */
public final class TurnstileService {

  private final boolean habilitado;
  private final String puerto;
  private final int baudRate;
  private final String comando;
  private final boolean configurarPuerto;

  public TurnstileService(
      boolean habilitado, String puerto, int baudRate, String comando, boolean configurarPuerto) {
    this.habilitado = habilitado;
    this.puerto = puerto;
    this.baudRate = baudRate;
    this.comando = comando;
    this.configurarPuerto = configurarPuerto;
  }

  public synchronized void abrir() {
    if (!habilitado) {
      Log.info("Torniquete deshabilitado (acceso.turnstile.enabled=false); no se envia comando.");
      return;
    }

    if (configurarPuerto) {
      configurar();
    }

    // El sufijo ':' es lo que hace que Windows resuelva el nombre como dispositivo serial.
    String dispositivo = puerto.endsWith(":") ? puerto : puerto + ":";

    try (OutputStream salida = new FileOutputStream(dispositivo)) {
      salida.write(comando.getBytes(StandardCharsets.US_ASCII));
      salida.flush();
      Log.info("Torniquete abierto: '%s' enviado por %s.", comando, puerto);
    } catch (Exception e) {
      throw ServiceException.torniquete(
          "Error escribiendo en " + puerto + ": " + e.getMessage() + ". Revisa que el puerto"
              + " exista y que no lo tenga tomado otro programa.",
          e);
    }
  }

  /** {@code mode COM3: BAUD=9600 PARITY=n DATA=8 STOP=1} */
  private void configurar() {
    String nombre = puerto.endsWith(":") ? puerto : puerto + ":";
    try {
      Process proceso =
          new ProcessBuilder(
                  "cmd", "/c", "mode", nombre, "BAUD=" + baudRate, "PARITY=n", "DATA=8", "STOP=1")
              .redirectErrorStream(true)
              .start();

      if (!proceso.waitFor(5, TimeUnit.SECONDS)) {
        proceso.destroyForcibly();
        Log.warn("El comando 'mode' no termino a tiempo; se intenta escribir de todos modos.");
        return;
      }

      if (proceso.exitValue() != 0) {
        String salida = new String(proceso.getInputStream().readAllBytes()).trim();
        throw ServiceException.torniquete(
            "No se pudo configurar " + puerto + " con 'mode' (codigo " + proceso.exitValue()
                + "): " + salida,
            null);
      }
    } catch (ServiceException e) {
      throw e;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw ServiceException.torniquete("Configuracion del puerto interrumpida", e);
    } catch (Exception e) {
      throw ServiceException.torniquete(
          "No se pudo ejecutar 'mode' para configurar " + puerto + ": " + e.getMessage(), e);
    }
  }

  public boolean habilitado() {
    return habilitado;
  }

  public String puerto() {
    return puerto;
  }
}
