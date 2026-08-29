package com.profit.acceso.fingerprint;

import com.digitalpersona.uareu.Engine;
import com.digitalpersona.uareu.Fmd;
import com.digitalpersona.uareu.UareUException;
import com.digitalpersona.uareu.UareUGlobal;
import com.profit.acceso.Log;
import com.profit.acceso.ServiceException;
import java.util.Optional;

/**
 * Identifica una muestra contra la cache de templates.
 *
 * <p>Portado de {@code Identification.doModal()} del sample del SDK, con dos diferencias
 * deliberadas: no abre el torniquete (eso lo decide el API despues de validar la membresia) y no
 * habla con la base de datos.
 */
public final class MatcherService {

  /** Socio identificado y su puntaje de disimilitud (mientras mas bajo, mejor el match). */
  public record Match(int socio, int score) {}

  private final TemplateLoader templates;
  private final FmdImporter importer;
  private final NativeExecutor nativo;
  private final int denominadorFalsoPositivo;

  public MatcherService(
      TemplateLoader templates,
      FmdImporter importer,
      NativeExecutor nativo,
      int denominadorFalsoPositivo) {
    this.templates = templates;
    this.importer = importer;
    this.nativo = nativo;
    this.denominadorFalsoPositivo = denominadorFalsoPositivo;
  }

  public Optional<Match> identificar(String fingerprintBase64) {
    byte[] raw = FmdImporter.decodificar(fingerprintBase64);
    TemplateSnapshot snapshot = templates.current();

    if (snapshot.isEmpty()) {
      Log.warn("Llego una identificacion pero la cache de templates esta vacia.");
      return Optional.empty();
    }

    return nativo.call("identificar", () -> identificarNativo(raw, snapshot));
  }

  private Optional<Match> identificarNativo(byte[] raw, TemplateSnapshot snapshot) {
    Engine engine = UareUGlobal.GetEngine();
    Fmd muestra = importer.importarMuestra(raw);

    Engine.Candidate[] candidatos;
    try {
      candidatos =
          engine.Identify(
              muestra, 0, snapshot.fmds(), Engine.PROBABILITY_ONE / denominadorFalsoPositivo, 1);
    } catch (UareUException e) {
      throw ServiceException.huella(
          "Engine.Identify fallo: " + UareUErrors.describir(e) + ". " + UareUErrors.pista(e.getCode()),
          e);
    } catch (Exception e) {
      throw ServiceException.huella("Engine.Identify fallo: " + UareUErrors.describir(e), e);
    }

    if (candidatos.length == 0) {
      Log.info("Huella no identificada contra %d templates.", snapshot.size());
      return Optional.empty();
    }

    Engine.Candidate ganador = candidatos[0];
    int socio = snapshot.socioEnIndice(ganador.fmd_index);

    int score;
    try {
      score = engine.Compare(muestra, 0, snapshot.fmds()[ganador.fmd_index], ganador.view_index);
    } catch (Exception e) {
      // El match ya es valido; el puntaje es solo informativo.
      Log.debug("Engine.Compare fallo tras identificar al socio %d: %s", socio,
          UareUErrors.describir(e));
      score = -1;
    }

    Log.info("Huella identificada: socio=%d score=0x%s", socio, Integer.toHexString(score));
    return Optional.of(new Match(socio, score));
  }
}
