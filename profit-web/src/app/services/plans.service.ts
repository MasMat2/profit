import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


export interface Plan {
  id?: number;
  category_id?: number;
  name: string;
  description: string;
  price: number;
  duration: number; // en días
  inscription_price: number;
}

@Injectable({
  providedIn: 'root'
})
export class PlansService {
  private dataUrl = 'http://localhost:3000/api/plan/';

  constructor(public http: HttpClient) { }

  public consultar(): Observable<Plan[]> {
    return this.http.get<Plan[]>(this.dataUrl);
  }
  
  public agregar(plan: Plan): Observable<void> {
    return this.http.post<void>(this.dataUrl + 'agregar', plan);
  }
   
  public editar(plan: Plan): Observable<void> {
    return this.http.post<void>(this.dataUrl + 'editar', plan);
  }

  public eliminar(id: number): Observable<void> {
    return this.http.get<void>(this.dataUrl + 'eliminar/' + id);
  }
}