import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../services/shared/toast.service';
import { AccesoService, AccesoDto, EstadoServicio } from '../../services/acceso.service';
import { mensajeCalidad } from './calidad-huella';

declare var Fingerprint: any;

/**
 * Los tres modos de fallo, que antes se veían todos como "Acceso Denegado":
 *  - `lectura`  : la captura no sirvió (dedo mal apoyado, sucio, mojado). No es una negativa.
 *  - `denegado` : se identificó pero no puede pasar, o no se reconoció la huella.
 *  - `servicio` : algo está roto. El socio no tiene la culpa y recepción necesita enterarse.
 */
export type TipoAviso = 'lectura' | 'denegado' | 'servicio';

export interface Aviso {
  tipo: TipoAviso;
  titulo: string;
  mensaje: string;
  icono: string;
}

/**
 * Lo que permanece en pantalla el resultado de un intento de acceso — el suyo y el del que sigue.
 *
 * "Si no es interrumpido": cualquier intento nuevo (huella o tarjeta) pasa por
 * `limpiarResultado()`, que cancela este temporizador antes de armar el suyo, asi que en una fila
 * el modal de cada socio lo cierra el siguiente sin esperar los 10 s.
 */
const DURACION_RESULTADO_MS = 10000;

const DURACION_AVISO: Record<TipoAviso, number> = {
  lectura: DURACION_RESULTADO_MS,
  denegado: DURACION_RESULTADO_MS,
  servicio: DURACION_RESULTADO_MS
};

/**
 * Respiro entre cerrar la captura y volver a abrirla. Ver `reArmarCaptura()`.
 *
 * `stopAcquisition` es asincrono: con 300 ms el `startAcquisition` siguiente llegaba pisando el
 * cierre y fallaba con "Communication failure.", que el SDK convierte en `onCommunicationFailed`
 * — el aviso de Lite Client caido, en un lector que estaba leyendo bien.
 */
const RESPIRO_REARMADO_MS = 800;

/** Espera del segundo intento de re-armado, si el primero llega demasiado pronto igual. */
const REINTENTO_REARMADO_MS = 2000;

const INTERVALO_SALUD_MS = 5 * 60 * 1000;

/**
 * El lector de tarjetas es un "keyboard wedge": teclea el número de socio y cierra con Enter.
 * Nadie hace clic en un campo antes de pasar la tarjeta, así que las pulsaciones se escuchan a
 * nivel documento y se separan de las de una persona por la cadencia: el lector manda un
 * carácter cada 10-30 ms, una persona no sostiene menos de ~100 ms.
 */
const PAUSA_MAX_ENTRE_TECLAS_MS = 120;

/**
 * Hay socios de un solo dígito, así que el largo del código no sirve para descartar un Enter
 * suelto: esta ventana es la que hace ese trabajo. El lector manda el Enter pegado al último
 * carácter; un Enter que llega después de esto no cierra ninguna ráfaga.
 */
const VENTANA_CIERRE_ESCANEO_MS = 300;

@Component({
  selector: 'app-acceso-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './acceso-cliente.component.html',
  styleUrls: ['./acceso-cliente.component.scss']
})
export class AccessClientComponent implements OnInit, OnDestroy {
  verificando: boolean = false;
  resultadoAcceso: AccesoDto | null = null;
  aviso: Aviso | null = null;

  /** Problema con el lector: hardware o Lite Client. */
  errorLector: string | null = null;
  /** Problema con el servicio de identificación. Es distinto y se muestra aparte. */
  errorServicio: string | null = null;

  private sdk: any = null;
  /** UID del lector en uso, de `enumerateDevices()`. Ver `iniciarCaptura()`. */
  private lectorUid: string | null = null;
  /** Captura activa. Sin esto `onDeviceConnected` se realimenta: ver `onDeviceConnected`. */
  private capturando = false;
  /** Hay un reintento de re-armado en curso: ver `iniciarCaptura()`. */
  private reintentandoRearmado = false;
  private temporizadorAviso: ReturnType<typeof setTimeout> | null = null;
  private temporizadorSalud: ReturnType<typeof setInterval> | null = null;

  /** Caracteres acumulados del escaneo de tarjeta en curso. */
  private bufferEscaneo = '';
  /** Marca del último carácter imprimible, para medir la cadencia del lector. */
  private ultimaTeclaMs = 0;

  constructor(
    private accesoService: AccesoService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.inicializarLector();
    this.revisarSalud();
    this.temporizadorSalud = setInterval(() => this.revisarSalud(), INTERVALO_SALUD_MS);
  }

