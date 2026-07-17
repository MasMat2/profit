import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '@services/shared/toast.service';
import { Mensualidad, Socio, SociosService } from '@services/socios.service';
import { FormaPago, FormasPagoService } from '@services/formas-pago.service';

@Component({
  selector: 'app-socio-suscripciones-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './suscripciones-tab.component.html',
  styleUrls: ['./suscripciones-tab.component.scss'],
})
export class SuscripcionesTabComponent implements OnChanges {
  @Input() socioId?: number;

  isLoading = false;
  socio: Partial<Socio> = {};

  mensualidades: Mensualidad[] = [];
  isLoadingMensualidades = false;

  formasPago: FormaPago[] = [];
  selectedFp?: number;
  isPaying = false;

  constructor(
    private sociosService: SociosService,
    private formasPagoService: FormasPagoService,
    private toast: ToastService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['socioId'] && this.socioId) {
      this.loadSocio(this.socioId);
      this.loadMensualidades();
      this.loadFormasPago();
    }
  }

  loadSocio(id: number): void {
    this.isLoading = true;
    this.sociosService.getSocioById(id).subscribe({
      next: (data) => {
        this.socio = { ...data };
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.show('Error al cargar la información del socio.', 'error');
      },
    });
  }

  loadMensualidades(): void {
    if (!this.socioId) return;
    this.isLoadingMensualidades = true;
    this.sociosService.getMensualidades(this.socioId).subscribe({
      next: (data) => {
        this.mensualidades = data;
        this.isLoadingMensualidades = false;
      },
      error: () => {
        this.isLoadingMensualidades = false;
        this.toast.show('Error al cargar las mensualidades del socio.', 'error');
      },
    });
  }

  loadFormasPago(): void {
    this.formasPagoService.getFormasPago().subscribe({
      next: (data) => {
        this.formasPago = data;
        if (!this.selectedFp && data.length > 0) {
          this.selectedFp = data[0].id;
        }
      },
      error: () => {
        this.toast.show('Error al cargar las formas de pago.', 'error');
      },
    });
  }

  pagarProximaMensualidad(): void {
    if (!this.socioId) return;
    if (!this.selectedFp) {
      this.toast.show('Seleccione una forma de pago', 'error');
      return;
    }

    this.isPaying = true;
    this.sociosService.pagarMensualidad(this.socioId, this.selectedFp).subscribe({
      next: (data) => {
        this.socio = { ...data };
        this.isPaying = false;
        this.toast.show('Pago registrado correctamente', 'success');
        this.loadMensualidades();
      },
      error: (err) => {
        this.isPaying = false;
        const message = err?.error?.message ?? 'Error al registrar el pago';
        this.toast.show(message, 'error');
      },
    });
  }
}
