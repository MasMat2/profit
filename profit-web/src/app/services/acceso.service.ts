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
  tipoMembresia?: string;
  fechaVencimiento?: string;
  vigenciaVisitas?: string;
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
   * Retrieves full socio data (plus active membership) from NestJS
   * for the matched socio id.
   */
  getSocioAcceso(socioId: number): Observable<SocioAcceso> {
    return this.http.get<SocioAcceso>(`${this.apiUrl}/socio/${socioId}`);
  }
}