  ngOnDestroy(): void {
    if (this.sdk) {
      this.capturando = false;
      try {
        this.sdk.stopAcquisition();
      } catch {
        // reader already stopped / unavailable
      }
    }
    if (this.temporizadorSalud) {
      clearInterval(this.temporizadorSalud);
    }
    if (this.temporizadorAviso) {
      clearTimeout(this.temporizadorAviso);
    }
  }

  // #region Salud del servicio
  /**
   * Avisa de un servicio caído o sin templates antes de que nadie apoye el dedo. Sin esto, una
   * caída del servicio se ve exactamente igual que una huella no enrolada, y recepción manda a
   * re-enrolarse a gente que no lo necesita.
   */
  private revisarSalud(): void {
    this.accesoService.estadoServicio().subscribe({
      next: (estado: EstadoServicio) => {
        if (estado.status === 'SIN_TEMPLATES') {
          this.errorServicio =
            'El servicio de huella no tiene huellas cargadas. Avisa a recepción.';
        } else {
          this.errorServicio = null;
        }
      },
      error: () => {
        this.errorServicio =
          'El servicio de huella no responde. El acceso con huella no está disponible.';
      }
    });
  }
  // #endregion Salud del servicio

  // #region Fingerprint SDK
  private inicializarLector(): void {
    if (typeof Fingerprint === 'undefined') {
      this.errorLector = 'Fingerprint SDK no disponible.';
      return;
    }

    this.sdk = new Fingerprint.WebApi();

    this.sdk.onSamplesAcquired = (s: any) => {
      // El lector acaba de entregar una muestra: cualquier aviso de canal caido que siga en
      // pantalla es viejo. Sin esto un fallo transitorio del re-armado deja el bloque de error
      // puesto para siempre sobre un lector que funciona.
      this.errorLector = null;
      try {
        const samples = JSON.parse(s.samples);
        const data: string = samples[0]?.Data;
        if (data) {
          this.procesarHuella(data);
        }
      } catch (err) {
        console.error('Error al procesar la muestra de huella:', err);
      } finally {
        // Sin esto solo llega la primera muestra: el lector sigue reportando calidad buena y no
        // vuelve a emitir `onSamplesAcquired` nunca mas. Lo que re-arma el canal es el
        // `stopAcquisition` de aqui dentro, no el `startAcquisition` que va detras — medido en el
        // kiosco: las muestras siguen llegando incluso cuando ese start falla.
        //
        // Va en el `finally` para que una muestra que no se pudo parsear no deje el lector mudo.
        this.reArmarCaptura();
      }
    };

    // Sin estos manejadores, una captura mala no producía ninguna señal: el socio se quedaba
    // esperando frente al lector sin saber que tenía que volver a intentar.
    this.sdk.onQualityReported = (e: any) => {
      // Si ya hay una identificación en vuelo, la captura fue buena: el reporte de calidad que
      // llegue detrás no debe contradecir el resultado que está por aparecer.
      this.errorLector = null;
      if (this.verificando) {
        return;
      }
      const mensaje = mensajeCalidad(Number(e?.quality));
      if (mensaje) {
        this.mostrarAviso('lectura', mensaje);
      }
    };

    this.sdk.onErrorOccurred = (e: any) => {
      console.error('Error del lector de huellas:', e?.error);
      if (this.verificando) {
        return;
      }
      this.mostrarAviso('lectura', 'No se pudo leer la huella. Intenta de nuevo.');
    };

    // Desconexión y caída del Lite Client son condiciones persistentes, no eventos puntuales:
    // van al bloque fijo del lector, no al modal.
    this.sdk.onDeviceDisconnected = () => {
      this.capturando = false;
      this.errorLector = 'Lector de huellas desconectado.';
    };

    // Vuelve a enumerar en vez de reusar el UID viejo: si reconectan otro lector, el anterior
    // ya no existe y capturar contra el UID guardado fallaria en silencio.
    //
    // Pero solo cuando NO hay captura activa. El SDK emite `onDeviceConnected` como respuesta a
    // `startAcquisition`, asi que re-capturar aqui es un bucle que se realimenta solo: se midieron
    // 4010 vueltas en 7 minutos, y entre vuelta y vuelta la captura se reiniciaba antes de que
    // llegara la muestra. El sintoma era un lector que reportaba calidad y no entregaba nada.
    this.sdk.onDeviceConnected = () => {
      this.errorLector = null;
      if (!this.capturando) {
        this.detectarYCapturar();
      }
    };

    this.sdk.onCommunicationFailed = () => {
      this.capturando = false;
      this.errorLector =
        'Se perdió la conexión con el lector. Verifica que el DigitalPersona Lite Client esté corriendo.';
    };

    this.detectarYCapturar();
  }

