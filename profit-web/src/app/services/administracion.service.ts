import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Parametros {
  paqvisvence: number;
  diaspaqvisvence: number;
  aplicadescdias: number;
  empresa: string;
  dir1: string;
  dir2: string;
  dir3: string;
  tels: string;
  sucursal: number;
}

@Injectable({
  providedIn: 'root',
})
export class AdministracionService {
  private apiUrl = '/administracion';

  constructor(private http: HttpClient) {}

  getParametros(): Observable<Parametros> {
    return this.http.get<Parametros>(`${this.apiUrl}/parametros`);
  }

  updateParametros(data: Partial<Parametros>): Observable<Parametros> {
    return this.http.put<Parametros>(`${this.apiUrl}/parametros`, data);
  }
}
