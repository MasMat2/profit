import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MenuService } from '@services/menu.service';
import { ToastService } from '@services/shared/toast.service';
import { PuntoVentaService, Categoria, Producto, Cliente, ItemVenta } from '@services/punto-venta.service';
import { CategoriasComponent } from './components/categorias/categorias.component';
import { ProductosListComponent } from './components/productos-list/productos-list.component';
import { CarritoComponent } from './components/carrito/carrito.component';
import { TicketPrintComponent } from '@app/shared/components/ticket-print/ticket-print.component';

@Component({
  selector: 'app-punto-venta',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CategoriasComponent,
    ProductosListComponent,
    CarritoComponent,
    TicketPrintComponent
  ],
  templateUrl: './punto-venta.component.html',
  styleUrls: ['./punto-venta.component.scss']
})
export class PuntoVentaComponent implements OnInit {
  pageIcon: string;
  
  categorias: Categoria[] = [];
  productos: Producto[] = [];
  categoriaSeleccionada: number | null = null;
  
  carrito: ItemVenta[] = [];
  clienteSeleccionado: Cliente | null = null;
  
  total: number = 0;
  descuento: number = 0;
  totalConDescuento: number = 0;
  
  mostrarTicket: boolean = false;
  ticketData: any = null;
  
  isLoadingCategorias = false;
  isLoadingProductos = false;

  constructor(
    private puntoVentaService: PuntoVentaService,
    private menuService: MenuService,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {
    const segment = this.route.snapshot.url[0]?.path;
    this.pageIcon = this.menuService.getIconByRoute(segment);
  }

  ngOnInit(): void {
    this.cargarCategorias();
  }

  cargarCategorias(): void {
    this.isLoadingCategorias = true;
    this.puntoVentaService.getCategorias().subscribe({
      next: (data) => {
        this.categorias = data;
        this.isLoadingCategorias = false;
      },
      error: () => {
        this.toast.show('Error al cargar categorías', 'error');
        this.isLoadingCategorias = false;
      }
    });
  }

  cargarProductos(categoriaId?: number): void {
    this.isLoadingProductos = true;
    this.puntoVentaService.getProductos(categoriaId).subscribe({
      next: (data) => {
        this.productos = data;
        this.isLoadingProductos = false;
      },
      error: () => {
        this.toast.show('Error al cargar productos', 'error');
        this.isLoadingProductos = false;
      }
    });
  }

  onCategoriaSeleccionada(categoriaId: number | null): void {
    this.categoriaSeleccionada = categoriaId;
    this.cargarProductos(categoriaId || undefined);
  }

  onCategoriaCreada(): void {
    this.cargarCategorias();
  }

  onCategoriaEliminada(): void {
    this.cargarCategorias();
    if (this.categoriaSeleccionada) {
      this.categoriaSeleccionada = null;
      this.productos = [];
    }
  }

  onProductoAgregado(producto: Producto): void {
    const itemExistente = this.carrito.find(item => item.producto.id === producto.id);
    
    if (itemExistente) {
      if (itemExistente.cantidad < producto.stock) {
        itemExistente.cantidad++;
        itemExistente.subtotal = itemExistente.cantidad * itemExistente.producto.precio;
      } else {
        this.toast.show('No hay suficiente stock', 'error');
      }
    } else {
      if (producto.stock > 0) {
        this.carrito.push({
          producto,
          cantidad: 1,
          subtotal: producto.precio
        });
      } else {
        this.toast.show('Producto sin stock', 'error');
      }
    }
    
    this.calcularTotal();
  }

  onProductoCreado(): void {
    this.cargarProductos(this.categoriaSeleccionada || undefined);
  }

  onProductoActualizado(): void {
    this.cargarProductos(this.categoriaSeleccionada || undefined);
  }

  onCarritoActualizado(carrito: ItemVenta[]): void {
    this.carrito = carrito;
    this.calcularTotal();
  }

  onDescuentoActualizado(descuento: number): void {
    this.descuento = descuento;
    this.calcularTotal();
  }

  onClienteSeleccionado(cliente: Cliente | null): void {
    this.clienteSeleccionado = cliente;
  }

  onVentaCompletada(ticketData: any): void {
    this.ticketData = ticketData;
    this.mostrarTicket = true;
    this.limpiarVenta();
  }

  calcularTotal(): void {
    this.total = this.carrito.reduce((sum, item) => sum + item.subtotal, 0);
    this.totalConDescuento = Math.max(0, this.total - this.descuento);
  }

  limpiarVenta(): void {
    this.carrito = [];
    this.total = 0;
    this.descuento = 0;
    this.totalConDescuento = 0;
    this.clienteSeleccionado = null;
  }

  cerrarTicket(): void {
    this.mostrarTicket = false;
    this.ticketData = null;
  }
}
