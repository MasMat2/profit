import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './registro-tickets.component.html',
  styleUrls: ['./registro-tickets.component.scss']
})
export class RegistroTicketsComponent implements OnInit {
  tabActiva: 'mensualidades' | 'ventas' = 'mensualidades';
  
  mensualidades: Mensualidad[] = [];
  tickets: Ticket[] = [];
  
  mensualidadesFiltradas: Mensualidad[] = [];
  ticketsFiltrados: Ticket[] = [];
  
  busquedaMensualidad: string = '';
  busquedaTicket: string = '';
  
  mostrarModalImprimir: boolean = false;
  registroSeleccionado: any = null;
  tipoRegistro: 'mensualidad' | 'ticket' = 'mensualidad';
  
  cargandoMensualidades: boolean = false;
  cargandoTickets: boolean = false;

  private apiUrl = '/registro-tickets';

  constructor(private http: HttpClient) {}

  get fechaActual(): Date {
    return new Date();
  }

  ngOnInit() {
    this.cargarMensualidades();
    this.cargarTickets();
  }

  cambiarTab(tab: 'mensualidades' | 'ventas') {
    this.tabActiva = tab;
  }

  cargarMensualidades() {
    this.cargandoMensualidades = true;
    this.http.get<Mensualidad[]>(`${this.apiUrl}/mensualidades`).subscribe({
      next: (data) => {
        this.mensualidades = data;
        this.mensualidadesFiltradas = data;
        this.cargandoMensualidades = false;
      },
      error: (err) => {
        console.error('Error al cargar mensualidades:', err);
        this.cargandoMensualidades = false;
      }
    });
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
    if (!busqueda) {
      this.mensualidadesFiltradas = this.mensualidades;
      return;
    }
    
    this.mensualidadesFiltradas = this.mensualidades.filter(m => 
      m.nombreSocio?.toLowerCase().includes(busqueda) ||
      m.idmens.toString().includes(busqueda) ||
      m.descrip?.toLowerCase().includes(busqueda)
    );
  }

  filtrarTickets() {
    const busqueda = this.busquedaTicket.toLowerCase().trim();
    if (!busqueda) {
      this.ticketsFiltrados = this.tickets;
      return;
    }
    
    this.ticketsFiltrados = this.tickets.filter(t => 
      t.nombreSocio?.toLowerCase().includes(busqueda) ||
      t.ticket.toString().includes(busqueda)
    );
  }

  abrirModalMensualidad(mensualidad: Mensualidad) {
    this.registroSeleccionado = mensualidad;
    this.tipoRegistro = 'mensualidad';
    this.mostrarModalImprimir = true;
  }

  abrirModalTicket(ticket: Ticket) {
    this.registroSeleccionado = ticket;
    this.tipoRegistro = 'ticket';
    this.mostrarModalImprimir = true;
  }

  cerrarModal() {
    this.mostrarModalImprimir = false;
    this.registroSeleccionado = null;
  }

  imprimirTicket() {
    const contenido = document.getElementById('contenido-impresion');
    if (!contenido) return;

    const ventanaImpresion = window.open('', '_blank', 'width=800,height=600');
    if (!ventanaImpresion) return;

    ventanaImpresion.document.write(`
      <html>
        <head>
          <title>Imprimir ${this.tipoRegistro === 'mensualidad' ? 'Mensualidad' : 'Ticket'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', monospace; 
              padding: 20px; 
              font-size: 12px;
              max-width: 300px;
              margin: 0 auto;
            }
            .ticket-header { 
              text-align: center; 
              border-bottom: 2px dashed #000; 
              padding-bottom: 10px; 
              margin-bottom: 10px;
            }
            .ticket-header h2 { font-size: 16px; margin-bottom: 5px; }
            .ticket-info { margin-bottom: 10px; }
            .ticket-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 3px 0; 
            }
            .ticket-row strong { font-weight: bold; }
            .divider { 
              border-top: 1px dashed #000; 
              margin: 10px 0; 
            }
            .ticket-total { 
              border-top: 2px dashed #000; 
              padding-top: 10px; 
              margin-top: 10px;
              font-size: 14px;
              font-weight: bold;
            }
            .ticket-footer { 
              text-align: center; 
              margin-top: 15px; 
              font-size: 10px;
              border-top: 2px dashed #000;
              padding-top: 10px;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${contenido.innerHTML}
        </body>
      </html>
    `);

    ventanaImpresion.document.close();
    ventanaImpresion.focus();
    
    setTimeout(() => {
      ventanaImpresion.print();
      ventanaImpresion.close();
    }, 250);
  }

  getFolio(): string {
    if (this.tipoRegistro === 'mensualidad') {
      return this.registroSeleccionado?.idmens || '';
    }
    return this.registroSeleccionado?.ticket || '';
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
}
