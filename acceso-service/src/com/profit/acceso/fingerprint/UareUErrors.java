package com.profit.acceso.fingerprint;

import com.digitalpersona.uareu.UareUException;
import java.lang.reflect.Field;

/**
 * Traduce los errores del SDK a algo legible en un log.
 *
 * <p>{@code UareUException.getMessage()} devuelve null: toda la informacion esta en
 * {@code getCode()}, un entero como 96075977. Sin esta traduccion los logs quedan en "null".
 *
 * <p>Los nombres salen por reflexion de las constantes del propio SDK en vez de una tabla a
 * mano: son 25 y no vale la pena mantenerlas duplicadas aqui.
 */
public final class UareUErrors {

  private UareUErrors() {}

  public static String describir(Throwable t) {
    if (t instanceof UareUException e) {
      return nombre(e.getCode()) + " (" + e.getCode() + ")";
    }
    String mensaje = t.getMessage();
    return mensaje != null ? mensaje : t.getClass().getSimpleName();
  }

  public static String nombre(int code) {
    for (Field campo : UareUException.class.getFields()) {
      try {
        if (campo.getType() == int.class && campo.getInt(null) == code) {
          return campo.getName();
        }
      } catch (IllegalAccessException ignorada) {
        // campo no accesible: seguir buscando
      }
    }
    return "codigo_" + code;
  }

  /** Pista de que hacer con los errores que salen al identificar. */
  public static String pista(int code) {
    if (code == UareUException.URU_E_INVALID_PARAMETER) {
      return "Identify exige que el arreglo de candidatos sean plantillas DP_REG_FEATURES.";
    }
    if (code == UareUException.URU_E_INVALID_FMD) {
      return "El template importo pero el motor lo rechaza: probablemente no es una plantilla"
          + " de registro valida (bytes corruptos al salir de MySQL, o un feature set de una"
          + " sola captura en vez de un enrolamiento).";
    }
    if (code == UareUException.URU_E_FAILURE) {
      return "Falla generica del motor: revisa que la plantilla venga de un enrolamiento real.";
    }
    return "";
  }
}
