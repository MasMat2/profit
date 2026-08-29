import { Component, OnInit, OnDestroy } from '@angular/core';
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

const DURACION_AVISO: Record<TipoAviso, number> = {
  lectura: 25000,
  denegado: 30000,
  servicio: 50000
};

const INTERVALO_SALUD_MS = 5 * 60 * 1000;

@Component({
  selector: 'app-acceso-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './acceso-cliente.component.html',
  styleUrls: ['./acceso-cliente.component.scss']
})
export class AccessClientComponent implements OnInit, OnDestroy {
  readonly DEV_MODE = true;

  verificando: boolean = false;
  resultadoAcceso: AccesoDto | null = null;
  aviso: Aviso | null = null;

  /** Problema con el lector: hardware o Lite Client. */
  errorLector: string | null = null;
  /** Problema con el servicio de identificación. Es distinto y se muestra aparte. */
  errorServicio: string | null = null;

  private sdk: any = null;
  private temporizadorAviso: ReturnType<typeof setTimeout> | null = null;
  private temporizadorSalud: ReturnType<typeof setInterval> | null = null;

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
      try {
        const samples = JSON.parse(s.samples);
        const data: string = samples[0]?.Data;
        if (data) {
          this.procesarHuella(data);
        }
      } catch (err) {
        console.error('Error al procesar la muestra de huella:', err);
      }
    };

    // Sin estos manejadores, una captura mala no producía ninguna señal: el socio se quedaba
    // esperando frente al lector sin saber que tenía que volver a intentar.
    this.sdk.onQualityReported = (e: any) => {
      // Si ya hay una identificación en vuelo, la captura fue buena: el reporte de calidad que
      // llegue detrás no debe contradecir el resultado que está por aparecer.
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
      this.errorLector = 'Lector de huellas desconectado.';
    };

    this.sdk.onDeviceConnected = () => {
      this.errorLector = null;
      this.iniciarCaptura();
    };

    this.sdk.onCommunicationFailed = () => {
      this.errorLector =
        'Se perdió la conexión con el lector. Verifica que el DigitalPersona Lite Client esté corriendo.';
    };

    this.sdk
      .enumerateDevices()
      .then((devices: string[]) => {
        if (devices && devices.length > 0) {
          this.errorLector = null;
          this.iniciarCaptura();
        } else {
          this.errorLector = 'No se detectó ningún lector de huellas.';
        }
      })
      .catch((error: any) => {
        this.errorLector = 'Error al enumerar lectores: ' + (error?.message ?? error);
      });
  }

  private iniciarCaptura(): void {
    if (!this.sdk) {
      return;
    }
    this.sdk
      .startAcquisition(Fingerprint.SampleFormat.Intermediate)
      .catch((error: any) => {
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

  private cargarSocio(socioId: number): void {
    this.accesoService.registrarAcceso(socioId).subscribe({
      next: (res: AccesoDto) => {
        if (res.acceso && res.socio) {
          // this.resultadoAcceso = res;
          this.mostrarAviso('lectura', 'Mensaje prueba');
          this.verificando = false;
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
  private mostrarAviso(tipo: TipoAviso, mensaje: string, titulo?: string): void {
    // Ojo: aquí NO se puede filtrar por `verificando`. Los avisos de lectura que nacen de un
    // error HTTP llegan con la verificación todavía en curso; el filtro por captura en vuelo
    // vive en los manejadores del SDK.
    if (tipo === 'lectura' && (this.resultadoAcceso || this.aviso)) {
      return;
    }

    this.resultadoAcceso = null;
    this.aviso = {
      tipo,
      titulo: titulo ?? AccessClientComponent.TITULOS[tipo],
      mensaje,
      icono: AccessClientComponent.ICONOS[tipo]
    };
    this.verificando = false;

    if (this.temporizadorAviso) {
      clearTimeout(this.temporizadorAviso);
    }
    this.temporizadorAviso = setTimeout(() => this.limpiarResultado(), DURACION_AVISO[tipo]);
  }

  // #region DEV_MODE — delete this block (and matching HTML/SCSS sections) when removing dev mode
  huellaInput: string = '';

  // Repointed to the real NestJS retrieval: treats the input as a socio id.
  verificarHuella() {
    const socioId = Number(this.huellaInput.trim());
    if (!this.huellaInput.trim() || Number.isNaN(socioId)) {
      this.toastService.show('Ingresa un ID de socio válido', 'error');
      return;
    }

    this.verificando = true;
    this.limpiarResultado();
    this.cargarSocio(socioId);
  }
  // #endregion DEV_MODE

  limpiarResultado() {
    this.resultadoAcceso = null;
    this.aviso = null;
    if (this.temporizadorAviso) {
      clearTimeout(this.temporizadorAviso);
      this.temporizadorAviso = null;
    }
    this.huellaInput = ''; // DEV — remove this line with the DEV_MODE region
  }

  obtenerEstadoMembresia(fechaVencimiento?: string, becado?: boolean): { clase: string; texto: string } {
    if (becado) {
      // return { clase: 'vigente', texto: 'Beca activa' };
    }

    if (!fechaVencimiento) {
      return { clase: '', texto: '' };
    }

    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    let diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    diasRestantes = -1; 
    
    if (diasRestantes < 0) {
      return { clase: 'vencida', texto: 'Membresía vencida' }; // Cuvierto por la revision de adudos en el backend
    } else if (diasRestantes <= 7) {
      return { clase: 'proxima-vencer', texto: `Membresía vence en ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}` };
    } else {
      return { clase: 'vigente', texto: 'Membresía vigente' };
    }
  }
}
