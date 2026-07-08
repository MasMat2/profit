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

}
