import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../services/shared/toast.service';
import { TicketPrintComponent, TicketData } from '../../shared/components/ticket-print/ticket-print.component';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormasPagoService, FormaPago } from '../../services/formas-pago.service';

interface Mensualidad {
  idmens: number;
  socio: number;
  nombreSocio?: string;
  fecha: Date;
  importe: number;
  descuento: number;
  total: number;
  pagado: number;
  saldo: number;
  descrip: string;
  modopago: number;
  cancelado: number;
  inscrip: number;
}

interface Ticket {
  ticket: number;
  socio: number;
  nombreSocio?: string;
  fecha: Date;
  importe: number;
  descuento: number;
  total: number;
  pagado: number;
  saldo: number;
  iva: number;
  ieps: number;
  cancelado: number;
  credito: number;
}

@Component({
  selector: 'app-registro-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule, TicketPrintComponent],
  templateUrl: './registro-tickets.component.html',
  styleUrls: ['./registro-tickets.component.scss']
})
export class RegistroTicketsComponent implements OnInit, OnDestroy {
  tabActiva: 'mensualidades' | 'ventas' = 'mensualidades';
  
  mensualidades: Mensualidad[] = [];
  tickets: Ticket[] = [];
  
  mensualidadesFiltradas: Mensualidad[] = [];
  ticketsFiltrados: Ticket[] = [];
  
  busquedaMensualidad: string = '';
  busquedaTicket: string = '';
  
  mostrarModalCobro: boolean = false;
  registroSeleccionado: any = null;
  
  mostrarTicket: boolean = false;
  ticketData: TicketData | null = null;
  
  montoCobro: number = 0;
  descuentoCobro: number = 0;
  formaPago: string = '';
  referencia: string = '';
  comentariosCobro: string = '';
  formasPago: FormaPago[] = [];

  montoEfectivoCobro: number = 0;
  montoOtroMetodoCobro: number = 0;
  otroMetodoPagoCobro: string = '';
  
  cargandoMensualidades: boolean = false;
  cargandoTickets: boolean = false;
  busquedaMensualidadRealizada: boolean = false;
  busquedaTicketRealizada: boolean = false;

  private apiUrl = '/registro-tickets';
  private busquedaMensualidadSubject = new Subject<string>();
  private busquedaTicketSubject = new Subject<string>();
  private readonly MINIMO_CARACTERES = 2;
  private readonly DEBOUNCE_TIME = 500;

  constructor(
    private http: HttpClient,
    private toast: ToastService,
    private formasPagoService: FormasPagoService
  ) {}

  get fechaActual(): Date {
    return new Date();
  }

