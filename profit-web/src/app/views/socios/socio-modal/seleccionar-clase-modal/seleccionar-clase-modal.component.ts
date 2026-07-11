import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModalComponent } from '@components/shared-modal/shared-modal.component';
import { ToastService } from '@services/shared/toast.service';
import { ClasesService, Clase } from '@services/clases.service';
import { Socio, SociosService } from '@services/socios.service';

@Component({
  selector: 'app-seleccionar-clase-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModalComponent],
  templateUrl: './seleccionar-clase-modal.component.html',
  styleUrls: ['./seleccionar-clase-modal.component.scss'],
})
export class SeleccionarClaseModalComponent implements OnInit {
  @Input() socioId!: number;
  @Output() closed = new EventEmitter<void>();
  @Output() asignada = new EventEmitter<Socio>();

  clases: Clase[] = [];
  selectedClase: Clase | null = null;
  selectedPeriodo: string | null = null;

  isLoading = false;
  isSaving = false;

  constructor(
    private clasesService: ClasesService,
    private sociosService: SociosService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadClases();
  }

  loadClases(): void {
    this.isLoading = true;
    this.clasesService.getAllClases().subscribe({
      next: (data) => {
        this.clases = data.filter((c) => c.activa === 1);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.show('Error al cargar las clases.', 'error');
      },
    });
  }

  selectClase(c: Clase): void {
    this.selectedClase = c;
    this.selectedPeriodo = null;
  }

  selectPeriodo(periodo: string): void {
    this.selectedPeriodo = periodo;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  }

  asignarClase(): void {
    if (!this.selectedClase) {
      this.toast.show('Selecciona una clase', 'error');
      return;
    }
    if (!this.selectedPeriodo) {
      this.toast.show('Selecciona una periodicidad', 'error');
      return;
    }

    this.isSaving = true;
    this.sociosService
      .cambiarClase(this.socioId, { claseId: this.selectedClase.clase, periodo: this.selectedPeriodo })
      .subscribe({
        next: (socio) => {
          this.isSaving = false;
          this.toast.show('Clase asignada correctamente', 'success');
          this.asignada.emit(socio);
        },
        error: () => {
          this.isSaving = false;
          this.toast.show('Error al asignar la clase', 'error');
        },
      });
  }

  onClose(): void {
    this.closed.emit();
  }
}
