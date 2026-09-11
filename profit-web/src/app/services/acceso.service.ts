import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SocioAcceso {
  id: number;
  socio: number;
  nombre: string;
  tipoMembresia?: string;
  fechaVencimiento?: string;
  clase?: string;
  visitasPeriodo: number;
  becado?: boolean;
}

export interface AccesoDto {
  acceso: boolean;
  motivo?: string;
  /** Se dejó pasar, pero hay algo que recepción debería saber (por ahora, adeudo pendiente). */
  advertencia?: string;
  socio?: SocioAcceso;
  fecha?: Date;
}

@Injectable({
  providedIn: 'root',
})
export class AccesoService {
  private apiUrl = '/asistencia';

  constructor(private http: HttpClient) {}

  /**
   * Checks eligibility, inserts the attendance record, and returns the
   * socio profile in a single call.
   */
  registrarAcceso(socioId: number): Observable<AccesoDto> {
    return this.http.post<AccesoDto>(`${this.apiUrl}/acceso/${socioId}`, {});
  }
}
