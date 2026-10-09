import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../services/shared/toast.service';
import { MenuService } from '../../services/shared/menu.service';
import { AccesoService, AccesoDto, EstadoServicio } from '../../services/acceso.service';
import { FingerprintReaderService } from './fingerprint-reader.service';
import { CardReaderParserService } from './card-reader-parser.service';

/**
 * Los tres modos de fallo, que antes se veían todos como "Acceso Denegado":
 *  - `lectura`  : la captura no sirvió (dedo mal apoyado, sucio, mojado). No es una negativa.
 *  - `denegado` : se identificó pero no puede pasar, o el número de socio no existe.
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
 * "Si no es interrumpido": cualquier intento nuevo (huella o manual) pasa por
 * `limpiarResultado()`, que cancela este temporizador antes de armar el suyo, asi que en una fila
 * el modal de cada socio lo cierra el siguiente sin esperar los 15 s.
 */
const DURACION_RESULTADO_MS = 15000;

const DURACION_AVISO: Record<TipoAviso, number> = {
  lectura: DURACION_RESULTADO_MS,
  denegado: DURACION_RESULTADO_MS,
  servicio: DURACION_RESULTADO_MS
};

/**
 * Lo que el botón "Actualizar huellas" queda deshabilitado después de cada uso. La recarga que
 * dispara es completa (~13 MB y 2-3 s del hilo nativo del servicio, durante los cuales una
 * identificación espera): no es para apretarlo en ráfaga.
 */
const ENFRIAMIENTO_ACTUALIZAR_MS = 10 * 1000;

/**
 * Cuánto se ignora al socio que acaba de entrar si se vuelve a leer: el dedo que se queda apoyado
 * sigue entregando muestras, y la tarjeta a veces se pasa dos veces. La ventana se recorre con
 * cada lectura ignorada, así que un dedo apoyado largo no termina colándose.
 *
 * El API ya no inserta una segunda asistencia en el día, pero sin esto cada lectura mandaría
 * otro `R01` y alargaría el tiempo que el torniquete queda desbloqueado.
 */
const SILENCIO_MISMO_SOCIO_MS = 10 * 1000;

const INTERVALO_SALUD_MS = 5 * 60 * 1000;

@Component({
  selector: 'app-acceso-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [FingerprintReaderService, CardReaderParserService],
  templateUrl: './acceso-cliente.component.html',
  styleUrls: ['./acceso-cliente.component.scss']
})
export class AccesoClienteComponent implements OnInit, OnDestroy {
  pageIcon: string;

  verificando: boolean = false;
  resultadoAcceso: AccesoDto | null = null;
  aviso: Aviso | null = null;

  /** Problema con el lector: hardware o Lite Client. */
  errorLector: string | null = null;
  /** Problema con el servicio de identificación. Es distinto y se muestra aparte. */
  errorServicio: string | null = null;

  private temporizadorAviso: ReturnType<typeof setTimeout> | null = null;
  private temporizadorSalud: ReturnType<typeof setInterval> | null = null;

  constructor(
    private accesoService: AccesoService,
    private toastService: ToastService,
    private menuService: MenuService,
    private route: ActivatedRoute,
    private lector: FingerprintReaderService,
    private cardReader: CardReaderParserService
  ) {
    const segment = this.route.snapshot.url[0]?.path;
    this.pageIcon = this.menuService.getIconByRoute(segment);
  }

  ngOnInit(): void {
    this.lector.muestra$.subscribe((data) => this.procesarHuella(data));
    this.lector.errorLector$.subscribe((err) => (this.errorLector = err));

    // Sin estas suscripciones, una captura mala no producía ninguna señal: el socio se quedaba
    // esperando frente al lector sin saber que tenía que volver a intentar. Se filtran aquí y no
    // en el servicio porque un aviso de lectura nunca debe pisar una identificación en curso.
    this.lector.calidad$.subscribe((mensaje) => {
      if (!this.verificando) {
        this.mostrarAviso('lectura', mensaje);
      }
    });
    this.lector.errorCaptura$.subscribe(() => {
      if (!this.verificando) {
        this.mostrarAviso('lectura', 'No se pudo leer la huella. Intenta de nuevo.');
      }
    });

    this.lector.iniciar();
    this.revisarSalud();
    this.temporizadorSalud = setInterval(() => this.revisarSalud(), INTERVALO_SALUD_MS);
  }

  ngOnDestroy(): void {
    // FingerprintReaderService cierra la captura en su propio ngOnDestroy: Angular lo destruye
    // junto con este componente por estar en sus `providers`.
    if (this.temporizadorSalud) {
      clearInterval(this.temporizadorSalud);
    }
    if (this.temporizadorAviso) {
      clearTimeout(this.temporizadorAviso);
    }
    if (this.temporizadorEnfriamiento) {
      clearTimeout(this.temporizadorEnfriamiento);
    }
  }

  // #region Actualizar huellas
  /** Hay una recarga en vuelo: el botón gira. */
  actualizandoHuellas = false;
  /** Acaba de terminar una: el botón se queda deshabilitado un rato, sin girar. */
  enfriandoHuellas = false;
  private temporizadorEnfriamiento: ReturnType<typeof setTimeout> | null = null;

