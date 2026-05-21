import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PuntoVentaService, Producto, ProductoDTO } from '@services/punto-venta.service';
import { ToastService } from '@services/shared/toast.service';
import { SharedModalComponent } from '@views/shared/shared-modal/shared-modal.component';
import { ConfirmModalComponent } from '@views/shared/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-productos-list',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModalComponent, ConfirmModalComponent],
  templateUrl: './productos-list.component.html',
  styleUrls: ['./productos-list.component.scss']
})
export class ProductosListComponent {
  @Input() productos: Producto[] = [];
  @Input() categoriaSeleccionada: number | null = null;
  @Input() isLoading = false;
  
  @Output() productoAgregado = new EventEmitter<Producto>();
  @Output() productoCreado = new EventEmitter<void>();
  @Output() productoActualizado = new EventEmitter<void>();

  mostrarModalProducto = false;
  nuevoProducto = { nombre: '', precio: 0, stock: 0, costo: 0 };
  
  mostrarModalEditarProducto = false;
  productoEditando: Producto | null = null;
  productoEditado = { nombre: '', precio: 0, stock: 0, costo: 0 };
  
  mostrarConfirmEliminar = false;
  productoAEliminar: number | null = null;
  
  isSaving = false;

  constructor(
    private puntoVentaService: PuntoVentaService,
    private toast: ToastService
  ) {}

  agregarAlCarrito(producto: Producto): void {
    this.productoAgregado.emit(producto);
  }

  abrirModalProducto(): void {
    if (this.categoriaSeleccionada === null) {
      this.toast.show('Selecciona una categoría primero', 'error');
      return;
    }
    this.mostrarModalProducto = true;
    this.nuevoProducto = { nombre: '', precio: 0, stock: 0, costo: 0 };
  }

  cerrarModalProducto(): void {
    this.mostrarModalProducto = false;
    this.nuevoProducto = { nombre: '', precio: 0, stock: 0, costo: 0 };
  }

  crearProducto(): void {
    if (!this.nuevoProducto.nombre.trim() || !this.nuevoProducto.precio) {
      this.toast.show('El nombre y precio son obligatorios', 'error');
      return;
    }

    this.isSaving = true;
    const dto: ProductoDTO = {
      nomproducto: this.nuevoProducto.nombre,
      categoria: this.categoriaSeleccionada!,
      venta: this.nuevoProducto.precio,
      existencia: this.nuevoProducto.stock || 0,
      costo: this.nuevoProducto.costo || 0,
      foto: '',
      enpantalla: 1
    };

    this.puntoVentaService.createProducto(dto).subscribe({
      next: () => {
        this.toast.show('Producto creado exitosamente', 'success');
        this.cerrarModalProducto();
        this.productoCreado.emit();
        this.isSaving = false;
      },
      error: () => {
        this.toast.show('Error al crear el producto', 'error');
        this.isSaving = false;
      }
    });
  }

  abrirModalEditarProducto(producto: Producto, event: Event): void {
    event.stopPropagation();
    this.productoEditando = producto;
    this.productoEditado = {
      nombre: producto.nombre,
      precio: producto.precio,
      stock: producto.stock,
      costo: 0
    };
    this.mostrarModalEditarProducto = true;
  }

  cerrarModalEditarProducto(): void {
    this.mostrarModalEditarProducto = false;
    this.productoEditando = null;
    this.productoEditado = { nombre: '', precio: 0, stock: 0, costo: 0 };
  }

  actualizarProducto(): void {
    if (!this.productoEditando || !this.productoEditado.nombre || !this.productoEditado.precio) {
      this.toast.show('El nombre y precio son obligatorios', 'error');
      return;
    }

    this.isSaving = true;
    const dto: Partial<ProductoDTO> = {
      nomproducto: this.productoEditado.nombre,
      venta: this.productoEditado.precio,
      existencia: this.productoEditado.stock || 0,
      costo: this.productoEditado.costo || 0
    };

    this.puntoVentaService.updateProducto(this.productoEditando.id, dto).subscribe({
      next: () => {
        this.toast.show('Producto actualizado exitosamente', 'success');
        this.cerrarModalEditarProducto();
        this.productoActualizado.emit();
        this.isSaving = false;
      },
      error: () => {
        this.toast.show('Error al actualizar el producto', 'error');
        this.isSaving = false;
      }
    });
  }

  eliminarProducto(productoId: number, event: Event): void {
    event.stopPropagation();
    this.productoAEliminar = productoId;
    this.mostrarConfirmEliminar = true;
  }

  confirmarEliminarProducto(): void {
    if (this.productoAEliminar !== null) {
      this.puntoVentaService.deleteProducto(this.productoAEliminar).subscribe({
        next: () => {
          this.toast.show('Producto eliminado exitosamente', 'success');
          this.productoActualizado.emit();
          this.cancelarEliminarProducto();
        },
        error: () => {
          this.toast.show('Error al eliminar el producto', 'error');
          this.cancelarEliminarProducto();
        }
      });
    }
  }

  cancelarEliminarProducto(): void {
    this.mostrarConfirmEliminar = false;
    this.productoAEliminar = null;
  }
}
