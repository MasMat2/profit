import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../../shared/services/notification.service';
import { TicketPrintComponent, TicketData } from '../../shared/components/ticket-print/ticket-print.component';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  icono?: string;
}

interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
  categoriaId: number;
  imagen?: string;
}

interface ItemVenta {
  producto: Producto;
  cantidad: number;
  subtotal: number;
}

interface Cliente {
  id: number;
  nombre: string;
  apellido?: string;
  nombreCompleto?: string;
}

@Component({
  selector: 'app-punto-venta',
  standalone: true,
  imports: [CommonModule, FormsModule, TicketPrintComponent],
  templateUrl: './punto-venta.component.html',
  styleUrls: ['./punto-venta.component.scss']
})
export class PuntoVentaComponent implements OnInit, OnDestroy {
  categorias: Categoria[] = [];
  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  categoriaSeleccionada: number | null = null;
  
  clientes: Cliente[] = [];
  clienteSeleccionado: Cliente | null = null;
  buscarCliente: string = '';
  mostrarListaClientes: boolean = false;
  
  carrito: ItemVenta[] = [];
  total: number = 0;
  descuento: number = 0;
  totalConDescuento: number = 0;
  
  mostrarModalCobro: boolean = false;
  formaPago: string = 'EFECTIVO';
  abonado: number = 0;
  cambio: number = 0;
  referencia: string = '';
  comentarios: string = '';
  
  mostrarModalCategoria: boolean = false;
  nuevaCategoria = { nombre: '', color: '' };
  
  mostrarModalProducto: boolean = false;
  nuevoProducto = { nombre: '', precio: 0, stock: 0, costo: 0 };
  
  mostrarModalEditarProducto: boolean = false;
  productoEditando: Producto | null = null;
  productoEditado = { nombre: '', precio: 0, stock: 0, costo: 0 };
  
  mostrarTicket: boolean = false;
  ticketData: TicketData | null = null;
  
