package com.profit.acceso.fingerprint;

import com.digitalpersona.uareu.Fmd;
import java.time.Instant;
import java.util.Arrays;
import java.util.Set;

/**
 * Foto inmutable de los templates cargados.
 *
 * <p>{@code fmds} y {@code socios} son arreglos paralelos: el socio de {@code fmds[i]} es
 * {@code socios[i]}. Es como resuelve el sample del SDK el mapeo, porque {@code Engine.Identify}
 * devuelve indices dentro del arreglo que recibe. Solo se agrega al arreglo de socios cuando la
 * importacion del template correspondiente tuvo exito, o los indices se recorren.
 *
 * @param loadedAt cuando se hizo la ultima carga completa; null si nunca hubo una
 * @param actualizadoAt cuando se aplico el ultimo delta sobre esa carga; null si ninguno
 * @param descartados filas que no importaron, acumuladas desde la ultima carga completa
 */
public record TemplateSnapshot(
    Fmd[] fmds, int[] socios, Instant loadedAt, Instant actualizadoAt, int descartados) {

  public static final TemplateSnapshot VACIO =
      new TemplateSnapshot(new Fmd[0], new int[0], null, null, 0);

  public int size() {
    return fmds.length;
  }

  public boolean isEmpty() {
    return fmds.length == 0;
  }

  public int socioEnIndice(int indice) {
    return socios[indice];
  }

  /**
   * Snapshot nuevo donde todo lo de {@code sociosCambiados} se reemplaza por lo que trae
   * {@code delta}.
   *
   * <p>Por socio y no por fila: el API manda al socio completo cuando alguna de sus filas
   * cambio, igual que BDK reescribe todos los dedos al reenrolar. Un socio que viene en el
   * conjunto pero sin template en el delta (no importo, o ya no tiene huella) sale y no vuelve a
   * entrar. Es idempotente: aplicar dos veces el mismo delta deja lo mismo.
   */
  public TemplateSnapshot fusionar(Set<Integer> sociosCambiados, TemplateSnapshot delta) {
    Fmd[] fmdsNuevos = new Fmd[fmds.length + delta.fmds.length];
    int[] sociosNuevos = new int[fmdsNuevos.length];
    int n = 0;

    for (int i = 0; i < fmds.length; i++) {
      if (!sociosCambiados.contains(socios[i])) {
        fmdsNuevos[n] = fmds[i];
        sociosNuevos[n] = socios[i];
        n++;
      }
    }
    for (int i = 0; i < delta.fmds.length; i++) {
      fmdsNuevos[n] = delta.fmds[i];
      sociosNuevos[n] = delta.socios[i];
      n++;
    }

    return new TemplateSnapshot(
        Arrays.copyOf(fmdsNuevos, n),
        Arrays.copyOf(sociosNuevos, n),
        loadedAt,
        Instant.now(),
        descartados + delta.descartados);
  }
}
