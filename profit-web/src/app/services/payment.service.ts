import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Payment {
  id?: number;
  planes_clientes_id?: number;
  pago_fecha?: Date;
  concepto?: string;
  periodo_inicio?: Date;
  periodo_fin?: Date;
  cantidad?: number;
  pago_metodo?: string;
}

export interface MetodoPago {
  id?: number;
  metodo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private dataUrl = '/api/payment/';

  constructor(public http: HttpClient) { }

  public consultarPorCliente(client_id: number): Observable<Payment[]> {
    return this.http.get<Payment[]>(this.dataUrl + 'consultarPorCliente', {params: {client_id}});
  }

  public consultarMetodosPago(): Observable<MetodoPago[]> {
    return this.http.get<MetodoPago[]>(this.dataUrl + 'consultarMetodosPago');
  }

}