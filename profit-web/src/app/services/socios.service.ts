import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ClaseAsignada {
  id: number;
  nombre: string;
}

export interface Socio {
  id: number;
  socio: number;
  nomsocio: string;
  tel1: string;
  tel2: string;
  correo: string;
  sexo: number;
  fechaNacimiento: Date | string;
  becado: number;
  comentarios: string | null;
  activo: number;
  diapago: Date | string;
  precio: number;
  descuento: number;
  periodicidad: string | null;
  clase: ClaseAsignada | null;
}

export interface CreateSocioDto {
  nomsocio: string;
  tel1?: string;
  tel2?: string;
  correo?: string;
  sexo?: number;
  fechaNacimiento?: Date | string;
  becado?: number;
  comentarios?: string;
}

export interface UpdateSocioDto {
  nomsocio?: string;
  tel1?: string;
  tel2?: string;
  correo?: string;
  sexo?: number;
  fechaNacimiento?: Date | string;
  becado?: number;
  comentarios?: string;
  importepago?: number;
  diapago?: Date | string;
  descuento?: number;
}

export interface Mensualidad {
  id: number;
  idmens: number;
  fecha: Date | string;
  descrip: string;
  importe: number;
  descuento: number;
  total: number;
  pagado: number;
  saldo: number;
  fecpago: Date | string;
  cancelado: number;
}

export type LogTipo = 'precio' | 'clase' | 'pago' | 'alta' | 'baja' | 'datos' | 'general';

export interface LogSocio {
  id: number;
  fecha: Date | string;
  usuario: number;
  usuarioNombre: string | null;
  log: string;
  tipo: LogTipo;
}

export interface PagoLinea {
  fp: number;
  importe: number;
}

export interface PagarMensualidadDto {
  pagos: PagoLinea[];
  descuento?: number;
  motivo?: string;
  autoriza?: number;
}

export interface HuellaSocio {
  huella: string;
  dedo: number;
  fecnvo: Date | string;
}

export interface GuardarHuellaDto {
  huella: string;
  dedo?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SociosService {
  private apiUrl = '/socios';

  constructor(private http: HttpClient) {}

  getAllSocios(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getSocioById(id: number): Observable<Socio> {
    return this.http.get<Socio>(`${this.apiUrl}/${id}`);
  }

  createSocio(dto: CreateSocioDto): Observable<Socio> {
    return this.http.post<Socio>(this.apiUrl, dto);
  }

  updateSocio(id: number, dto: UpdateSocioDto): Observable<Socio> {
    return this.http.put<Socio>(`${this.apiUrl}/${id}`, dto);
  }

  cambiarClase(id: number, dto: { claseId: number; periodo: string }): Observable<Socio> {
    return this.http.post<Socio>(`${this.apiUrl}/${id}/cambiar-clase`, dto);
  }

  getMensualidades(id: number): Observable<Mensualidad[]> {
    return this.http.get<Mensualidad[]>(`${this.apiUrl}/${id}/mensualidades`);
  }

  getLogs(id: number): Observable<LogSocio[]> {
    return this.http.get<LogSocio[]>(`${this.apiUrl}/${id}/logs`);
  }

  pagarMensualidad(id: number, dto: PagarMensualidadDto): Observable<Socio> {
    return this.http.post<Socio>(`${this.apiUrl}/${id}/pagar-mensualidad`, dto);
  }

  getHuella(id: number): Observable<HuellaSocio | null> {
    return this.http.get<HuellaSocio | null>(`${this.apiUrl}/${id}/huella`);
  }

  guardarHuella(id: number, dto: GuardarHuellaDto): Observable<HuellaSocio> {
    return this.http.post<HuellaSocio>(`${this.apiUrl}/${id}/huella`, dto);
  }

  eliminarHuella(id: number): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.apiUrl}/${id}/huella`);
  }

}