  /**
   * Botón bajo las instrucciones. Para el socio que acaba de enrolarse en recepción y llega al
   * torniquete antes de que el sondeo de cambios del servicio lo alcance (o con el sondeo
   * apagado). Es la recarga completa a propósito: es la acción de "asegúrate", y sirve aunque
   * el camino incremental esté caído.
   */
  actualizarHuellas(evento: Event): void {
    // El lector de tarjetas teclea Enter sobre el documento: si el botón se queda con el foco,
    // un Enter suelto lo volvería a presionar. Mismo problema que "Intentar de nuevo".
    (evento.currentTarget as HTMLElement | null)?.blur();

    if (this.actualizandoHuellas || this.enfriandoHuellas) {
      return;
    }
    this.actualizandoHuellas = true;

    this.accesoService.refrescarHuellas().subscribe({
      next: (resumen) => {
        this.toastService.show(`Huellas actualizadas: ${resumen.templates}`, 'success');
        // Un SIN_TEMPLATES que hubiera en pantalla ya no aplica.
        this.revisarSalud();
        this.programarEnfriamiento();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error al actualizar las huellas:', err);
        this.toastService.show('No se pudieron actualizar las huellas. Avisa a recepción.', 'error');
        this.programarEnfriamiento();
      }
    });
  }

  private programarEnfriamiento(): void {
    this.actualizandoHuellas = false;
    this.enfriandoHuellas = true;
    if (this.temporizadorEnfriamiento) {
      clearTimeout(this.temporizadorEnfriamiento);
    }
    this.temporizadorEnfriamiento = setTimeout(() => {
      this.enfriandoHuellas = false;
      this.temporizadorEnfriamiento = null;
    }, ENFRIAMIENTO_ACTUALIZAR_MS);
  }
  // #endregion Actualizar huellas

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

  /**
   * Único punto de entrada de una identificación por número de socio: la guarda de "ya hay una
   * verificación en curso" es una sola. Comparten el torniquete, así que dos identificaciones
   * encimadas registrarían doble asistencia al mismo socio.
   */
  private identificarSocio(socioId: number): void {
    if (this.verificando) {
      return;
    }
    this.verificando = true;
    this.limpiarResultado();
    this.cargarSocio(socioId);
  }

  /** El último acceso concedido, para reconocer la relectura del mismo socio. */
  private ultimoAcceso: { socio: number; ms: number; resultado: AccesoDto } | null = null;

  private cargarSocio(socioId: number): void {
    const ahora = Date.now();
    if (this.ultimoAcceso?.socio === socioId && ahora - this.ultimoAcceso.ms < SILENCIO_MISMO_SOCIO_MS) {
      // Quien llama ya limpió la pantalla: se repone el "¡Acceso Permitido!" que estaba, sin
      // volver a llamar al API ni abrir el torniquete otra vez.
      this.ultimoAcceso.ms = ahora;
      this.resultadoAcceso = this.ultimoAcceso.resultado;
      this.verificando = false;
      this.programarCierreDelResultado();
      return;
    }

    this.accesoService.registrarAcceso(socioId).subscribe({
      next: (res: AccesoDto) => {
        if (res.acceso && res.socio) {
          this.ultimoAcceso = { socio: socioId, ms: Date.now(), resultado: res };
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
    // más hasta recargar la página.
    this.verificando = false;

    if (tipo === 'lectura' && (this.resultadoAcceso || this.aviso)) {
      return;
    }

    this.resultadoAcceso = null;
    this.aviso = {
      tipo,
      titulo: titulo ?? AccesoClienteComponent.TITULOS[tipo],
      mensaje,
      icono: icono ?? AccesoClienteComponent.ICONOS[tipo]
    };

    if (this.temporizadorAviso) {
      clearTimeout(this.temporizadorAviso);
    }
    this.temporizadorAviso = setTimeout(() => this.limpiarResultado(), DURACION_AVISO[tipo]);
  }

  /** Captura manual: la forma en que recepción registra el acceso. */
  socioInput: string = '';

  verificarSocio(): void {
    const texto = this.socioInput.trim();
    // Estricto a propósito: aquí escribe una persona, y aceptar "12a3" como 123 registraría la
    // asistencia de otro socio sin que nadie lo note.
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
    const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diasRestantes < 0) {
      return { clase: 'vencida', texto: 'Membresía vencida' }; // Cubierto por la revision de adeudos en el backend
    } else if (diasRestantes <= 7) {
      return { clase: 'proxima-vencer', texto: `Membresía vence en ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}` };
    } else {
      return { clase: 'vigente', texto: 'Membresía vigente' };
    }
  }

  // #region Lector de tarjetas
  /**
   * El lector no escribe en ningún campo: sus pulsaciones llegan al documento como las de un
   * teclado. `CardReaderParserService` acumula y cierra la ráfaga; aquí sólo se decide qué hacer
   * con un escaneo ya cerrado.
   */
  @HostListener('document:keydown', ['$event'])
  manejarTeclaGlobal(e: KeyboardEvent): void {
    const resultado = this.cardReader.procesarTecla(e);
    if (!resultado) {
      return;
    }

    // La guarda va aquí y no antes: un aviso de tarjeta ilegible lanzado a media identificación
    // apagaría `verificando` y dejaría entrar una segunda lectura encima de la primera. El buffer
    // ya se consumió en el servicio de todos modos, así que no hay nada que perder ignorándolo.
    if (this.verificando) {
      return;
    }

    if (resultado.tipo === 'invalido') {
      // El tipo sigue siendo `lectura` —no es una negativa de acceso— pero el icono por defecto
      // es una huella, y quien acaba de pasar una tarjeta no entendería ese dibujo.
      this.mostrarAviso('lectura', 'No se pudo leer la tarjeta. Intenta de nuevo o pasa a recepción.',
        'Tarjeta no reconocida', 'fa-id-card');
      return;
    }

    this.identificarSocio(resultado.socioId);
  }
  // #endregion Lector de tarjetas
}
