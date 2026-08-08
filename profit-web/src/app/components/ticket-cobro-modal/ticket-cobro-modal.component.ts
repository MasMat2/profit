import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdministracionService } from '@services/administracion.service';

export interface TicketCobroItem {
  quantity: number;
  description: string;
  price: number;
}

export interface TicketCobroPago {
  formaPago: string;
  importe: number;
}

export interface TicketCobroData {
  date: Date;
  clientName: string;
  memberNumber?: number;
  items: TicketCobroItem[]; // conceptos cobrados (mensualidad: 1 línea a importe base)
  pagos: TicketCobroPago[]; // desglose de formas de pago (sección aparte)
  descuento?: number; // se muestra si > 0
  total: number;
  paymentReference?: string;
  // Opcionales: sólo los llena el Registro de Tickets al reimprimir un cobro pasado.
  folio?: number;
  cajero?: string | null;
  motivoDescuento?: string | null;
  cancelado?: boolean;
  reimpresion?: boolean;
}

@Component({
  selector: 'app-ticket-cobro-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-cobro-modal.component.html',
  styleUrls: ['./ticket-cobro-modal.component.scss'],
})
export class TicketCobroModalComponent implements OnInit {
  @Input() data!: TicketCobroData;
  @Output() closed = new EventEmitter<void>();

  // Valores por defecto; se sobrescriben con la configuración de Administración al cargar.
  // rfc y logoUrl no tienen equivalente en Administración, se quedan fijos.
  negocio = {
    nombre: 'PROFIT',
    direccion: 'Avenida Siempreviva 742, Springfield',
    telefono: '(555) 123-4567',
    rfc: 'PSG123456XYZ',
    logoUrl: '/assets/logo.png',
  };

  constructor(private administracionService: AdministracionService) {}

  ngOnInit(): void {
    this.administracionService.getParametros().subscribe({
      next: (data) => {
        const partesDireccion = [data.dir1, data.dir2, data.dir3].filter(
          (parte) => !!parte && parte.trim().length > 0
        ).map((p) => p!.trim());
        
        if (partesDireccion.length) this.negocio.direccion = partesDireccion.join(', ');
        if (data.empresa) this.negocio.nombre = data.empresa;
        if (data.tels) this.negocio.telefono = data.tels;
      },
      error: () => {
        // Se conservan los valores por defecto si falla la carga.
      },
    });
  }

  printReceipt(): void {
    window.print();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.onClose();
  }

  onClose(): void {
    this.closed.emit();
  }
}
