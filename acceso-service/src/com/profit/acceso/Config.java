package com.profit.acceso;

import com.digitalpersona.uareu.Fmd;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

/**
 * Configuracion del servicio.
 *
 * <p>Precedencia, de mayor a menor: propiedad de sistema (-Dclave=valor), variable de entorno,
 * application.properties, valor por omision. El nombre de la variable de entorno se deriva de la
 * clave en mayusculas con puntos convertidos a guion bajo: {@code acceso.api.url} ->
 * {@code ACCESO_API_URL}.
 */
public final class Config {

  private final Properties props = new Properties();

  private Config() {}

  /** Carga el archivo indicado; si no existe, se queda solo con entorno y valores por omision. */
  public static Config load(Path archivo) {
    Config config = new Config();
    if (archivo != null && Files.isReadable(archivo)) {
      try (InputStream in = Files.newInputStream(archivo)) {
        config.props.load(in);
      } catch (IOException e) {
        throw new IllegalStateException("No se pudo leer " + archivo + ": " + e.getMessage(), e);
      }
    }
    return config;
  }

  public String get(String clave, String porOmision) {
    String propiedad = System.getProperty(clave);
    if (propiedad != null && !propiedad.isBlank()) {
      return propiedad;
    }

    String entorno = System.getenv(clave.toUpperCase().replace('.', '_'));
    if (entorno != null && !entorno.isBlank()) {
      return entorno;
    }

    String archivo = props.getProperty(clave);
    if (archivo != null && !archivo.isBlank()) {
      return archivo.trim();
    }

    return porOmision;
  }

  public int getInt(String clave, int porOmision) {
    String valor = get(clave, null);
    if (valor == null) {
      return porOmision;
    }
    try {
      return Integer.parseInt(valor.trim());
    } catch (NumberFormatException e) {
      throw new IllegalStateException(clave + " no es un entero: " + valor);
    }
  }

  public boolean getBool(String clave, boolean porOmision) {
    String valor = get(clave, null);
    return valor == null ? porOmision : Boolean.parseBoolean(valor.trim());
  }

  public List<String> getList(String clave, String porOmision) {
    List<String> valores = new ArrayList<>();
    for (String parte : get(clave, porOmision).split(",")) {
      String limpio = parte.trim();
      if (!limpio.isEmpty()) {
        valores.add(limpio);
      }
    }
    return valores;
  }

  public Fmd.Format getFormat(String clave, Fmd.Format porOmision) {
    String valor = get(clave, null);
    if (valor == null) {
      return porOmision;
    }
    try {
      return Fmd.Format.valueOf(valor.trim().toUpperCase());
    } catch (IllegalArgumentException e) {
      throw new IllegalStateException(
          clave + " no es un Fmd.Format valido: " + valor + ". Opciones: DP_VER_FEATURES,"
              + " DP_PRE_REG_FEATURES, DP_REG_FEATURES, ANSI_378_2004, ISO_19794_2_2005");
    }
  }
}
