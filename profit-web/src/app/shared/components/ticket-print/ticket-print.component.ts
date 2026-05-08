import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdministracionService, Parametros } from '../../../services/administracion.service';

export interface TicketData {
  folio: number;
  fecha: Date;
  cliente?: string;
  productos: {
    nombre: string;
    cantidad: number;
    precio: number;
    subtotal: number;
  }[];
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
  template: `
    <div class="ticket-overlay" *ngIf="show" (click)="cerrar()">
      <div class="ticket-container" (click)="$event.stopPropagation()">
        <div class="ticket-content" id="ticket-print-area">
          <!-- Logo y Header -->
          <div class="ticket-header">
            <img [src]="logoPath" alt="Logo" class="logo" />
            
            <p class="negocio-info">{{ parametros?.empresa || 'Cargando...' }}</p>
            <p class="negocio-info" *ngIf="parametros?.dir1">{{ parametros?.dir1 }}</p>
            <p class="negocio-info" *ngIf="parametros?.dir2">{{ parametros?.dir2 }}</p>
            <p class="negocio-info" *ngIf="parametros?.dir3">{{ parametros?.dir3 }}</p>
            <p class="negocio-info" *ngIf="parametros?.tels">Tel: {{ parametros?.tels }}</p>
            <p class="negocio-info" *ngIf="parametros?.rfc">RFC: {{ parametros?.rfc }}</p>
          </div>

          <h2 class="titulo-recibo">Recibo de Pago</h2>

          <!-- Información del Ticket -->
          <div class="ticket-info">
            <p><strong>Fecha:</strong> {{ formatearFecha(ticketData?.fecha) }}</p>
            <p *ngIf="ticketData?.cliente"><strong>Cliente:</strong> {{ ticketData?.cliente }}</p>
          </div>

          <!-- Tabla de Productos -->
          <table class="tabla-productos">
            <thead>
              <tr>
                <th class="text-center">Cant.</th>
                <th class="text-left">Descripción</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let producto of ticketData?.productos">
                <td class="text-center">{{ producto.cantidad }}</td>
                <td class="text-left">{{ producto.nombre }}</td>
                <td class="text-right">{{ formatearMoneda(producto.subtotal) }}</td>
              </tr>
            </tbody>
          </table>

          <div class="divider"></div>

          <!-- Total -->
          <div class="total-section">
            <div class="total-row">
              <span>Total:</span>
              <span class="total-amount">{{ formatearMoneda(ticketData!.total) }}</span>
            </div>
          </div>

          <!-- Método de Pago -->
          <p class="metodo-pago"><strong>Método de Pago:</strong> {{ ticketData?.formaPago || 'No especificado' }}</p>

          <!-- Footer -->
          <p class="footer-mensaje"># My body my pro-fit</p>

          <!-- Botón Imprimir -->
          <button class="btn-imprimir" (click)="imprimir()">
            <i class="fas fa-print"></i>
            Imprimir Ticket
          </button>
        </div>

        <!-- Botón cerrar flotante -->
        <button class="btn-close-float" (click)="cerrar()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .ticket-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(5px);
      animation: fadeIn 0.3s ease-out;
    }

    .ticket-container {
      background: white;
      border-radius: 16px;
      width: 90%;
      max-width: 420px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 70px rgba(0, 0, 0, 0.4);
      animation: slideUp 0.4s ease-out;
      position: relative;
    }

    .btn-close-float {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: rgba(0, 0, 0, 0.1);
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      color: #666;
      z-index: 100;

      &:hover {
        background: rgba(0, 0, 0, 0.2);
        transform: rotate(90deg);
      }

      i {
        font-size: 1.125rem;
      }
    }

    .ticket-content {
      padding: 2.5rem 2rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      color: #2C3E50;
    }

    .ticket-header {
      text-align: center;
      margin-bottom: 1.5rem;

      .logo {
        max-width: 160px;
        height: auto;
        margin: 0 auto 1rem auto;
        display: block;
        object-fit: contain;
      }

      .negocio-info {
        margin: 0.25rem 0;
        font-size: 0.8125rem;
        color: #5A6C7D;
        line-height: 1.4;
      }
    }

    .titulo-recibo {
      text-align: center;
      font-size: 1.25rem;
      font-weight: 700;
      color: #2C3E50;
      margin: 1.5rem 0 1rem 0;
      letter-spacing: 0.5px;
    }

    .ticket-info {
      margin-bottom: 1.5rem;

      p {
        margin: 0.5rem 0;
        font-size: 0.875rem;
        color: #2C3E50;
        line-height: 1.5;

        strong {
          font-weight: 600;
        }
      }
    }

    .tabla-productos {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1rem;

      thead {
        border-bottom: 2px solid #E5E7EB;

        th {
          padding: 0.75rem 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      }

      tbody {
        tr {
          border-bottom: 1px solid #F3F4F6;

          &:last-child {
            border-bottom: none;
          }

          td {
            padding: 1rem 0.5rem;
            font-size: 0.9375rem;
            color: #2C3E50;
          }
        }
      }

      .text-left {
        text-align: left;
      }

      .text-center {
        text-align: center;
      }

      .text-right {
        text-align: right;
        font-weight: 600;
      }
    }

    .divider {
      border: none;
      border-top: 1px dashed #D1D5DB;
      margin: 1rem 0;
    }

    .total-section {
      margin: 1.5rem 0;

      .total-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 1.25rem;
        font-weight: 700;
        color: #2C3E50;

        .total-amount {
          font-size: 1.5rem;
          color: #FF6B35;
        }
      }
    }

    .metodo-pago {
      margin: 1rem 0;
      font-size: 0.875rem;
      color: #2C3E50;

      strong {
        font-weight: 600;
      }
    }

    .footer-mensaje {
      text-align: center;
      font-size: 0.9375rem;
      color: #9CA3AF;
      font-style: italic;
      margin: 1.5rem 0;
    }

    .btn-imprimir {
      width: 100%;
      background: linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 1rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
      }

      &:active {
        transform: translateY(0);
      }

      i {
        font-size: 1.125rem;
      }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes slideUp {
      from {
        transform: translateY(50px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @media print {
      body * {
        visibility: hidden;
      }

      .ticket-overlay,
      .ticket-overlay * {
        visibility: visible;
      }

      .ticket-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: white;
        backdrop-filter: none;
        display: block;
      }

      .ticket-container {
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        max-width: none;
        width: 80mm;
        box-shadow: none;
        border-radius: 0;
        margin: 0;
        padding: 0;
      }

      .btn-close-float,
      .btn-imprimir {
        display: none !important;
      }

      .ticket-content {
        padding: 10mm;
        color: #000;
      }

      .divider {
        border-color: #000;
      }

      .logo,
      .total-amount {
        color: #FF6B35;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `]
})
export class TicketPrintComponent implements OnInit {
  @Input() show: boolean = false;
  @Input() ticketData: TicketData | null = null;
  @Output() onClose = new EventEmitter<void>();

  parametros: Parametros | null = null;
  logoPath = 'assets/logo.png';

  constructor(private administracionService: AdministracionService) {}

  ngOnInit() {
    this.cargarParametros();
  }

  cargarParametros() {
    this.administracionService.getParametros().subscribe({
      next: (params) => {
        this.parametros = params;
      },
      error: (err) => {
        console.error('Error al cargar parámetros:', err);
      }
    });
  }

  formatearFecha(fecha?: Date): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  formatearMoneda(cantidad: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(cantidad);
  }

  imprimir() {
    window.print();
  }

  cerrar() {
    this.onClose.emit();
  }
}
