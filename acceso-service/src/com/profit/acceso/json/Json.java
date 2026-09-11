package com.profit.acceso.json;

import java.util.Map;

/**
 * Escritor JSON minimo.
 *
 * <p>Solo escribe: el servicio ya no parsea JSON. Los templates llegan del API como texto
 * (una linea por huella) y del body de /api/identify solo hace falta un campo, que
 * {@code ApiServer} saca con una expresion regular.
 *
 * <p>Tipos soportados: String, Number, Boolean, null, Map e Iterable (anidados).
 */
public final class Json {

  private Json() {}

  public static String write(Object value) {
    StringBuilder sb = new StringBuilder();
    write(value, sb);
    return sb.toString();
  }

  private static void write(Object value, StringBuilder sb) {
    if (value == null) {
      sb.append("null");
    } else if (value instanceof String s) {
      escape(s, sb);
    } else if (value instanceof Number || value instanceof Boolean) {
      sb.append(value);
    } else if (value instanceof Map<?, ?> map) {
      sb.append('{');
      boolean primero = true;
      for (Map.Entry<?, ?> e : map.entrySet()) {
        if (!primero) {
          sb.append(',');
        }
        primero = false;
        escape(String.valueOf(e.getKey()), sb);
        sb.append(':');
        write(e.getValue(), sb);
      }
      sb.append('}');
    } else if (value instanceof Iterable<?> it) {
      sb.append('[');
      boolean primero = true;
      for (Object o : it) {
        if (!primero) {
          sb.append(',');
        }
        primero = false;
        write(o, sb);
      }
      sb.append(']');
    } else {
      escape(String.valueOf(value), sb);
    }
  }

  private static void escape(String s, StringBuilder sb) {
    sb.append('"');
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      switch (c) {
        case '"' -> sb.append("\\\"");
        case '\\' -> sb.append("\\\\");
        case '\b' -> sb.append("\\b");
        case '\f' -> sb.append("\\f");
        case '\n' -> sb.append("\\n");
        case '\r' -> sb.append("\\r");
        case '\t' -> sb.append("\\t");
        default -> {
          if (c < 0x20) {
            sb.append(String.format("\\u%04x", (int) c));
          } else {
            sb.append(c);
          }
        }
      }
    }
    sb.append('"');
  }
}
