import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Clase {
  id: number;
  nomclase: string;
  limitectes: number;
  cntlimite: number;
  activa: number;
  cobinsc: number;
  prinsc: number;
  precios: Precio[];
  fecmod?: Date;
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

}
