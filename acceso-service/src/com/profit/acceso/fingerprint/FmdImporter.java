package com.profit.acceso.fingerprint;

import com.digitalpersona.uareu.Fmd;
import com.digitalpersona.uareu.UareUGlobal;
import com.profit.acceso.ServiceException;
import java.util.Base64;

/**
 * Convierte bytes crudos en {@link Fmd} usando el SDK.
 *
 * <p>Dos caminos distintos, igual que en el sample del SDK:
 *
 * <ul>
 *   <li>los templates de tbhuellas son plantillas de registro ({@code DP_REG_FEATURES});
 *   <li>la muestra que manda el Web SDK del navegador es un feature set de verificacion, que se
 *       importa al formato objetivo {@code DP_VER_FEATURES} para poder identificarla contra las
 *       plantillas de registro.
 * </ul>
 *
 * <p><b>Ojo con el formato:</b> los tres formatos DP comparten contenedor, asi que el mismo blob
 * de 318 bytes que manda el navegador se "importa" bien declarandolo VER, PRE_REG o REG. Que la
 * importacion pase NO valida la eleccion: comprobado contra la plantilla real del socio 9063,
 * VER y PRE_REG identifican, pero REG falla con URU_E_INVALID_FMD. O sea que un formato mal
 * configurado no da error al importar, da "sin match" silencioso.
 *
 * <p>Por eso aqui no hay reintento con otros formatos: no podria distinguir el caso malo, solo
 * daria una falsa sensacion de red de seguridad. Para diagnosticar esta {@link FmdFormatProbe}.
 */
public final class FmdImporter {

  private final Fmd.Format formatoMuestra;

  public FmdImporter(Fmd.Format formatoMuestra) {
    this.formatoMuestra = formatoMuestra;
  }

  /** Decodifica base64url (tolera tambien base64 estandar y falta de padding). */
  public static byte[] decodificar(String texto) {
    String limpio = texto.trim().replace('+', '-').replace('/', '_');
    int faltante = limpio.length() % 4;
    if (faltante != 0) {
      limpio = limpio + "=".repeat(4 - faltante);
    }
    try {
      return Base64.getUrlDecoder().decode(limpio);
    } catch (IllegalArgumentException e) {
      throw ServiceException.huella("La huella no es base64 valido", e);
    }
  }

  /** Importa la muestra capturada en el navegador, lista para identificar. */
  public Fmd importarMuestra(byte[] raw) {
    try {
      return UareUGlobal.GetImporter()
          .ImportFmd(raw, formatoMuestra, Fmd.Format.DP_VER_FEATURES);
    } catch (Exception e) {
      throw ServiceException.huella(
          "No se pudo importar la muestra de "
              + raw.length
              + " bytes como "
              + formatoMuestra
              + ": "
              + UareUErrors.describir(e),
          e);
    }
  }

  /** Importa una plantilla de registro venida de tbhuellas. */
  public Fmd importarPlantilla(byte[] raw) throws Exception {
    return UareUGlobal.GetImporter()
        .ImportFmd(raw, Fmd.Format.DP_REG_FEATURES, Fmd.Format.DP_REG_FEATURES);
  }

  /** Formato configurado, para exponerlo en /api/health. */
  public Fmd.Format formatoEnUso() {
    return formatoMuestra;
  }
}
