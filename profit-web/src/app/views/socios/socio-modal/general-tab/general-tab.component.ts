import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ModalService } from '@services/shared/modal.service';
import { ToastService } from '@services/shared/toast.service';
import { CreateSocioDto, Socio, SociosService, UpdateSocioDto } from '@services/socios.service';
import { SeleccionarClaseModalComponent } from './seleccionar-clase-modal/seleccionar-clase-modal.component';

@Component({
  selector: 'app-socio-general-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, SeleccionarClaseModalComponent],
  templateUrl: './general-tab.component.html',
  styleUrls: ['./general-tab.component.scss'],
})
export class GeneralTabComponent implements OnChanges, OnInit, OnDestroy {
  @Input() socioId?: number;
  @Output() saved = new EventEmitter<void>();

  isLoading = false;
  isSaving = false;

  showSeleccionarClaseModal = false;

  socio: Partial<Socio> = {};

  private saveSubscription?: Subscription;

  get isEditMode(): boolean {
    return !!this.socioId;
  }

  get becadoChecked(): boolean {
    return this.socio.becado === 1;
  }

  set becadoChecked(val: boolean) {
    this.socio.becado = val ? 1 : 0;
  }

  get fechaNacimientoValue(): string {
    const fecha = this.socio.fechaNacimiento;
    if (!fecha) return '';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().substring(0, 10);
  }

  set fechaNacimientoValue(val: string) {
    this.socio.fechaNacimiento = val ? new Date(val) : undefined;
  }

  get diapagoValue(): string {
    const fecha = this.socio.diapago;
    if (!fecha) return '';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().substring(0, 10);
  }

  set diapagoValue(val: string) {
    this.socio.diapago = val ? new Date(val) : undefined;
  }

  constructor(
    private sociosService: SociosService,
    private modalService: ModalService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.saveSubscription = this.modalService.onSave$.subscribe(() => this.onSave());
  }

  ngOnDestroy(): void {
    this.saveSubscription?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['socioId']) {
      if (this.socioId) {
        this.loadSocio(this.socioId);
      } else {
        this.socio = { becado: 0, sexo: 0 };
      }
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

  cambiarClase(): void {
    this.showSeleccionarClaseModal = true;
  }

  onClaseAsignada(socioActualizado: Socio): void {
    this.socio = { ...socioActualizado };
    this.showSeleccionarClaseModal = false;
  }

  onSeleccionarClaseModalClosed(): void {
    this.showSeleccionarClaseModal = false;
  }

  registrarHuella(): void {
    console.log('Registrar huella - pendiente de implementar submodal');
  }

  modificarDiaPago(): void {
    console.log('Modificar día de pago - pendiente de implementar submodal');
  }

  onSave(): void {
    if (!this.socio.nomsocio?.trim()) {
      this.toast.show('El nombre completo es requerido', 'error');
      return;
    }

    this.isSaving = true;

    if (this.isEditMode && this.socioId) {
      const dto: UpdateSocioDto = {
        nomsocio: this.socio.nomsocio,
        tel1: this.socio.tel1,
        tel2: this.socio.tel2,
        correo: this.socio.correo,
        sexo: this.socio.sexo,
        fechaNacimiento: this.socio.fechaNacimiento,
        becado: this.socio.becado,
        comentarios: this.socio.comentarios ?? undefined,
        importepago: this.socio.precio,
        diapago: this.socio.diapago,
        descuento: this.socio.descuento,
      };

      this.sociosService.updateSocio(this.socioId, dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.show('Socio actualizado correctamente', 'success');
          this.saved.emit();
        },
        error: () => {
          this.isSaving = false;
          this.toast.show('Error al actualizar el socio', 'error');
        },
      });
    } else {
      const dto: CreateSocioDto = {
        nomsocio: this.socio.nomsocio!,
        tel1: this.socio.tel1,
        tel2: this.socio.tel2,
        correo: this.socio.correo,
        sexo: this.socio.sexo,
        fechaNacimiento: this.socio.fechaNacimiento,
        becado: this.socio.becado,
        comentarios: this.socio.comentarios ?? undefined,
      };

      this.sociosService.createSocio(dto).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.show('Socio creado correctamente', 'success');
          this.saved.emit();
        },
        error: () => {
          this.isSaving = false;
          this.toast.show('Error al crear el socio', 'error');
        },
      });
    }
  }
}
