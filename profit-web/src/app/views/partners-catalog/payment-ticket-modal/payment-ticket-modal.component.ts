import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

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

@Component({
  selector: 'app-payment-ticket-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-ticket-modal.component.html',
  styleUrls: ['./payment-ticket-modal.component.scss']
})
export class PaymentTicketModalComponent {
  @Input() ticket!: PaymentTicket;
  @Output() close = new EventEmitter<void>();

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
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }
}
