import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { AppGridComponent } from '@components/app-grid/app-grid.component';
import {
  TicketCobroData,
  TicketCobroModalComponent,
} from '@components/ticket-cobro-modal/ticket-cobro-modal.component';
import { MenuService } from '@services/shared/menu.service';
import { ToastService } from '@services/shared/toast.service';
import {
  Ticket,
  TicketEstatusFiltro,
  TicketsFiltros,
  TicketsService,
} from '@services/tickets.service';

const ESTATUS_STYLES: Record<string, string> = {
  Pagado: 'background:#D1FAE5;color:#065F46',
  Pendiente: 'background:#FEF3C7;color:#92400E',
  Cancelado: 'background:#FEE2E2;color:#991B1B',
};

const CURRENCY = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

// El <input type="date"> trabaja en hora local; toISOString() adelantaría un día.
function toInputDate(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

@Component({
  selector: 'app-registro-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule, AppGridComponent, TicketCobroModalComponent],
  templateUrl: './registro-tickets.component.html',
  styleUrls: ['./registro-tickets.component.scss'],
})
export class RegistroTicketsComponent implements OnInit {
  pageIcon: string;

  tickets: Ticket[] = [];
  isLoading = false;

  desde = '';
  hasta = '';
  socio = '';
  estatus: TicketEstatusFiltro = 'pagados';

  showTicketModal = false;
  ticketData?: TicketCobroData;

  columnDefs: ColDef[] = [
    {
      field: 'folio',
      headerName: 'Folio',
      width: 100,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'fecha',
      headerName: 'Fecha',
      width: 150,
      filter: 'agDateColumnFilter',
      // El backend manda la fecha como texto ISO; agDateColumnFilter necesita un Date.
      valueGetter: (p: any) => (p.data?.fecha ? new Date(p.data.fecha) : null),
      valueFormatter: (p: any) =>
        p.value ? p.value.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '',
    },
    {
      field: 'socio',
      headerName: 'No. Socio',
      width: 110,
      filter: 'agNumberColumnFilter',
    },
    { field: 'nomsocio', headerName: 'Socio', flex: 2 },
    { field: 'descrip', headerName: 'Concepto', flex: 2 },
    {
      field: 'importe',
      headerName: 'Importe',
      width: 120,
      filter: 'agNumberColumnFilter',
      valueFormatter: (p: any) => CURRENCY.format(p.value ?? 0),
    },
    {
      field: 'descuento',
      headerName: 'Descuento',
      width: 120,
      filter: 'agNumberColumnFilter',
      valueFormatter: (p: any) => CURRENCY.format(p.value ?? 0),
      cellStyle: (p: any) => ({ color: p.value > 0 ? '#EF4444' : '#9CA3AF' }),
      hide: true,
    },
    {
      field: 'total',
      headerName: 'Total',
      width: 120,
      filter: 'agNumberColumnFilter',
      valueFormatter: (p: any) => CURRENCY.format(p.value ?? 0),
      cellStyle: () => ({ color: '#10B981', fontWeight: '600' }),
    },
    // Columnas de consulta ocasional: ocultas al cargar, se activan desde el selector.
    { field: 'formasPago', headerName: 'Forma de Pago', width: 170, hide: true },
    { field: 'cajero', headerName: 'Cajero', width: 130, hide: true },
    {
      field: 'estatus',
      headerName: 'Estatus',
      width: 130,
      cellRenderer: (params: any) => {
        const s = ESTATUS_STYLES[params.value] ?? '';
        return `<span style="${s};padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;text-transform:uppercase">${params.value}</span>`;
      },
    },
  ];

  constructor(
    private ticketsService: TicketsService,
    private menuService: MenuService,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {
    const segment = this.route.snapshot.url[0]?.path;
    this.pageIcon = this.menuService.getIconByRoute(segment);
  }

  ngOnInit(): void {
    this.aplicarRangoPorDefecto();
    this.buscar();
  }

  get totalCobrado(): number {
    return this.tickets.reduce((acc, t) => acc + (t.pagado === 1 ? t.total : 0), 0);
  }

  get totalDescuentos(): number {
    return this.tickets.reduce((acc, t) => acc + t.descuento, 0);
  }

  buscar(): void {
    const filtros: TicketsFiltros = {
      desde: this.desde,
      hasta: this.hasta,
      socio: this.socio.trim(),
      estatus: this.estatus,
    };

    this.isLoading = true;
    this.ticketsService.getTickets(filtros).subscribe({
      next: (data) => {
        this.tickets = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.show('Error al cargar los tickets.', 'error');
      },
    });
  }

  limpiar(): void {
    this.aplicarRangoPorDefecto();
    this.socio = '';
    this.estatus = 'pagados';
    this.buscar();
  }

  verTicket(row: Ticket): void {
    if (!row?.idmens) return;

    this.ticketsService.getTicketMensualidad(row.idmens).subscribe({
      next: (detalle) => {
        this.ticketData = {
          date: new Date(detalle.fecha),
          clientName: detalle.nomsocio,
          memberNumber: detalle.socio,
          items: [
            {
              quantity: 1,
              description: detalle.descrip || 'Suscripción',
              price: detalle.importe,
            },
          ],
          pagos: detalle.pagos.map((p) => ({ formaPago: p.nomfp, importe: p.importe })),
          descuento: detalle.descuento,
          total: detalle.total,
          paymentReference: detalle.pagos.find((p) => p.referencia)?.referencia,
          folio: detalle.folio,
          cajero: detalle.cajero,
          motivoDescuento: detalle.motivoDescuento,
          cancelado: detalle.cancelado === 1,
          reimpresion: true,
        };
        this.showTicketModal = true;
      },
      error: () => {
        this.toast.show('Error al cargar el detalle del ticket.', 'error');
      },
    });
  }

  private aplicarRangoPorDefecto(): void {
    const hoy = new Date();
    this.desde = toInputDate(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    this.hasta = toInputDate(hoy);
  }
}
