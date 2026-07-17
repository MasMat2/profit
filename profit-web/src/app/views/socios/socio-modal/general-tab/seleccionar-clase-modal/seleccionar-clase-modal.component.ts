import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
    this.loadClasesYSocioActual();
  }

  loadClasesYSocioActual(): void {
    this.isLoading = true;
    forkJoin({
      clases: this.clasesService.getAllClases(),
      socio: this.sociosService.getSocioById(this.socioId).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ clases, socio }) => {
        this.clases = clases.filter((c) => c.activa === 1);
        if (socio) {
          this.preseleccionarClaseActual(socio);
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.show('Error al cargar las clases.', 'error');
      },
    });
  }

  private preseleccionarClaseActual(socio: Socio): void {
    if (!socio.clase) {
      return;
    }

    const claseActual = this.clases.find((c) => c.clase === socio.clase!.id);
    if (!claseActual) {
      return;
    }

    this.selectClase(claseActual);

    if (socio.periodicidad) {
      const precioMatch = claseActual.precios.find(
        (p) => p.periodo.toLowerCase() === socio.periodicidad!.toLowerCase()
      );
      if (precioMatch) {
        this.selectedPeriodo = precioMatch.periodo;
      }
    }
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
