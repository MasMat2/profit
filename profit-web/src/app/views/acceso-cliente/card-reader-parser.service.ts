import { Injectable } from '@angular/core';

/**
 * Hay socios de un solo dígito, así que el largo del código no sirve para descartar un Enter
 * suelto: esta ventana es la que hace ese trabajo. El lector manda el Enter pegado al último
 * carácter; un Enter que llega después de esto no cierra ninguna ráfaga.
 */
const VENTANA_CIERRE_ESCANEO_MS = 300;

/**
 * El lector de tarjetas es un "keyboard wedge": teclea el número de socio y cierra con Enter.
 * Nadie hace clic en un campo antes de pasar la tarjeta, así que las pulsaciones se escuchan a
 * nivel documento y se separan de las de una persona por la cadencia: el lector manda un
 * carácter cada 10-30 ms, una persona no sostiene menos de ~100 ms.
 */
const PAUSA_MAX_ENTRE_TECLAS_MS = 120;

export type ResultadoEscaneo =
  | { tipo: 'socio'; socioId: number }
  | { tipo: 'invalido' };

/**
 * Acumula las pulsaciones del lector de tarjetas y cierra la ráfaga con el Enter que el propio
 * lector manda. Lógica de parseo pura: no sabe qué hacer con un socio identificado, ni de
 * `@HostListener` — eso lo maneja quien la consuma.
 *
 * Con ámbito de componente (`providers` de `AccesoClienteComponent`): el buffer y la marca de
 * tiempo son de una sola pantalla a la vez.
 */
@Injectable()
export class CardReaderParserService {
  /** Caracteres acumulados del escaneo de tarjeta en curso. */
  private bufferEscaneo = '';
  /** Marca del último carácter imprimible, para medir la cadencia del lector. */
  private ultimaTeclaMs = 0;

  /**
   * Procesa una tecla del documento. Devuelve `null` mientras la ráfaga sigue abierta o el
   * evento no es del lector (nada que hacer todavía); devuelve un resultado sólo cuando un Enter
   * cierra un escaneo.
   */
  procesarTecla(e: KeyboardEvent): ResultadoEscaneo | null {
    // Si el evento nació dentro de un campo de texto, ese campo manda: su (keyup.enter) ya
    // dispara la verificación, y atenderlo también aquí registraría el acceso dos veces.
    if (this.esCampoDeTexto(e.target)) {
      return null;
    }

    // El lector nunca usa modificadores. Un Ctrl+R o un Alt+Tab del operador no es un escaneo y
    // además parte la ráfaga a media: lo que quedó en el buffer ya no sirve.
    if (e.ctrlKey || e.altKey || e.metaKey || e.repeat) {
      this.bufferEscaneo = '';
      return null;
    }

    const ahora = Date.now();

    if (e.key === 'Enter') {
      const codigo = this.bufferEscaneo;
      // Se vacía siempre, incluso si el cierre se descarta: un segundo Enter no puede revivir
      // un código que ya se rechazó.
      this.bufferEscaneo = '';

      if (!codigo || ahora - this.ultimaTeclaMs > VENTANA_CIERRE_ESCANEO_MS) {
        return null;
      }

      // Tras tocar "Intentar de nuevo" el botón se queda con el foco: sin esto el Enter del
      // lector lo volvería a presionar además de disparar el escaneo.
      e.preventDefault();
      const socioId = this.normalizarCodigo(codigo);
      return socioId === null ? { tipo: 'invalido' } : { tipo: 'socio', socioId };
    }

    // `length === 1` deja fuera Shift, Tab, F5, flechas y teclas muertas sin enumerarlas. Sale
    // SIN vaciar el buffer y sin tocar `ultimaTeclaMs`: los lectores que mandan caracteres en
    // mayúscula intercalan un evento de Shift en plena ráfaga, y limpiar ahí truncaría el código.
    if (e.key.length !== 1) {
      return null;
    }

    // El primer carácter de una ráfaga siempre entra por aquí (la marca anterior es vieja), así
    // que este reinicio es el que abre el escaneo, no sólo el que descarta uno interrumpido.
    if (ahora - this.ultimaTeclaMs > PAUSA_MAX_ENTRE_TECLAS_MS) {
      this.bufferEscaneo = '';
    }

    this.bufferEscaneo += e.key;
    this.ultimaTeclaMs = ahora;
    return null;
  }

  /**
   * El lector teclea sobre el documento entero, así que hay que distinguir sus pulsaciones de
   * las de alguien escribiendo en un campo. Si el evento nació dentro de un input, ese campo se
   * queda con la ráfaga —incluido el Enter, que ahí ya dispara la verificación— y el manejador
   * global se hace a un lado para no registrar el acceso dos veces.
   */
  private esCampoDeTexto(destino: EventTarget | null): boolean {
    if (!(destino instanceof HTMLElement)) {
      return false;
    }
    const etiqueta = destino.tagName.toLowerCase();
    return etiqueta === 'input'
      || etiqueta === 'textarea'
      || etiqueta === 'select'
      || destino.isContentEditable;
  }

  /**
   * El lector puede colar un sufijo de configuración o un carácter mal leído. Al backend sólo le
   * sirve el número: un segmento no numérico en la ruta es un 400, y ese 400 el socio lo ve como
   * "el sistema está caído" en vez de "vuelve a pasar la tarjeta".
   */
  private normalizarCodigo(codigo: string): number | null {
    const digitos = codigo.replace(/\D/g, '');
    if (!digitos) {
      return null;
    }
    // Number() se come los ceros a la izquierda ("0000123" → 123), que es el número que guarda
    // tbsocios. isSafeInteger descarta una lectura embarrada de 20 dígitos, que como float daría
    // un id sin sentido.
    const socioId = Number(digitos);
    return Number.isSafeInteger(socioId) && socioId > 0 ? socioId : null;
  }
}
