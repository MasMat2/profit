import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationModalComponent } from '@components/confirmation-modal/confirmation-modal.component';
import { ToastService } from '@services/shared/toast.service';
import { SociosService } from '@services/socios.service';

interface Captura {
  fmd: string;
  calidad: number;
}

// El lector físico se integra aparte (ver acceso-cliente, que sí usa Fingerprint.WebApi).
// Aquí la captura es simulada: el flujo de 4 tomas, la calidad y el guardado son reales,
// pero el template que se persiste no lo reconoce el servicio de identificación.
const CAPTURAS_REQUERIDAS = 4;
const DURACION_CAPTURA_MS = 900;

@Component({
  selector: 'app-registrar-huella-modal',
  standalone: true,
  imports: [CommonModule, ConfirmationModalComponent],
  templateUrl: './registrar-huella-modal.component.html',
  styleUrls: ['./registrar-huella-modal.component.scss'],
})
export class RegistrarHuellaModalComponent implements OnInit {
  @Input() socioId!: number;
  @Input() nombreSocio?: string;
  @Output() closed = new EventEmitter<void>();
  @Output() guardada = new EventEmitter<boolean>(); // true = registrada, false = eliminada

  readonly capturasRequeridas = CAPTURAS_REQUERIDAS;
  readonly pasos = Array.from({ length: CAPTURAS_REQUERIDAS }, (_, i) => i + 1);

  isLoading = false;
  isSaving = false;

  capturando = false;
  capturas: Captura[] = [];
  calidad = 0;

  huellaRegistrada = false;
  fechaRegistro?: Date | string;
  confirmandoEliminacion = false;

  constructor(
    private sociosService: SociosService,
    private toast: ToastService
  ) {}

  get capturasCompletadas(): number {
    return this.capturas.length;
  }

  get pasoActual(): number {
    return this.capturando ? this.capturas.length + 1 : 0;
  }

  ngOnInit(): void {
    this.cargarHuellaExistente();
  }

  cargarHuellaExistente(): void {
    this.isLoading = true;
    this.sociosService.getHuella(this.socioId).subscribe({
      next: (huella) => {
        if (huella) {
          this.huellaRegistrada = true;
          this.fechaRegistro = huella.fecnvo;
          this.calidad = 100;
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.show('Error al consultar la huella del socio.', 'error');
      },
    });
  }

  capturar(): void {
    if (this.capturando || this.capturasCompletadas >= this.capturasRequeridas) {
      return;
    }

    this.capturando = true;

    // El retardo deja ver la animación de escaneo; al integrar el lector real
    // esto se reemplaza por el callback onSamplesAcquired del SDK.
    setTimeout(() => {
      const captura: Captura = {
        fmd: `SIMULATED_FMD_${this.socioId}_${this.capturasCompletadas + 1}_${Date.now()}`,
        calidad: 80 + Math.floor(Math.random() * 16),
      };

      this.capturas.push(captura);
      this.calidad = captura.calidad;
      this.capturando = false;

      if (this.capturasCompletadas >= this.capturasRequeridas) {
        this.guardar();
      }
    }, DURACION_CAPTURA_MS);
  }

  private guardar(): void {
    const calidadPromedio = Math.round(
      this.capturas.reduce((suma, c) => suma + c.calidad, 0) / this.capturas.length
    );
    const huella = this.capturas.map((c) => c.fmd).join('||');

    this.isSaving = true;
    this.sociosService.guardarHuella(this.socioId, { huella, dedo: 1 }).subscribe({
      next: (registro) => {
        this.isSaving = false;
        this.calidad = calidadPromedio;
        this.huellaRegistrada = true;
        this.fechaRegistro = registro?.fecnvo;
        this.toast.show('Huella registrada correctamente', 'success');
        this.guardada.emit(true);
      },
      error: () => {
        this.isSaving = false;
        this.reiniciarCapturas();
        this.toast.show('Error al guardar la huella', 'error');
      },
    });
  }

  solicitarEliminacion(): void {
    this.confirmandoEliminacion = true;
  }

  cancelarEliminacion(): void {
    this.confirmandoEliminacion = false;
  }

  confirmarEliminacion(): void {
    this.isSaving = true;
    this.sociosService.eliminarHuella(this.socioId).subscribe({
      next: () => {
        this.isSaving = false;
        this.confirmandoEliminacion = false;
        this.huellaRegistrada = false;
        this.fechaRegistro = undefined;
        this.reiniciarCapturas();
        this.toast.show('Huella eliminada correctamente', 'success');
        this.guardada.emit(false);
      },
      error: () => {
        this.isSaving = false;
        this.confirmandoEliminacion = false;
        this.toast.show('Error al eliminar la huella', 'error');
      },
    });
  }

  private reiniciarCapturas(): void {
    this.capturas = [];
    this.calidad = 0;
    this.capturando = false;
  }

  getColorCalidad(): string {
    if (this.calidad >= 80) return '#10B981';
    if (this.calidad >= 60) return '#F59E0B';
    return '#EF4444';
  }

  getEtiquetaCalidad(): string {
    if (this.calidad >= 80) return 'Excelente';
    if (this.calidad >= 60) return 'Buena';
    if (this.calidad >= 40) return 'Regular';
    return 'Baja';
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    // Con la confirmación abierta, Esc sólo la descarta.
    if (this.confirmandoEliminacion) {
      this.cancelarEliminacion();
      return;
    }
    this.onClose();
  }

  onClose(): void {
    this.closed.emit();
  }
}
