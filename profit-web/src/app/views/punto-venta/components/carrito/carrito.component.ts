import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PuntoVentaService, ItemVenta, Cliente, VentaDTO } from '@services/punto-venta.service';
import { ToastService } from '@services/shared/toast.service';
import { SharedModalComponent } from '@views/shared/shared-modal/shared-modal.component';
import { FormasPagoService, FormaPago } from '@services/formas-pago.service';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModalComponent],
  templateUrl: './carrito.component.html',
  styleUrls: ['./carrito.component.scss']
})
export class CarritoComponent implements OnInit, OnDestroy {
  @Input() carrito: ItemVenta[] = [];
  @Input() total: number = 0;
  @Input() descuento: number = 0;
  @Input() totalConDescuento: number = 0;
  @Input() clienteSeleccionado: Cliente | null = null;
  
  @Output() carritoActualizado = new EventEmitter<ItemVenta[]>();
  @Output() descuentoActualizado = new EventEmitter<number>();
  @Output() clienteSeleccionadoChange = new EventEmitter<Cliente | null>();
  @Output() ventaCompletada = new EventEmitter<any>();

  buscarCliente: string = '';
  clientesFiltrados: Cliente[] = [];
  mostrarListaClientes = false;
  cargandoClientes = false;

  mostrarModalCobro = false;
  formaPago: string = '';
  abonado: number = 0;
  cambio: number = 0;
  referencia: string = '';
  comentarios: string = '';
  formasPago: FormaPago[] = [];

  montoEfectivo: number = 0;
  montoOtroMetodo: number = 0;
  otroMetodoPago: string = '';

  private buscarClienteSubject = new Subject<string>();
  private readonly MINIMO_CARACTERES_CLIENTE = 2;
  private readonly DEBOUNCE_TIME = 400;

  constructor(
    private puntoVentaService: PuntoVentaService,
    private toast: ToastService,
    private http: HttpClient,
    private formasPagoService: FormasPagoService
  ) {}

  ngOnInit(): void {
    this.cargarFormasPago();
    this.buscarClienteSubject
      .pipe(
        debounceTime(this.DEBOUNCE_TIME),
        distinctUntilChanged()
      )
      .subscribe(searchTerm => {
        this.realizarBusquedaClientes(searchTerm);
      });
  }

  cargarFormasPago(): void {
    this.formasPagoService.getFormasPago().subscribe({
      next: (data) => {
        this.formasPago = data;
        if (data.length > 0) {
          this.formaPago = data[0].nomfp;
        }
      },
      error: () => {
        this.toast.show('Error al cargar formas de pago', 'error');
      }
    });
  }

  ngOnDestroy(): void {
    this.buscarClienteSubject.complete();
  }

  onBuscarClienteInput(): void {
    const busqueda = this.buscarCliente.trim();
    
    if (busqueda.length >= this.MINIMO_CARACTERES_CLIENTE) {
      this.mostrarListaClientes = true;
      this.buscarClienteSubject.next(busqueda);
    } else {
      this.mostrarListaClientes = false;
      this.clientesFiltrados = [];
    }
  }

  realizarBusquedaClientes(busqueda: string): void {
    this.cargandoClientes = true;
    this.puntoVentaService.getClientes(busqueda).subscribe({
      next: (data) => {
        this.clientesFiltrados = data;
        this.cargandoClientes = false;
      },
      error: () => {
        this.toast.show('Error al buscar clientes', 'error');
        this.cargandoClientes = false;
      }
    });
  }

  seleccionarCliente(cliente: Cliente): void {
    this.clienteSeleccionadoChange.emit(cliente);
    this.buscarCliente = cliente.nombreCompleto || `${cliente.nombre} ${cliente.apellido || ''}`.trim();
    this.mostrarListaClientes = false;
  }

  limpiarCliente(): void {
    this.clienteSeleccionadoChange.emit(null);
    this.buscarCliente = '';
    this.clientesFiltrados = [];
    this.mostrarListaClientes = false;
  }

  modificarCantidad(item: ItemVenta, incremento: number): void {
    const nuevaCantidad = item.cantidad + incremento;
    
    if (nuevaCantidad <= 0) {
      this.eliminarDelCarrito(item);
      return;
    }
    
    if (nuevaCantidad > item.producto.stock) {
      this.toast.show('No hay suficiente stock', 'error');
      return;
    }
    
    item.cantidad = nuevaCantidad;
    item.subtotal = item.cantidad * item.producto.precio;
    this.carritoActualizado.emit([...this.carrito]);
  }

