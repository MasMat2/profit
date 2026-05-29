import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

export interface ProductoTicket {
  nombre: string;
  cantidad: number;
  precio: number;
  subtotal: number;
}

export interface TicketData {
  folio: number;
  fecha: Date;
  cliente: string;
  productos: ProductoTicket[];
  subtotal: number;
  descuento: number;
  iva: number;
  total: number;
  formaPago: string;
  pagado: number;
  cambio: number;
}

@Component({
  selector: 'app-ticket-print',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-print.component.html',
  styleUrls: ['./ticket-print.component.scss']
})
export class TicketPrintComponent implements OnInit {
  @Input() show: boolean = false;
  @Input() ticketData: TicketData | null = null;
  @Output() onClose = new EventEmitter<void>();

  configuracion: any = {
    nombreNegocio: 'Gimnasio Profit',
    direccion: '',
    telefono: '',
    rfc: ''
  };
  logoUrl: string = 'assets/logo.png';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.cargarConfiguracion();
  }

  cargarConfiguracion() {
    this.http.get<any>('/administracion/parametros').subscribe({
      next: (config) => {
        if (config) {
          this.configuracion = {
            nombreNegocio: config.empresa || 'Gimnasio Profit',
            direccion: [config.dir1, config.dir2, config.dir3].filter(d => d).join(', ') || '',
            telefono: config.tels || '',
            rfc: config.rfc || ''
          };
        }
      },
      error: (err) => {
        console.warn('No se pudo cargar la configuración, usando valores por defecto');
      }
    });
  }

  cerrar() {
    this.onClose.emit();
  }

  imprimir() {
    window.print();
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
}
