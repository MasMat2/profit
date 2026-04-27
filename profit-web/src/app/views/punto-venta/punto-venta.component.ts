import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './punto-venta.component.html',
  styleUrls: ['./punto-venta.component.scss']
})
export class PuntoVentaComponent implements OnInit {
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
  nuevoProducto = { nombre: '', precio: 0, stock: 0, costo: 0, emoji: '' };
  
  formasPago = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'MIXTO'];

  private apiUrl = '/punto-venta';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.cargarCategorias();
    this.cargarProductos();
    this.cargarClientes();
  }

  cargarClientes() {
    this.http.get<any[]>(`${this.apiUrl}/clientes`).subscribe({
      next: (data) => {
        console.log('Clientes recibidos:', data);
        this.clientes = data.map(c => ({
          id: c.id,
          nombre: c.nombreCompleto || c.nomsocio || '',
          nombreCompleto: c.nombreCompleto || c.nomsocio || ''
        }));
        console.log('Clientes mapeados:', this.clientes);
      },
      error: (err) => console.error('Error al cargar clientes:', err)
    });
  }

  filtrarClientes(): Cliente[] {
    if (!this.buscarCliente || this.buscarCliente.trim() === '') {
      return this.clientes.slice(0, 10);
    }
    const busqueda = this.buscarCliente.toLowerCase().trim();
    return this.clientes.filter(c => 
      c.nombreCompleto?.toLowerCase().includes(busqueda)
    ).slice(0, 10);
  }

  seleccionarCliente(cliente: Cliente) {
    this.clienteSeleccionado = cliente;
    this.buscarCliente = cliente.nombreCompleto || '';
    this.mostrarListaClientes = false;
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
      alert('El monto abonado es insuficiente');
      return;
    }

    const venta = {
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
        let mensaje = `Venta registrada exitosamente\nFolio: ${response.ventaId}`;
        if (response.clienteNombre) {
          mensaje += `\nCliente: ${response.clienteNombre}`;
        }
        mensaje += `\nTotal: $${this.totalConDescuento.toFixed(2)}`;
        alert(mensaje);
        this.limpiarVenta();
        this.cerrarModalCobro();
      },
      error: (err) => {
        console.error('Error al registrar venta:', err);
        alert('Error al procesar la venta');
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
      alert('Selecciona una categoría primero');
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
    this.nuevoProducto = { nombre: '', precio: 0, stock: 0, costo: 0, emoji: '' };
  }

  crearCategoria() {
    if (!this.nuevaCategoria.nombre) {
      alert('El nombre de la categoría es obligatorio');
      return;
    }

    const dto = {
      nomcategoria: this.nuevaCategoria.nombre,
      color: this.nuevaCategoria.color || '#F97316',
      enpantalla: 1
    };

    this.http.post(`${this.apiUrl}/categorias`, dto).subscribe({
      next: (response: any) => {
        alert('Categoría creada exitosamente');
        this.cerrarModalCategoria();
        this.cargarCategorias();
      },
      error: (err) => {
        console.error('Error al crear categoría:', err);
        alert('Error al crear la categoría');
      }
    });
  }

  crearProducto() {
    if (!this.nuevoProducto.nombre || !this.nuevoProducto.precio) {
      alert('El nombre y precio son obligatorios');
      return;
    }

    const dto = {
      nomproducto: this.nuevoProducto.nombre,
      categoria: this.categoriaSeleccionada!,
      venta: this.nuevoProducto.precio,
      existencia: this.nuevoProducto.stock || 0,
      costo: this.nuevoProducto.costo || 0,
      foto: this.nuevoProducto.emoji || '📦',
      enpantalla: 1
    };

    this.http.post(`${this.apiUrl}/productos`, dto).subscribe({
      next: (response: any) => {
        alert('Producto creado exitosamente');
        this.cerrarModalProducto();
        this.cargarProductos();
      },
      error: (err) => {
        console.error('Error al crear producto:', err);
        alert('Error al crear el producto');
      }
    });
  }
}
