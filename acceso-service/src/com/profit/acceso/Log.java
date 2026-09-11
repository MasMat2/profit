package com.profit.acceso;

import java.io.PrintStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Log minimo a consola.
 *
 * <p>Sin SLF4J ni logback: el servicio corre como servicio de Windows y WinSW ya redirige la
 * salida estandar a archivos con rotacion, asi que basta con escribir lineas con marca de
 * tiempo.
 */
public final class Log {

  private static final DateTimeFormatter FORMATO =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

  private static volatile boolean debug = false;

  private Log() {}

  public static void setDebug(boolean valor) {
    debug = valor;
  }

  public static void info(String fmt, Object... args) {
    escribir(System.out, "INFO ", fmt, args);
  }

  public static void warn(String fmt, Object... args) {
    escribir(System.out, "WARN ", fmt, args);
  }

  public static void error(String fmt, Object... args) {
    escribir(System.err, "ERROR", fmt, args);
  }

  public static void debug(String fmt, Object... args) {
    if (debug) {
      escribir(System.out, "DEBUG", fmt, args);
    }
  }

  private static void escribir(PrintStream salida, String nivel, String fmt, Object... args) {
    salida.println(
        LocalDateTime.now().format(FORMATO)
            + " "
            + nivel
            + " "
            + (args.length == 0 ? fmt : String.format(fmt, args)));
  }
}
