import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Clase {
  id: number;
  clase: number;
  nomclase: string;
  controlhr: number;
  limitectes: number;
  cntlimite: number;
  impticketasist: number;
  activa: number;
  cobinsc: number;
  prinsc: number;
  precios: Precio[];
  usunvo?: number;
  fecnvo?: Date;
  usumod?: number;
  fecmod?: Date;
  envia?: number;
}

export interface Precio {
  periodo: string;
  precioNormal: number;
  descuento: number;
}


@Injectable({
  providedIn: 'root'
})
export class ClasesService {
  private apiUrl = '/clases';

  constructor(private http: HttpClient) {}

  getAllClases(): Observable<Clase[]> {
    return this.http.get<Clase[]>(this.apiUrl);
  }

  createClase(dto: { nomclase: string }): Observable<Clase> {
    return this.http.post<Clase>(this.apiUrl, dto);
  }

  updateClase(clase: Partial<Clase>): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(this.apiUrl, clase);
  }

}
