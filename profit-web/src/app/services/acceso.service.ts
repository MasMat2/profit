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

/** Respuesta de /api/health del servicio Java. */
export interface EstadoServicio {
  status: 'OK' | 'SIN_TEMPLATES';
  templates: number;
  descartados: number;
  loadedAt: string | null;
  /** Último delta del sondeo de cambios aplicado sobre la carga completa. */
  actualizadoAt?: string | null;
  /** Null: el sondeo está apagado y la caché sólo se mueve con la recarga completa. */
  marca?: string | null;
  pollSeconds?: number;
  matchFormat: string;
  turnstile: { enabled: boolean; port: string };
}

/** Respuesta de POST /api/templates/refresh del servicio Java. */
export interface ResumenHuellas {
  templates: number;
  descartados: number;
  loadedAt: string | null;
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

  /**
   * Opens the turnstile through the local Java service.
   * Only call this once the API has approved the access: the service just
   * forwards the command to the serial port, it does not re-check anything.
   */
  abrirTorniquete(): Observable<unknown> {
    return this.http.post(`${environment.javaServiceUrl}/api/turnstile/open`, {});
  }

  /**
   * Estado del servicio local de huella. Sirve para avisar que algo está roto ANTES de que
   * alguien apoye el dedo, en vez de que el fallo se confunda con "tu huella no está enrolada".
   */
  estadoServicio(): Observable<EstadoServicio> {
    return this.http.get<EstadoServicio>(`${environment.javaServiceUrl}/api/health`);
  }

  /**
   * Recarga completa de la caché de huellas del servicio local. Es lo que hay detrás del botón
   * "Actualizar huellas" del kiosco: para el socio recién enrolado en recepción que llega al
   * torniquete antes de que el sondeo de cambios lo alcance, o con el sondeo apagado.
   */
  refrescarHuellas(): Observable<ResumenHuellas> {
    return this.http.post<ResumenHuellas>(
      `${environment.javaServiceUrl}/api/templates/refresh`,
      {}
    );
  }
}
