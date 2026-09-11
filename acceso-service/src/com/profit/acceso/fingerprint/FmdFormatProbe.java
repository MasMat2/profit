package com.profit.acceso.fingerprint;

import com.digitalpersona.uareu.Engine;
import com.digitalpersona.uareu.Fmd;
import com.digitalpersona.uareu.Importer;
import com.digitalpersona.uareu.UareUGlobal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

/**
 * Diagnostico: identifica una muestra del navegador contra plantillas reales de tbhuellas,
 * probando cada formato de importacion.
 *
 * <pre>
 *   Main --probe --sample-file=docs/samples/intermediate-1.txt --template-file=&lt;reales&gt;
 * </pre>
 *
 * <p>Pide la plantilla real a proposito: importar la muestra sola no prueba nada, porque los
 * tres formatos DP comparten contenedor y todos "importan". Lo unico que distingue un formato
 * bueno de uno malo es si identifica.
 */
public final class FmdFormatProbe {

  private FmdFormatProbe() {}

  /** @return codigo de salida del proceso */
  public static int ejecutar(
      List<String> muestrasInline, List<String> archivosMuestra, List<String> archivosPlantilla)
      throws Exception {

    List<String> muestras = new ArrayList<>(muestrasInline);
    for (String archivo : archivosMuestra) {
      muestras.addAll(leerLineas(archivo));
    }

    if (muestras.isEmpty() || archivosPlantilla.isEmpty()) {
      System.out.println(
          "Uso: --probe --sample-file=<muestra del navegador> --template-file=<plantillas"
              + " reales de tbhuellas en base64, una por linea>\n\n"
              + "Las dos son obligatorias: sin plantilla real no hay nada contra que"
              + " identificar, y solo importar la muestra no prueba nada.");
      return 1;
    }

    Importer importer = UareUGlobal.GetImporter();
    Engine engine = UareUGlobal.GetEngine();

    List<Fmd> plantillas = new ArrayList<>();
    for (String archivo : archivosPlantilla) {
      for (String linea : leerLineas(archivo)) {
        byte[] crudo = Base64.getDecoder().decode(linea);
        try {
          plantillas.add(
              importer.ImportFmd(crudo, Fmd.Format.DP_REG_FEATURES, Fmd.Format.DP_REG_FEATURES));
        } catch (Exception e) {
          System.out.printf(
              "  plantilla de %d bytes no importa: %s%n", crudo.length, UareUErrors.describir(e));
        }
      }
    }

    if (plantillas.isEmpty()) {
      System.out.println("Ninguna plantilla se pudo importar; no hay contra que identificar.");
      return 1;
    }

    System.out.printf("%n=== Identify contra %d plantilla(s) real(es) ===%n", plantillas.size());
    Fmd[] arreglo = plantillas.toArray(new Fmd[0]);
    int umbral = Engine.PROBABILITY_ONE / 100000;

    for (Fmd.Format formato : Fmd.Format.values()) {
      for (int i = 0; i < muestras.size(); i++) {
        String resultado;
        try {
          Fmd probe =
              importer.ImportFmd(
                  FmdImporter.decodificar(muestras.get(i)), formato, Fmd.Format.DP_VER_FEATURES);
          Engine.Candidate[] candidatos = engine.Identify(probe, 0, arreglo, umbral, 1);
          resultado =
              candidatos.length == 0
                  ? "sin match"
                  : "MATCH con plantilla #" + candidatos[0].fmd_index;
        } catch (Exception e) {
          resultado = UareUErrors.describir(e);
        }
        System.out.printf("  muestra %d como %-22s -> %s%n", i + 1, formato, resultado);
      }
    }

    System.out.println("\nPon en acceso.match.input.format el formato que haya dado MATCH.");
    return 0;
  }

  private static List<String> leerLineas(String archivo) throws Exception {
    return Files.readAllLines(Path.of(archivo)).stream()
        .map(String::trim)
        .filter(linea -> !linea.isEmpty() && !linea.startsWith("#"))
        .toList();
  }
}
