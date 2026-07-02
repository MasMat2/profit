import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface IdentifyResponse {
  socio: number | null;
}

export interface SocioAcceso {
  id: number;
  socio: number;
  nombre: string;
  activo: number;
  becado: number;
  tipoMembresia?: string;
  fechaVencimiento?: string;
  clase?: string;
  visitasPeriodo?: number;
}

export interface AccesoDto {
  acceso: boolean;
  motivo?: string;
  socio?: SocioAcceso;
}

@Injectable({
  providedIn: 'root',
})
export class AccesoService {
  private apiUrl = '/asistencia';

  constructor(private http: HttpClient) {}

  /**
   * Sends the captured fingerprint template (base64url Data from the
   * SDK Intermediate sample) to the Java identification service.
   * Absolute URL bypasses the NestJS token interceptor.
   */
  matchFingerprint(fingerprint: string): Observable<IdentifyResponse> {
    return this.http.post<IdentifyResponse>(
      `${environment.javaServiceUrl}/api/identify`,
      { fingerprint }
    );
  }

  /**
   * Checks eligibility, inserts the attendance record, and returns the
   * socio profile in a single call.
   */
  registrarAcceso(socioId: number): Observable<AccesoDto> {
    return this.http.post<AccesoDto>(`${this.apiUrl}/acceso/${socioId}`, {});
  }
}
