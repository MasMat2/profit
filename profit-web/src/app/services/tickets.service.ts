import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type TicketEstatusFiltro = 'pagados' | 'pendientes' | 'cancelados' | 'todos';

// La vista solo manda el rango; `socio` y `estatus` los cubren los filtros de
// columna del grid, pero el endpoint los sigue soportando.
export interface TicketsFiltros {
  desde?: string; // 'yyyy-MM-dd'
  hasta?: string; // 'yyyy-MM-dd'
  socio?: string; // nombre o número de socio
  estatus?: TicketEstatusFiltro;
}

// Fila del grid. `tipo` queda reservado para los tickets de venta (fase 2).
export interface Ticket {
  tipo: 'mensualidad';
  id: number;
  idmens: number;
  folio: number;
  fecha: Date | string;
  fechaCargo: Date | string;
  fechaPago: Date | string;
  socio: number;
  nomsocio: string;
  descrip: string;
  importe: number;
  descuento: number;
  total: number;
  saldo: number;
  pagado: number;
  cancelado: number;
  estatus: string;
  formasPago: string;
  cajero: string | null;
}

export interface TicketPago {
  iding: number;
  fp: number;
  nomfp: string;
  importe: number;
  referencia: string;
  fecha: Date | string;
}

export interface TicketDetalle extends Ticket {
  motivo: string | null;
  motivoDescuento: string | null;
  pagos: TicketPago[];
}

@Injectable({
  providedIn: 'root'
})
export class TicketsService {
  private apiUrl = '/tickets';

  constructor(private http: HttpClient) {}

  getTickets(filtros: TicketsFiltros = {}): Observable<Ticket[]> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor) params = params.set(clave, valor);
    }
    return this.http.get<Ticket[]>(this.apiUrl, { params });
  }

  getTicketMensualidad(idmens: number): Observable<TicketDetalle> {
    return this.http.get<TicketDetalle>(`${this.apiUrl}/mensualidad/${idmens}`);
  }
}
