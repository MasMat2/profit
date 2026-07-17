import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EstadoCaja {
  abierta: boolean;
  apertura: { id: number; fecnvo: Date | string; usunvo: number } | null;
}

export interface Corte {
  corte: number;
  fecha: Date | string;
  usuario: number;
  totingresos: number;
  gastos: number;
  obs: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class CajaService {
  private apiUrl = '/caja';

  constructor(private http: HttpClient) {}

  getEstado(): Observable<EstadoCaja> {
    return this.http.get<EstadoCaja>(`${this.apiUrl}/estado`);
  }

  abrirCaja(): Observable<EstadoCaja> {
    return this.http.post<EstadoCaja>(`${this.apiUrl}/abrir`, {});
  }

  cerrarCaja(obs?: string): Observable<Corte> {
    return this.http.post<Corte>(`${this.apiUrl}/cerrar`, { obs });
  }

  getCortes(): Observable<Corte[]> {
    return this.http.get<Corte[]>(`${this.apiUrl}/cortes`);
  }
}