  private detectarYCapturar(): void {
    this.sdk
      .enumerateDevices()
      .then((devices: string[]) => {
        if (devices && devices.length > 0) {
          this.errorLector = null;
          this.lectorUid = devices[0];
          this.iniciarCaptura();
        } else {
          this.lectorUid = null;
          this.errorLector = 'No se detectó ningún lector de huellas.';
        }
      })
      .catch((error: any) => {
        this.errorLector = 'Error al enumerar lectores: ' + (error?.message ?? error);
      });
  }

  /**
   * Cierra la captura agotada y abre una nueva.
   *
   * El `stopAcquisition` no es decorativo: sin el, el `startAcquisition` siguiente cae sobre una
   * captura que el SDK todavia cree viva y no re-arma nada. El respiro antes de reabrir evita
   * pisar el cierre, que tambien es asincrono.
   */
  private reArmarCaptura(): void {
    if (!this.sdk) {
      return;
    }
    try {
      this.sdk.stopAcquisition();
    } catch {
      // ya estaba detenida
    }
    this.capturando = false;
    setTimeout(() => this.iniciarCaptura(), RESPIRO_REARMADO_MS);
  }

  /**
   * Hay que nombrar el lector explicitamente.
   *
   * `startAcquisition(formato)` sin UID manda `DeviceID: "00000000-0000-0000-0000-000000000000"`
   * — el GUID nulo, que el SDK documenta como "cualquier lector". Con el Lite Client esa variante
   * resuelve la promesa **sin llegar a tomar el lector**: no hay excepcion, no hay mensaje de
   * error, y el dedo apoyado no produce ninguna muestra.
   *
   * El UID sale de `enumerateDevices()`.
   */
  private iniciarCaptura(): void {
    if (!this.sdk || !this.lectorUid) {
      return;
    }
    if (this.capturando) {
      return;
    }
    this.capturando = true;
    this.sdk
      .startAcquisition(Fingerprint.SampleFormat.Intermediate, this.lectorUid)
      .then(() => {
        this.reintentandoRearmado = false;
      })
      .catch((error: any) => {
        this.capturando = false;

        // Un fallo al reabrir no es un lector caido: la captura anterior sigue entregando
        // muestras. Se reintenta una vez, mas lejos del cierre, y solo si ese segundo intento
        // tambien falla se le dice algo al socio.
        if (!this.reintentandoRearmado) {
          this.reintentandoRearmado = true;
          setTimeout(() => this.iniciarCaptura(), REINTENTO_REARMADO_MS);
          return;
        }

        this.reintentandoRearmado = false;
        this.errorLector = 'Error al iniciar la captura: ' + (error?.message ?? error);
      });
  }