  formasPago = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'MIXTO'];
  clientesFiltrados: Cliente[] = [];
  cargandoClientes: boolean = false;

  private apiUrl = '/punto-venta';
  private buscarClienteSubject = new Subject<string>();
  private readonly MINIMO_CARACTERES_CLIENTE = 2;
  private readonly DEBOUNCE_TIME = 400;

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) {}

  ngOnDestroy() {
    this.buscarClienteSubject.complete();
  }

  ngOnInit() {
    this.cargarCategorias();
    this.cargarProductos();
    
    // Configurar búsqueda de clientes con debounce
    this.buscarClienteSubject
      .pipe(
        debounceTime(this.DEBOUNCE_TIME),
        distinctUntilChanged()
      )
      .subscribe(busqueda => {
        this.realizarBusquedaClientes(busqueda);
      });
  }

  onBuscarClienteInput() {
    const busqueda = this.buscarCliente.trim();
    
    if (!busqueda || busqueda.length < this.MINIMO_CARACTERES_CLIENTE) {
      this.clientesFiltrados = [];
      this.mostrarListaClientes = false;
      return;
    }
    
    this.mostrarListaClientes = true;
    this.buscarClienteSubject.next(busqueda);
  }

  private realizarBusquedaClientes(busqueda: string) {
    this.cargandoClientes = true;
    
    this.http.get<any[]>(`${this.apiUrl}/clientes`, {
      params: { busqueda }
    }).subscribe({
      next: (data) => {
        this.clientesFiltrados = data.map(c => ({
          id: c.id,
          nombre: c.nombreCompleto || c.nomsocio || '',
          nombreCompleto: c.nombreCompleto || c.nomsocio || ''
        }));
        this.cargandoClientes = false;
      },
      error: (err) => {
        console.error('Error al buscar clientes:', err);
        this.notificationService.error('Error al buscar clientes');
        this.cargandoClientes = false;
        this.clientesFiltrados = [];
      }
    });
  }


  seleccionarCliente(cliente: Cliente) {
    this.clienteSeleccionado = cliente;
    this.buscarCliente = cliente.nombreCompleto || '';
    this.mostrarListaClientes = false;
    this.clientesFiltrados = [];
  }

  limpiarCliente() {
    this.clienteSeleccionado = null;
    this.buscarCliente = '';
    this.mostrarListaClientes = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.cliente-busqueda')) {
      this.mostrarListaClientes = false;
    }
  }

  cargarCategorias() {
    this.http.get<Categoria[]>(`${this.apiUrl}/categorias`).subscribe({
      next: (data) => this.categorias = data,
      error: (err) => console.error('Error al cargar categorías:', err)
    });
  }

  cargarProductos() {
    this.http.get<Producto[]>(`${this.apiUrl}/productos`).subscribe({
      next: (data) => {
        this.productos = data;
        this.productosFiltrados = data;
      },
      error: (err) => console.error('Error al cargar productos:', err)
    });
  }

  seleccionarCategoria(categoriaId: number | null) {
    this.categoriaSeleccionada = categoriaId;
    if (categoriaId === null) {
      this.productosFiltrados = this.productos;
    } else {
      this.productosFiltrados = this.productos.filter(p => p.categoriaId === categoriaId);
    }
  }

  obtenerNombreCategoria(): string {
    if (this.categoriaSeleccionada === null) {
      return 'Todos los Productos';
    }
    const categoria = this.categorias.find(c => c.id === this.categoriaSeleccionada);
    return categoria?.nombre || 'Productos';
  }

  agregarAlCarrito(producto: Producto) {
    const itemExistente = this.carrito.find(item => item.producto.id === producto.id);
    
    if (itemExistente) {
      if (itemExistente.cantidad < producto.stock) {
        itemExistente.cantidad++;
        itemExistente.subtotal = itemExistente.cantidad * itemExistente.producto.precio;
      } else {
        alert('No hay suficiente stock disponible');
      }
    } else {
      if (producto.stock > 0) {
        this.carrito.push({
          producto: producto,
          cantidad: 1,
          subtotal: producto.precio
        });
      } else {
        alert('Producto sin stock');
      }
    }
    
    this.calcularTotal();
  }

  eliminarDelCarrito(index: number) {
    this.carrito.splice(index, 1);
    this.calcularTotal();
  }

  modificarCantidad(item: ItemVenta, cantidad: number) {
    if (cantidad > 0 && cantidad <= item.producto.stock) {
      item.cantidad = cantidad;
      item.subtotal = item.cantidad * item.producto.precio;
      this.calcularTotal();
    }
  }

  calcularTotal() {
    this.total = this.carrito.reduce((sum, item) => sum + item.subtotal, 0);
    this.totalConDescuento = this.total - this.descuento;
  }

  aplicarDescuento() {
    if (this.descuento < 0) this.descuento = 0;
    if (this.descuento > this.total) this.descuento = this.total;
    this.calcularTotal();
  }

  abrirModalCobro() {
    if (this.carrito.length === 0) {
      alert('El carrito está vacío');
      return;
    }
    this.mostrarModalCobro = true;
    this.abonado = this.totalConDescuento;
    this.calcularCambio();
  }

  cerrarModalCobro() {
    this.mostrarModalCobro = false;
    this.formaPago = 'EFECTIVO';
    this.abonado = 0;
    this.cambio = 0;
    this.referencia = '';
    this.comentarios = '';
  }

  calcularCambio() {
    this.cambio = this.abonado - this.totalConDescuento;
    if (this.cambio < 0) this.cambio = 0;
  }

  procesarCobro() {
    if (this.abonado < this.totalConDescuento) {
      this.notificationService.warning('El monto abonado es insuficiente');
      return;
    }

    const venta = {
      clienteId: this.clienteSeleccionado?.id,
      productos: this.carrito.map(item => ({
        productoId: item.producto.id,
        cantidad: item.cantidad,
        precio: item.producto.precio,
        subtotal: item.subtotal
      })),
      formaPago: this.formaPago,
      total: this.total,
      descuento: this.descuento,
      abonado: this.abonado,
      cambio: this.cambio,
      referencia: this.referencia,
      comentarios: this.comentarios
    };

    this.http.post(`${this.apiUrl}/ventas`, venta).subscribe({
      next: (response: any) => {
        // Calcular IVA (16%)
        const subtotalSinIva = this.totalConDescuento / 1.16;
        const iva = this.totalConDescuento - subtotalSinIva;

        // Preparar datos del ticket
        this.ticketData = {
          folio: response.ventaId,
          fecha: new Date(),
          cliente: response.clienteNombre,
          productos: this.carrito.map(item => ({
            nombre: item.producto.nombre,
            cantidad: item.cantidad,
            precio: item.producto.precio,
            subtotal: item.subtotal
          })),
          subtotal: subtotalSinIva,
          descuento: this.descuento,
          iva: iva,
          total: this.totalConDescuento,
          formaPago: this.formaPago,
          pagado: this.abonado,
          cambio: this.cambio
        };

        // Mostrar ticket
        this.mostrarTicket = true;
        
        // Limpiar venta y cerrar modal de cobro
        this.limpiarVenta();
        this.cerrarModalCobro();
        
        this.notificationService.success('Venta registrada exitosamente');
      },
      error: (err) => {
        console.error('Error al registrar venta:', err);
        this.notificationService.error('Error al procesar la venta');
      }
    });
  }

  limpiarVenta() {
    this.carrito = [];
    this.total = 0;
    this.descuento = 0;
    this.totalConDescuento = 0;
    this.limpiarCliente();
    this.cargarProductos();
  }

  // Métodos para gestionar categorías
  abrirModalProducto() {
    if (this.categoriaSeleccionada === null) {
      this.notificationService.warning('Selecciona una categoría primero');
      return;
    }
    this.mostrarModalProducto = true;
  }

  cerrarModalCategoria() {
    this.mostrarModalCategoria = false;
    this.nuevaCategoria = { nombre: '', color: '' };
  }

  cerrarModalProducto() {
    this.mostrarModalProducto = false;
    this.nuevoProducto = { nombre: '', precio: 0, stock: 0, costo: 0 };
  }

  abrirModalEditarProducto(producto: Producto, event: Event) {
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

  cerrarModalEditarProducto() {
    this.mostrarModalEditarProducto = false;
    this.productoEditando = null;
    this.productoEditado = { nombre: '', precio: 0, stock: 0, costo: 0 };
  }

  actualizarProducto() {
    if (!this.productoEditando || !this.productoEditado.nombre || !this.productoEditado.precio) {
      this.notificationService.warning('El nombre y precio son obligatorios');
      return;
    }

    const dto = {
      nomproducto: this.productoEditado.nombre,
      venta: this.productoEditado.precio,
      existencia: this.productoEditado.stock || 0,
      costo: this.productoEditado.costo || 0,
      foto: '📦'
    };

    this.http.put(`${this.apiUrl}/productos/${this.productoEditando.id}`, dto).subscribe({
      next: (response: any) => {
        this.notificationService.success('Producto actualizado exitosamente');
        this.cerrarModalEditarProducto();
        this.cargarProductos();
      },
      error: (err) => {
        console.error('Error al actualizar producto:', err);
        this.notificationService.error('Error al actualizar el producto');
      }
    });
  }

  crearCategoria() {
    if (!this.nuevaCategoria.nombre) {
      this.notificationService.warning('El nombre de la categoría es obligatorio');
      return;
    }

    const dto = {
      nomcategoria: this.nuevaCategoria.nombre,
      color: this.nuevaCategoria.color || '#F97316',
      enpantalla: 1
    };

    this.http.post(`${this.apiUrl}/categorias`, dto).subscribe({
      next: (response: any) => {
        this.notificationService.success('Categoría creada exitosamente');
        this.cerrarModalCategoria();
        this.cargarCategorias();
      },
      error: (err) => {
        console.error('Error al crear categoría:', err);
        this.notificationService.error('Error al crear la categoría');
      }
    });
  }

  crearProducto() {
    if (!this.nuevoProducto.nombre || !this.nuevoProducto.precio) {
      this.notificationService.warning('El nombre y precio son obligatorios');
      return;
    }

    const dto = {
      nomproducto: this.nuevoProducto.nombre,
      categoria: this.categoriaSeleccionada!,
      venta: this.nuevoProducto.precio,
      existencia: this.nuevoProducto.stock || 0,
      costo: this.nuevoProducto.costo || 0,
      foto: '📦',
      enpantalla: 1
    };

    this.http.post(`${this.apiUrl}/productos`, dto).subscribe({
      next: (response: any) => {
        this.notificationService.success('Producto creado exitosamente');
        this.cerrarModalProducto();
        this.cargarProductos();
      },
      error: (err) => {
        console.error('Error al crear producto:', err);
        this.notificationService.error('Error al crear el producto');
      }
    });
  }

  eliminarCategoria(categoriaId: number, event: Event) {
    event.stopPropagation();
    
    this.notificationService.confirm(
      'Eliminar Categoría',
      '¿Estás seguro de eliminar esta categoría? Esta acción no se puede deshacer.',
      () => {
        this.http.delete(`${this.apiUrl}/categorias/${categoriaId}`).subscribe({
          next: () => {
            this.notificationService.success('Categoría eliminada exitosamente');
            this.cargarCategorias();
            if (this.categoriaSeleccionada === categoriaId) {
              this.seleccionarCategoria(null);
            }
          },
          error: (err) => {
            console.error('Error al eliminar categoría:', err);
            this.notificationService.error('Error al eliminar la categoría');
          }
        });
      }
    );
  }

  eliminarProducto(productoId: number, event: Event) {
    event.stopPropagation();
    
    this.notificationService.confirm(
      'Eliminar Producto',
      '¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.',
      () => {
        this.http.delete(`${this.apiUrl}/productos/${productoId}`).subscribe({
          next: () => {
            this.notificationService.success('Producto eliminado exitosamente');
            this.cargarProductos();
          },
          error: (err) => {
            console.error('Error al eliminar producto:', err);
            this.notificationService.error('Error al eliminar el producto');
          }
        });
      }
    );
  }

  cerrarTicket() {
    this.mostrarTicket = false;
    this.ticketData = null;
  }
}