  ngOnInit() {
    this.cargarFormasPago();
    this.busquedaMensualidadSubject
      .pipe(
        debounceTime(this.DEBOUNCE_TIME),
        distinctUntilChanged()
      )
      .subscribe(busqueda => {
        this.realizarBusquedaMensualidades(busqueda);
      });

    this.busquedaTicketSubject
      .pipe(
        debounceTime(this.DEBOUNCE_TIME),
        distinctUntilChanged()
      )
      .subscribe(busqueda => {
        this.realizarBusquedaTickets(busqueda);
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

  ngOnDestroy() {
    this.busquedaMensualidadSubject.complete();
    this.busquedaTicketSubject.complete();
  }

  cambiarTab(tab: 'mensualidades' | 'ventas') {
    this.tabActiva = tab;
  }

  cargarTickets() {
    this.cargandoTickets = true;
    this.http.get<Ticket[]>(`${this.apiUrl}/tickets`).subscribe({
      next: (data) => {
        this.tickets = data;
        this.ticketsFiltrados = data;
        this.cargandoTickets = false;
      },
      error: (err) => {
        console.error('Error al cargar tickets:', err);
        this.cargandoTickets = false;
      }
    });
  }

  filtrarMensualidades() {
    const busqueda = this.busquedaMensualidad.toLowerCase().trim();
    
    if (!busqueda || busqueda.length < this.MINIMO_CARACTERES) {
      this.mensualidadesFiltradas = [];
      this.busquedaMensualidadRealizada = false;
      return;
    }
    
    this.busquedaMensualidadSubject.next(busqueda);
  }

  private realizarBusquedaMensualidades(busqueda: string) {
    this.busquedaMensualidadRealizada = true;
    this.cargandoMensualidades = true;
    
    this.http.get<Mensualidad[]>(`${this.apiUrl}/mensualidades`, {
      params: { busqueda }
    }).subscribe({
      next: (data) => {
        this.mensualidades = data;
        this.mensualidadesFiltradas = data;
        this.cargandoMensualidades = false;
      },
      error: (err) => {
        console.error('Error al cargar mensualidades:', err);
        this.toast.show('Error al buscar mensualidades', 'error');
        this.cargandoMensualidades = false;
        this.mensualidadesFiltradas = [];
      }
    });
  }

  filtrarTickets() {
    const busqueda = this.busquedaTicket.toLowerCase().trim();
    
    if (!busqueda || busqueda.length < this.MINIMO_CARACTERES) {
      this.ticketsFiltrados = [];
      this.busquedaTicketRealizada = false;
      return;
    }
    
    this.busquedaTicketSubject.next(busqueda);
  }

  private realizarBusquedaTickets(busqueda: string) {
    this.busquedaTicketRealizada = true;
    this.cargandoTickets = true;
    
    this.http.get<Ticket[]>(`${this.apiUrl}/tickets`, {
      params: { busqueda }
    }).subscribe({
      next: (data) => {
        this.tickets = data;
        this.ticketsFiltrados = data;
        this.cargandoTickets = false;
      },
      error: (err) => {
        console.error('Error al cargar tickets:', err);
        this.toast.show('Error al buscar tickets', 'error');
        this.cargandoTickets = false;
        this.ticketsFiltrados = [];
      }
    });
  }

  abrirModalMensualidad(mensualidad: Mensualidad) {
    this.ticketData = {
      folio: mensualidad.idmens,
      fecha: new Date(mensualidad.fecha),
      cliente: mensualidad.nombreSocio || 'Cliente General',
      productos: [
        {
          nombre: mensualidad.descrip || 'Mensualidad',
          cantidad: 1,
          precio: mensualidad.total,
          subtotal: mensualidad.total
        }
      ],
      subtotal: mensualidad.importe,
      descuento: mensualidad.descuento,
      iva: 0,
      total: mensualidad.total,
      formaPago: String(mensualidad.modopago || 'Efectivo'),
      pagado: mensualidad.pagado,
      cambio: 0
    };
    this.mostrarTicket = true;
  }

  abrirModalTicket(ticket: Ticket) {
    this.ticketData = {
      folio: ticket.ticket,
      fecha: new Date(ticket.fecha),
      cliente: ticket.nombreSocio || 'Cliente General',
      productos: [
        {
          nombre: 'Venta',
          cantidad: 1,
          precio: ticket.total,
          subtotal: ticket.total
        }
      ],
      subtotal: ticket.importe,
      descuento: ticket.descuento,
      iva: ticket.iva,
      total: ticket.total,
      formaPago: ticket.credito ? 'Crédito' : 'Contado',
      pagado: ticket.pagado,
      cambio: 0
    };
    this.mostrarTicket = true;
  }

  cerrarTicket() {
    this.mostrarTicket = false;
    this.ticketData = null;
  }

  formatearFecha(fecha: Date): string {
    if (!fecha) return '-';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatearMoneda(cantidad: number): string {
    return new Intl.NumberFormat('es-MX', { 
      style: 'currency', 
      currency: 'MXN' 
    }).format(cantidad || 0);
  }

  getEstadoPago(registro: any): string {
    if (registro.pagado === 1) return 'PAGADO';
    if (registro.saldo > 0) return 'PENDIENTE';
    return 'SIN PAGAR';
  }

  getColorEstado(registro: any): string {
    if (registro.pagado === 1) return '#10B981';
    if (registro.saldo > 0) return '#F59E0B';
    return '#EF4444';
  }

  esPendiente(mensualidad: Mensualidad): boolean {
    return mensualidad.saldo > 0 || mensualidad.pagado === 0;
  }

  abrirModalCobro(mensualidad: Mensualidad) {
    this.registroSeleccionado = mensualidad;
    this.montoCobro = mensualidad.saldo > 0 ? mensualidad.saldo : mensualidad.total;
    this.descuentoCobro = 0;
    this.formaPago = this.formasPago.length > 0 ? this.formasPago[0].nomfp : '';
    this.referencia = '';
    this.comentariosCobro = '';
    this.montoEfectivoCobro = 0;
    this.montoOtroMetodoCobro = 0;
    this.otroMetodoPagoCobro = '';
    this.mostrarModalCobro = true;
  }

  get esPagoMixto(): boolean {
    return this.formaPago?.toLowerCase().includes('mixto') ?? false;
  }

  get formasPagoSecundarias(): FormaPago[] {
    return this.formasPago.filter(fp => !fp.nomfp.toLowerCase().includes('mixto') && !fp.nomfp.toLowerCase().includes('efectivo'));
  }

  get totalConDescuentoCobro(): number {
    return this.montoCobro - this.descuentoCobro;
  }

  onFormaPagoChange(): void {
    if (this.esPagoMixto) {
      this.montoEfectivoCobro = 0;
      this.montoOtroMetodoCobro = this.totalConDescuentoCobro;
      this.otroMetodoPagoCobro = this.formasPagoSecundarias.length > 0 ? this.formasPagoSecundarias[0].nomfp : '';
    }
  }

  onMontoEfectivoCobroChange(): void {
    this.montoOtroMetodoCobro = Math.max(0, this.totalConDescuentoCobro - this.montoEfectivoCobro);
  }

  onMontoOtroCobroChange(): void {
    this.montoEfectivoCobro = Math.max(0, this.totalConDescuentoCobro - this.montoOtroMetodoCobro);
  }

  cerrarModalCobro() {
    this.mostrarModalCobro = false;
    this.registroSeleccionado = null;
    this.montoCobro = 0;
    this.descuentoCobro = 0;
    this.montoEfectivoCobro = 0;
    this.montoOtroMetodoCobro = 0;
    this.otroMetodoPagoCobro = '';
  }

  procesarCobro() {
    if (this.montoCobro <= 0) {
      this.toast.show('El monto a cobrar debe ser mayor a 0', 'error');
      return;
    }

    if (this.descuentoCobro < 0) {
      this.toast.show('El descuento no puede ser negativo', 'error');
      return;
    }

    if (this.descuentoCobro > this.montoCobro) {
      this.toast.show('El descuento no puede ser mayor al monto a cobrar', 'error');
      return;
    }

    const saldoActual = this.registroSeleccionado.saldo > 0 
      ? this.registroSeleccionado.saldo 
      : this.registroSeleccionado.total;

    if (this.montoCobro > saldoActual) {
      this.toast.show('El monto a cobrar no puede ser mayor al saldo pendiente', 'error');
      return;
    }

    const totalConDescuento = this.montoCobro - this.descuentoCobro;

    if (this.esPagoMixto) {
      const sumaMixto = this.montoEfectivoCobro + this.montoOtroMetodoCobro;
      if (Math.abs(sumaMixto - totalConDescuento) > 0.01) {
        this.toast.show(`Los montos deben sumar ${this.formatearMoneda(totalConDescuento)}`, 'error');
        return;
      }
      if (!this.otroMetodoPagoCobro) {
        this.toast.show('Selecciona el segundo método de pago', 'error');
        return;
      }
    }

    const formaPagoFinal = this.esPagoMixto
      ? `Mixto: $${this.montoEfectivoCobro.toFixed(2)} Efectivo / $${this.montoOtroMetodoCobro.toFixed(2)} ${this.otroMetodoPagoCobro}`
      : this.formaPago;

    const datosCobro = {
      idmens: this.registroSeleccionado.idmens,
      monto: totalConDescuento,
      formaPago: formaPagoFinal,
      referencia: this.referencia,
      comentarios: this.comentariosCobro
    };

    this.http.post(`${this.apiUrl}/cobrar-mensualidad`, datosCobro).subscribe({
      next: (response: any) => {
        this.toast.show(`Pago exitoso - $${totalConDescuento.toFixed(2)}`, 'success');
        
        // Generar ticket de cobro
        this.ticketData = {
          folio: this.registroSeleccionado.idmens,
          fecha: new Date(),
          cliente: this.registroSeleccionado.nombreSocio || 'Cliente General',
          productos: [
            {
              nombre: this.registroSeleccionado.descrip || 'Mensualidad',
              cantidad: 1,
              precio: this.montoCobro,
              subtotal: this.montoCobro
            }
          ],
          subtotal: this.montoCobro,
          descuento: this.descuentoCobro,
          iva: 0,
          total: totalConDescuento,
          formaPago: formaPagoFinal,
          pagado: totalConDescuento,
          cambio: 0
        };
        
        this.cerrarModalCobro();
        this.mostrarTicket = true;
        
        if (this.busquedaMensualidadRealizada) {
          this.filtrarMensualidades();
        }
      },
      error: (err) => {
        console.error('Error al procesar cobro:', err);
        this.toast.show(
          err.error?.message || 'Error al procesar el cobro. Intenta nuevamente.',
          'error'
        );
      }
    });
  }
}
