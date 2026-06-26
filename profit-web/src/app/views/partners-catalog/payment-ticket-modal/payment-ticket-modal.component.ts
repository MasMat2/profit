import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdministracionService, Parametros } from '../../../services/administracion.service';

export interface PaymentTicket {
  socioNombre: string;
  socioId: number;
  fecha: Date;
  montoInscripcion: number;
  totalClases: number;
  clases: Array<{
    nombre: string;
    periodicidad: string;
    total: number;
  }>;
  subtotal: number;
  descuento: number;
  total: number;
  metodoPago: string;
}

export interface TicketLineItem {
  cantidad: number;
  descripcion: string;
  total: number;
}

@Component({
  selector: 'app-payment-ticket-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-ticket-modal.component.html',
  styleUrls: ['./payment-ticket-modal.component.scss']
})
export class PaymentTicketModalComponent implements OnInit {
  @Input() ticket!: PaymentTicket;
  @Output() close = new EventEmitter<void>();

  parametros: Parametros | null = null;
  logoPath = 'assets/logo.png';

  constructor(private administracionService: AdministracionService) {}

  ngOnInit(): void {
    this.cargarParametros();
  }

  cargarParametros(): void {
    this.administracionService.getParametros().subscribe({
      next: (params) => {
        this.parametros = params;
      },
      error: (err) => {
        console.error('Error al cargar parámetros:', err);
      }
    });
  }

  get ticketItems(): TicketLineItem[] {
    const items: TicketLineItem[] = [];

    if (this.ticket.montoInscripcion > 0) {
      items.push({
        cantidad: 1,
        descripcion: 'Inscripción',
        total: this.ticket.montoInscripcion
      });
    }

    this.ticket.clases.forEach(clase => {
      items.push({
        cantidad: 1,
        descripcion: `${clase.nombre} - ${clase.periodicidad}`,
        total: clase.total
      });
    });

    return items;
  }

  onClose(): void {
    this.close.emit();
  }

  onPrint(): void {
    window.print();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    return d.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
}
