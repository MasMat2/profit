import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FormaPago {
  id: number;
  nomfp: string;
  c_formapago: string;
  c_moneda: string;
}

@Injectable({
  providedIn: 'root',
})
export class FormasPagoService {
  private apiUrl = '/formas-pago';

  constructor(private http: HttpClient) {}

  getFormasPago(): Observable<FormaPago[]> {
    return this.http.get<FormaPago[]>(`${this.apiUrl}`);
  }

  createFormaPago(data: Partial<FormaPago>): Observable<FormaPago[]> {
    return this.http.post<FormaPago[]>(`${this.apiUrl}`, data);
  }

  updateFormaPago(id: number, data: Partial<FormaPago>): Observable<FormaPago[]> {
    return this.http.put<FormaPago[]>(`${this.apiUrl}/${id}`, data);
  }

  deleteFormaPago(id: number): Observable<FormaPago[]> {
    return this.http.delete<FormaPago[]>(`${this.apiUrl}/${id}`);
  }
}
