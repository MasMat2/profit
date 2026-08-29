package com.profit.acceso;

/**
 * Error del servicio que ya sabe con que HTTP responder.
 *
 * <p>Reemplaza a los cinco tipos de excepcion que habia antes. La ventaja no es tanto el
 * tamaño como que {@code ApiServer} pasa de una cadena de seis {@code catch} a dos: esta y el
 * comodin de 500.
 */
public class ServiceException extends RuntimeException {

  private final int status;
  private final String code;

  public ServiceException(int status, String code, String message, Throwable cause) {
    super(message, cause);
    this.status = status;
    this.code = code;
  }

  public int status() {
    return status;
  }

  public String code() {
    return code;
  }

  /** Falta un campo o viene mal en la peticion. */
  public static ServiceException peticionInvalida(String mensaje) {
    return new ServiceException(400, "peticion_invalida", mensaje, null);
  }

  /** No se pudo importar o comparar la huella con el SDK. */
  public static ServiceException huella(String mensaje, Throwable causa) {
    return new ServiceException(422, "huella_invalida", mensaje, causa);
  }

  /** El puerto serial del torniquete no respondio. */
  public static ServiceException torniquete(String mensaje, Throwable causa) {
    return new ServiceException(503, "torniquete", mensaje, causa);
  }

  /** El API de NestJS no esta disponible o respondio mal. */
  public static ServiceException apiNoDisponible(String mensaje) {
    return new ServiceException(502, "api_no_disponible", mensaje, null);
  }

  /**
   * Texto util de una excepcion.
   *
   * <p>{@code getMessage()} de las excepciones de red suele venir en null (ConnectException,
   * por ejemplo), y un mensaje que termina en "null" no le dice nada a quien lee el log.
   */
  public static String motivo(Throwable t) {
    return t.getMessage() != null ? t.getMessage() : t.getClass().getSimpleName();
  }
}
