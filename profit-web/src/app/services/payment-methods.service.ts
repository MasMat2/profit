import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PaymentMethod {
  id: number;
  fp: number;
  nomfp: string;
  usunvo: number;
  fecnvo: string;
  usumod: number;
  fecmod: string;
  envia: number;
  c_formapago: string;
  c_moneda: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentMethodsService {
  private apiUrl = 'http://localhost:3000/api/payment-methods';

  constructor(private http: HttpClient) {}

  getAllPaymentMethods(): Observable<PaymentMethod[]> {
    return this.http.get<PaymentMethod[]>(this.apiUrl);
  }

  getPaymentMethodById(id: number): Observable<PaymentMethod> {
    return this.http.get<PaymentMethod>(`${this.apiUrl}/${id}`);
  }

  createPaymentMethod(data: Partial<PaymentMethod>): Observable<PaymentMethod> {
    return this.http.post<PaymentMethod>(this.apiUrl, data);
  }

  updatePaymentMethod(id: number, data: Partial<PaymentMethod>): Observable<PaymentMethod> {
    return this.http.put<PaymentMethod>(`${this.apiUrl}/${id}`, data);
  }

  deletePaymentMethod(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