  /**
   * Sends the captured template to the Java identification service, then
   * retrieves the matched socio data from NestJS.
   */
  private procesarHuella(data: string): void {
    // El SDK entrega muestras en streaming: sin esta guarda, un dedo apoyado
    // dispara varias identificaciones (y varios registros de asistencia).
    if (this.verificando) {
      return;
    }

    this.verificando = true;
    this.limpiarResultado();

    this.accesoService.matchFingerprint(data).subscribe({
      next: (res) => {
        if (res && res.socio != null) {
          this.cargarSocio(res.socio);
        } else {
          // El servicio respondió bien: la huella simplemente no está en el padrón.
          this.mostrarAviso('denegado', 'Tu huella no está registrada. Pasa a recepción.',
            'Huella no reconocida');
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error en la identificación de huella:', err);
        this.mostrarAvisoDeError(err, 'No se pudo leer la huella. Intenta de nuevo.');
      }
    });
  }
  // #endregion Fingerprint SDK

  // #region Lector de tarjetas
  /**
   * El lector no escribe en ningún campo: sus pulsaciones llegan al documento como las de un
   * teclado. Se acumulan aquí y se cierran con el Enter que el propio lector manda.
   *
   * Angular desmonta este manejador al destruir la vista, así que —a diferencia del SDK y los
   * temporizadores— no lleva nada en `ngOnDestroy`.
   */
  @HostListener('document:keydown', ['$event'])
  manejarTeclaGlobal(e: KeyboardEvent): void {
    // Si el evento nació dentro de un campo de texto, ese campo manda: su (keyup.enter) ya
    // dispara la verificación, y atenderlo también aquí registraría el acceso dos veces.
    if (this.esCampoDeTexto(e.target)) {
      return;
    }

    // El lector nunca usa modificadores. Un Ctrl+R o un Alt+Tab del operador no es un escaneo y
    // además parte la ráfaga a media: lo que quedó en el buffer ya no sirve.
    if (e.ctrlKey || e.altKey || e.metaKey || e.repeat) {
      this.bufferEscaneo = '';
      return;
    }

    const ahora = Date.now();

    if (e.key === 'Enter') {
      const codigo = this.bufferEscaneo;
      // Se vacía siempre, incluso si el cierre se descarta: un segundo Enter no puede revivir
      // un código que ya se rechazó.
      this.bufferEscaneo = '';

      if (!codigo || ahora - this.ultimaTeclaMs > VENTANA_CIERRE_ESCANEO_MS) {
        return;
      }

      // Tras tocar "Intentar de nuevo" el botón se queda con el foco: sin esto el Enter del
      // lector lo volvería a presionar además de disparar el escaneo.
      e.preventDefault();
      this.procesarEscaneo(codigo);
      return;
    }

    // `length === 1` deja fuera Shift, Tab, F5, flechas y teclas muertas sin enumerarlas. Sale
    // SIN vaciar el buffer y sin tocar `ultimaTeclaMs`: los lectores que mandan caracteres en
    // mayúscula intercalan un evento de Shift en plena ráfaga, y limpiar ahí truncaría el código.
    if (e.key.length !== 1) {
      return;
    }

    // El primer carácter de una ráfaga siempre entra por aquí (la marca anterior es vieja), así
    // que este reinicio es el que abre el escaneo, no sólo el que descarta uno interrumpido.
    if (ahora - this.ultimaTeclaMs > PAUSA_MAX_ENTRE_TECLAS_MS) {
      this.bufferEscaneo = '';
    }

    this.bufferEscaneo += e.key;
    this.ultimaTeclaMs = ahora;
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

  private procesarEscaneo(codigo: string): void {
    // La guarda va aquí y no sólo dentro de identificarSocio: un aviso de tarjeta ilegible
    // lanzado a media identificación apagaría `verificando` y dejaría entrar una segunda lectura
    // encima de la primera.
    if (this.verificando) {
      return;
    }

    const socioId = this.normalizarCodigo(codigo);
    if (socioId === null) {
      // El tipo sigue siendo `lectura` —no es una negativa de acceso— pero el icono por defecto
      // es una huella, y quien acaba de pasar una tarjeta no entendería ese dibujo.
      this.mostrarAviso('lectura', 'No se pudo leer la tarjeta. Intenta de nuevo o pasa a recepción.',
        'Tarjeta no reconocida', 'fa-id-card');
      return;
    }

    this.identificarSocio(socioId);
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
  // #endregion Lector de tarjetas

  /**
   * Único punto de entrada de una identificación por número de socio: huella, tarjeta y captura
   * manual desembocan aquí para que la guarda de "ya hay una verificación en curso" sea una
   * sola. Comparten el torniquete, así que dos identificaciones encimadas registrarían doble
   * asistencia al mismo socio.
   */
  private identificarSocio(socioId: number): void {
    if (this.verificando) {
      return;
    }
    this.verificando = true;
    this.limpiarResultado();
    this.cargarSocio(socioId);
  }

  private cargarSocio(socioId: number): void {
    this.accesoService.registrarAcceso(socioId).subscribe({
      next: (res: AccesoDto) => {
        if (res.acceso && res.socio) {
          this.resultadoAcceso = res;
          this.verificando = false;
          this.programarCierreDelResultado();
          this.toastService.show('Acceso registrado exitosamente', 'success');
          this.abrirTorniquete();
        } else {
          this.mostrarAviso('denegado', res.motivo ?? 'Acceso denegado');
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error al registrar acceso:', err);
        this.mostrarAvisoDeError(err, 'No se pudo registrar el acceso. Intenta de nuevo.');
      }
    });
  }

  /**
   * Un servicio caído no es culpa del socio: distinguirlo evita que recepción mande a
   * re-enrolarse a gente cuya huella está perfectamente bien.
   */
  private mostrarAvisoDeError(err: HttpErrorResponse, mensajeDeLectura: string): void {
    const inalcanzable = err.status === 0 || err.status >= 500;
    if (inalcanzable) {
      this.mostrarAviso('servicio', 'El sistema de acceso no está disponible. Pasa a recepción.');
    } else {
      this.mostrarAviso('lectura', mensajeDeLectura);
    }
  }

  /**
   * El torniquete se abre sólo después de que el API aprobó el acceso.
   * Si el puerto serial falla no se le quita el acceso al socio: la asistencia
   * ya quedó registrada, así que sólo se avisa.
   */
  private abrirTorniquete(): void {
    this.accesoService.abrirTorniquete().subscribe({
      error: (err: unknown) => {
        console.error('Error al abrir el torniquete:', err);
        this.toastService.show('No se pudo abrir el torniquete', 'error');
      }
    });
  }

  private static readonly TITULOS: Record<TipoAviso, string> = {
    lectura: 'No se pudo leer la huella',
    denegado: 'Acceso Denegado',
    servicio: 'Servicio no disponible'
  };

  private static readonly ICONOS: Record<TipoAviso, string> = {
    lectura: 'fa-fingerprint',
    denegado: 'fa-times-circle',
    servicio: 'fa-plug-circle-xmark'
  };

  /**
   * Muestra uno de los tres modales de fallo.
   *
   * Un aviso de `lectura` nunca pisa un modal visible: el SDK reporta la calidad justo después
   * de una captura buena, y ese reporte no puede tapar el "¡Acceso Permitido!" del socio.
   */
  private mostrarAviso(tipo: TipoAviso, mensaje: string, titulo?: string, icono?: string): void {
    // Ojo: aquí NO se puede filtrar por `verificando`. Los avisos de lectura que nacen de un
    // error HTTP llegan con la verificación todavía en curso; el filtro por captura en vuelo
    // vive en los manejadores del SDK.
    //
    // Pero el intento termina aquí incluso cuando el aviso no alcanza a mostrarse: si se saliera
    // antes de apagar `verificando`, el kiosco quedaría bloqueado y no aceptaría ni una huella
    // ni una tarjeta más hasta recargar la página.
    this.verificando = false;

    if (tipo === 'lectura' && (this.resultadoAcceso || this.aviso)) {
      return;
    }

    this.resultadoAcceso = null;
    this.aviso = {
      tipo,
      titulo: titulo ?? AccessClientComponent.TITULOS[tipo],
      mensaje,
      icono: icono ?? AccessClientComponent.ICONOS[tipo]
    };

    if (this.temporizadorAviso) {
      clearTimeout(this.temporizadorAviso);
    }
    this.temporizadorAviso = setTimeout(() => this.limpiarResultado(), DURACION_AVISO[tipo]);
  }

  /** Captura manual: el respaldo de recepción cuando una tarjeta no lee. */
  socioInput: string = '';

  verificarSocio(): void {
    const texto = this.socioInput.trim();
    // Estricto a propósito, al revés que el escaneo: aquí escribe una persona, y aceptar "12a3"
    // como 123 registraría la asistencia de otro socio sin que nadie lo note.
    const socioId = /^\d+$/.test(texto) ? Number(texto) : NaN;
    if (!Number.isSafeInteger(socioId) || socioId <= 0) {
      this.toastService.show('Ingresa un número de socio válido', 'error');
      return;
    }

    this.identificarSocio(socioId);
  }

  /**
   * Cierra solo el modal de acceso concedido. Los avisos ya lo hacen dentro de `mostrarAviso()`;
   * el exito no tenia temporizador y se quedaba en pantalla hasta el intento siguiente.
   */
  private programarCierreDelResultado(): void {
    if (this.temporizadorAviso) {
      clearTimeout(this.temporizadorAviso);
    }
    this.temporizadorAviso = setTimeout(() => this.limpiarResultado(), DURACION_RESULTADO_MS);
  }

  limpiarResultado() {
    this.resultadoAcceso = null;
    this.aviso = null;
    if (this.temporizadorAviso) {
      clearTimeout(this.temporizadorAviso);
      this.temporizadorAviso = null;
    }
    this.socioInput = '';
  }

  obtenerEstadoMembresia(fechaVencimiento?: string, becado?: boolean): { clase: string; texto: string } {
    if (becado) {
      return { clase: 'becado', texto: 'Beca activa' };
    }

    if (!fechaVencimiento) {
      return { clase: '', texto: '' };
    }

    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    let diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    // diasRestantes = 6;
    if (diasRestantes < 0) {
      return { clase: 'vencida', texto: 'Membresía vencida' }; // Cuvierto por la revision de adudos en el backend
    } else if (diasRestantes <= 7) {
      return { clase: 'proxima-vencer', texto: `Membresía vence en ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}` };
    } else {
      return { clase: 'vigente', texto: 'Membresía vigente' };
    }
  }
}
