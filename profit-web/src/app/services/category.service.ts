import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Category {
  id?: number;
  name?: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private dataUrl = '/api/category/';

  constructor(public http: HttpClient) { }

  public consultar(): Observable<Category[]> {
    return this.http.get<Category[]>(this.dataUrl);
  }

  public agregar(category: Category): Observable<void> {
    return this.http.post<void>(this.dataUrl + 'agregar', category);
  }

  public editar(category: Category): Observable<void> {
    return this.http.post<void>(this.dataUrl + 'editar', category);
  }

  public eliminar(id: number): Observable<void> {
    return this.http.get<void>(this.dataUrl + 'eliminar/' + id);
  }


  
}