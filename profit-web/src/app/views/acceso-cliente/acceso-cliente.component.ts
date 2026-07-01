import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../services/shared/toast.service';
import { AccesoService, SocioAcceso } from '../../services/acceso.service';

declare var Fingerprint: any;

interface Cliente {
  id: number;
  nombre: string;
  fechaVencimiento?: Date;
  tipoMembresia?: string;
  montoPago?: number;
  vigenciaVisitas?: Date;
}

interface ResultadoAcceso {
  success: boolean;
  message: string;
  cliente?: Cliente;
  asistencia?: {
    success: boolean;
    fecha: Date;
  };
}

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
  resultadoAcceso: ResultadoAcceso | null = null;
  mostrarResultado: boolean = false;

  private sdk: any = null;

  constructor(
    private accesoService: AccesoService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.inicializarLector();
  }

  ngOnDestroy(): void {
    if (this.sdk) {
      try {
        this.sdk.stopAcquisition();
      } catch {
        // reader already stopped / unavailable
      }
    }
  }

  // #region Fingerprint SDK
  private inicializarLector(): void {
    if (typeof Fingerprint === 'undefined') {
      console.warn('Fingerprint SDK no disponible.');
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

    this.sdk
      .enumerateDevices()
      .then((devices: string[]) => {
        if (devices && devices.length > 0) {
          this.iniciarCaptura();
        } else {
          console.warn('No se detectó ningún lector de huellas.');
        }
      })
      .catch((error: any) => {
        console.error('Error al enumerar lectores:', error?.message ?? error);
      });
  }

  private iniciarCaptura(): void {
    if (!this.sdk) {
      return;
    }
    this.sdk
      .startAcquisition(Fingerprint.SampleFormat.Intermediate)
      .catch((error: any) => {
        console.error('Error al iniciar la captura:', error?.message ?? error);
      });
  }

  /**
   * Sends the captured template to the Java identification service, then
   * retrieves the matched socio data from NestJS.
   */
  private procesarHuella(data: string): void {
    this.verificando = true;
    this.mostrarResultado = false;

    this.accesoService.matchFingerprint(data).subscribe({
      next: (res) => {
        if (res && res.socio != null) {
          this.cargarSocio(res.socio);
        } else {
          this.mostrarAccesoDenegado();
        }
      },
      error: (err) => {
        console.error('Error en la identificación de huella:', err);
        this.mostrarAccesoDenegado();
      }
    });
  }
  // #endregion Fingerprint SDK

  private cargarSocio(socioId: number): void {
    this.accesoService.getSocioAcceso(socioId).subscribe({
      next: (socio) => {
        this.resultadoAcceso = this.construirResultado(socio);
        this.mostrarResultado = true;
        this.verificando = false;
        this.toastService.show('Acceso registrado exitosamente', 'success');
        setTimeout(() => this.limpiarResultado(), 30000);
      },
      error: (err) => {
        console.error('Error al obtener datos del socio:', err);
        this.mostrarAccesoDenegado();
      }
    });
  }

  private construirResultado(socio: SocioAcceso): ResultadoAcceso {
    return {
      success: true,
      message: 'Acceso permitido',
      cliente: {
        id: socio.socio ?? socio.id,
        nombre: socio.nombre,
        tipoMembresia: socio.tipoMembresia,
        fechaVencimiento: socio.fechaVencimiento ? new Date(socio.fechaVencimiento) : undefined,
        vigenciaVisitas: socio.vigenciaVisitas ? new Date(socio.vigenciaVisitas) : undefined,
      },
      asistencia: {
        success: true,
        fecha: new Date()
      }
    };
  }

  private mostrarAccesoDenegado(): void {
    this.resultadoAcceso = {
      success: false,
      message: 'Socio no encontrado'
    };
    this.mostrarResultado = true;
    this.verificando = false;
    setTimeout(() => this.limpiarResultado(), 3000);
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
    this.mostrarResultado = false;
    this.cargarSocio(socioId);
  }
  // #endregion DEV_MODE

  limpiarResultado() {
    this.mostrarResultado = false;
    this.resultadoAcceso = null;
    this.huellaInput = ''; // DEV — remove this line with the DEV_MODE region
  }

  obtenerEstadoMembresia(fechaVencimiento?: Date): { clase: string; texto: string } {
    if (!fechaVencimiento) {
      return { clase: '', texto: '' };
    }

    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0) {
      return { clase: 'vencida', texto: 'Vencida' };
    } else if (diasRestantes <= 7) {
      return { clase: 'proxima-vencer', texto: `Vence en ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}` };
    } else {
      return { clase: 'vigente', texto: 'Vigente' };
    }
  }
}
