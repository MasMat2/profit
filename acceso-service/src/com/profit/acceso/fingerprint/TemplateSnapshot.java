package com.profit.acceso.fingerprint;

import com.digitalpersona.uareu.Fmd;
import java.time.Instant;

/**
 * Foto inmutable de los templates cargados.
 *
 * <p>{@code fmds} y {@code socios} son arreglos paralelos: el socio de {@code fmds[i]} es
 * {@code socios[i]}. Es como resuelve el sample del SDK el mapeo, porque {@code Engine.Identify}
 * devuelve indices dentro del arreglo que recibe. Solo se agrega al arreglo de socios cuando la
 * importacion del template correspondiente tuvo exito, o los indices se recorren.
 */
public record TemplateSnapshot(Fmd[] fmds, int[] socios, Instant loadedAt, int descartados) {

  public static final TemplateSnapshot VACIO =
      new TemplateSnapshot(new Fmd[0], new int[0], null, 0);

  public int size() {
    return fmds.length;
  }

  public boolean isEmpty() {
    return fmds.length == 0;
  }

  public int socioEnIndice(int indice) {
    return socios[indice];
  }
}
