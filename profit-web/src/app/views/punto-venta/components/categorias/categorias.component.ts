import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PuntoVentaService, Categoria, CategoriaDTO } from '@services/punto-venta.service';
import { ToastService } from '@services/shared/toast.service';
import { SharedModalComponent } from '@views/shared/shared-modal/shared-modal.component';
import { ConfirmModalComponent } from '@views/shared/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModalComponent, ConfirmModalComponent],
  templateUrl: './categorias.component.html',
  styleUrls: ['./categorias.component.scss']
})
export class CategoriasComponent {
  @Input() categorias: Categoria[] = [];
  @Input() categoriaSeleccionada: number | null = null;
  @Input() isLoading = false;
  
  @Output() categoriaSeleccionadaChange = new EventEmitter<number | null>();
  @Output() categoriaCreada = new EventEmitter<void>();
  @Output() categoriaEliminada = new EventEmitter<void>();

  mostrarModalCategoria = false;
  nuevaCategoria = { nombre: '', color: '#F97316' };
  
  mostrarConfirmEliminar = false;
  categoriaAEliminar: number | null = null;
  
  isSaving = false;

  constructor(
    private puntoVentaService: PuntoVentaService,
    private toast: ToastService
  ) {}

  seleccionarCategoria(categoriaId: number | null): void {
    this.categoriaSeleccionadaChange.emit(categoriaId);
  }

  abrirModalCategoria(): void {
    this.mostrarModalCategoria = true;
    this.nuevaCategoria = { nombre: '', color: '#F97316' };
  }

  cerrarModalCategoria(): void {
    this.mostrarModalCategoria = false;
    this.nuevaCategoria = { nombre: '', color: '#F97316' };
  }

  crearCategoria(): void {
    if (!this.nuevaCategoria.nombre.trim()) {
      this.toast.show('El nombre de la categoría es obligatorio', 'error');
      return;
    }

    this.isSaving = true;
    const dto: CategoriaDTO = {
      nomcategoria: this.nuevaCategoria.nombre,
      color: this.nuevaCategoria.color,
      enpantalla: 1
    };

    this.puntoVentaService.createCategoria(dto).subscribe({
      next: () => {
        this.toast.show('Categoría creada exitosamente', 'success');
        this.cerrarModalCategoria();
        this.categoriaCreada.emit();
        this.isSaving = false;
      },
      error: () => {
        this.toast.show('Error al crear la categoría', 'error');
        this.isSaving = false;
      }
    });
  }

  eliminarCategoria(categoriaId: number, event: Event): void {
    event.stopPropagation();
    this.categoriaAEliminar = categoriaId;
    this.mostrarConfirmEliminar = true;
  }

  confirmarEliminarCategoria(): void {
    if (this.categoriaAEliminar !== null) {
      this.puntoVentaService.deleteCategoria(this.categoriaAEliminar).subscribe({
        next: () => {
          this.toast.show('Categoría eliminada exitosamente', 'success');
          this.categoriaEliminada.emit();
          this.cancelarEliminarCategoria();
        },
        error: () => {
          this.toast.show('Error al eliminar la categoría', 'error');
          this.cancelarEliminarCategoria();
        }
      });
    }
  }

  cancelarEliminarCategoria(): void {
    this.mostrarConfirmEliminar = false;
    this.categoriaAEliminar = null;
  }
}