  eliminarDelCarrito(item: ItemVenta): void {
    const index = this.carrito.indexOf(item);
    if (index > -1) {
      this.carrito.splice(index, 1);
      this.carritoActualizado.emit([...this.carrito]);
    }
  }

  actualizarDescuento(): void {
    if (this.descuento < 0) this.descuento = 0;
    if (this.descuento > this.total) this.descuento = this.total;
    this.descuentoActualizado.emit(this.descuento);
  }

  abrirModalCobro(): void {
    if (this.carrito.length === 0) {
      this.toast.show('El carrito está vacío', 'error');
      return;
    }
    this.mostrarModalCobro = true;
    this.abonado = this.totalConDescuento;
    this.calcularCambio();
  }

  get esPagoMixto(): boolean {
    return this.formaPago?.toLowerCase().includes('mixto') ?? false;
  }

  get formasPagoSecundarias(): FormaPago[] {
    return this.formasPago.filter(fp => !fp.nomfp.toLowerCase().includes('mixto') && !fp.nomfp.toLowerCase().includes('efectivo'));
  }

  onFormaPagoChange(): void {
    if (this.esPagoMixto) {
      this.montoEfectivo = 0;
      this.montoOtroMetodo = this.totalConDescuento;
      this.otroMetodoPago = this.formasPagoSecundarias.length > 0 ? this.formasPagoSecundarias[0].nomfp : '';
    }
  }

  onMontoEfectivoChange(): void {
    this.montoOtroMetodo = Math.max(0, this.totalConDescuento - this.montoEfectivo);
  }

  onMontoOtroChange(): void {
    this.montoEfectivo = Math.max(0, this.totalConDescuento - this.montoOtroMetodo);
  }

  cerrarModalCobro(): void {
    this.mostrarModalCobro = false;
    this.formaPago = this.formasPago.length > 0 ? this.formasPago[0].nomfp : '';
    this.abonado = 0;
    this.cambio = 0;
    this.referencia = '';
    this.comentarios = '';
    this.montoEfectivo = 0;
    this.montoOtroMetodo = 0;
    this.otroMetodoPago = '';
  }

  calcularCambio(): void {
    this.cambio = this.abonado - this.totalConDescuento;
    if (this.cambio < 0) this.cambio = 0;
  }

  procesarCobro(): void {
    if (this.esPagoMixto) {
      const sumaMixto = this.montoEfectivo + this.montoOtroMetodo;
      if (Math.abs(sumaMixto - this.totalConDescuento) > 0.01) {
        this.toast.show(`Los montos deben sumar $${this.totalConDescuento.toFixed(2)}`, 'error');
        return;
      }
      if (!this.otroMetodoPago) {
        this.toast.show('Selecciona el segundo método de pago', 'error');
        return;
      }
    } else if (this.abonado < this.totalConDescuento) {
      this.toast.show('El monto abonado es insuficiente', 'error');
      return;
    }

    const formaPagoFinal = this.esPagoMixto
      ? `Mixto: $${this.montoEfectivo.toFixed(2)} Efectivo / $${this.montoOtroMetodo.toFixed(2)} ${this.otroMetodoPago}`
      : this.formaPago;

    const venta: VentaDTO = {
      clienteId: this.clienteSeleccionado?.id,
      productos: this.carrito.map(item => ({
        productoId: item.producto.id,
        cantidad: item.cantidad,
        precio: item.producto.precio,
        subtotal: item.subtotal
      })),
      formaPago: formaPagoFinal,
      total: this.total,
      descuento: this.descuento,
      abonado: this.esPagoMixto ? this.totalConDescuento : this.abonado,
      cambio: this.esPagoMixto ? 0 : this.cambio,
      referencia: this.referencia,
      comentarios: this.comentarios
    };

    this.http.post('/punto-venta/ventas', venta).subscribe({
      next: (response: any) => {
        const subtotalSinIva = this.totalConDescuento / 1.16;
        const iva = this.totalConDescuento - subtotalSinIva;

        const ticketData = {
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
          formaPago: formaPagoFinal,
          pagado: this.esPagoMixto ? this.totalConDescuento : this.abonado,
          cambio: this.esPagoMixto ? 0 : this.cambio
        };

        this.ventaCompletada.emit(ticketData);
        this.cerrarModalCobro();
        this.toast.show('Venta registrada exitosamente', 'success');
      },
      error: () => {
        this.toast.show('Error al procesar la venta', 'error');
      }
    });
  }
}
