import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModalComponent } from '@components/shared-modal/shared-modal.component';
import { ToastService } from '@services/shared/toast.service';
import { PagoLinea, Socio, SociosService } from '@services/socios.service';
import { FormaPago, FormasPagoService } from '@services/formas-pago.service';

interface PagoRow {
  fp?: number;
  importe: number;
}

@Component({
  selector: 'app-cobrar-mensualidad-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModalComponent],
  templateUrl: './cobrar-mensualidad-modal.component.html',
  styleUrls: ['./cobrar-mensualidad-modal.component.scss'],
})
export class CobrarMensualidadModalComponent implements OnInit {
  @Input() socioId!: number;
  @Input() importeBase = 0;
  @Output() closed = new EventEmitter<void>();
  @Output() pagada = new EventEmitter<Socio>();

  formasPago: FormaPago[] = [];
  isLoading = false;
  isPaying = false;

  descuento = 0;
  motivo = '';
  pagos: PagoRow[] = [];

  constructor(
    private sociosService: SociosService,
    private formasPagoService: FormasPagoService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadFormasPago();
  }

  loadFormasPago(): void {
    this.isLoading = true;
    this.formasPagoService.getFormasPago().subscribe({
      next: (data) => {
        this.formasPago = data;
        // Inicia con una línea que cubre el total con la primera forma de pago.
        this.pagos = [{ fp: data[0]?.id, importe: this.total }];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.show('Error al cargar las formas de pago.', 'error');
      },
    });
  }

  get total(): number {
    return this.round2((this.importeBase ?? 0) - (this.descuento || 0));
  }

  get sumaPagos(): number {
    return this.round2(this.pagos.reduce((acc, p) => acc + (Number(p.importe) || 0), 0));
  }

  get restante(): number {
    return this.round2(this.total - this.sumaPagos);
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  agregarLinea(): void {
    const restante = this.restante > 0 ? this.restante : 0;
    this.pagos.push({ fp: this.formasPago[0]?.id, importe: restante });
  }

  quitarLinea(index: number): void {
    if (this.pagos.length <= 1) return;
    this.pagos.splice(index, 1);
  }

  cobrar(): void {
    if (this.isPaying) return;

    if ((this.descuento || 0) < 0) {
      this.toast.show('El descuento no puede ser negativo', 'error');
      return;
    }
    if ((this.descuento || 0) > 0 && !this.motivo.trim()) {
      this.toast.show('El motivo del descuento es obligatorio', 'error');
      return;
    }
    if (this.total < 0) {
      this.toast.show('El descuento no puede ser mayor al importe', 'error');
      return;
    }
    if (this.pagos.some((p) => !p.fp)) {
      this.toast.show('Seleccione una forma de pago en cada línea', 'error');
      return;
    }
    if (this.pagos.some((p) => !(Number(p.importe) > 0))) {
      this.toast.show('Cada pago debe tener un importe mayor a 0', 'error');
      return;
    }
    if (this.restante !== 0) {
      this.toast.show('La suma de los pagos debe ser igual al total a pagar', 'error');
      return;
    }

    const pagos: PagoLinea[] = this.pagos.map((p) => ({ fp: p.fp!, importe: Number(p.importe) }));

    this.isPaying = true;
    this.sociosService
      .pagarMensualidad(this.socioId, {
        pagos,
        descuento: this.descuento || 0,
        motivo: this.motivo.trim(),
      })
      .subscribe({
        next: (socio) => {
          this.isPaying = false;
          this.toast.show('Cobro registrado correctamente', 'success');
          this.pagada.emit(socio);
        },
        error: (err) => {
          this.isPaying = false;
          const message = err?.error?.message ?? 'Error al registrar el cobro';
          this.toast.show(message, 'error');
        },
      });
  }

  onClose(): void {
    this.closed.emit();
  }
}
