import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PaymentDetails {
  method: string | null;
  reference: string;
}

export interface Client {
  id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  address?: string;
  plan_id?: number | null;
  payment_details: PaymentDetails;
  medical_notes?: string;
}


@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private dataUrl = 'http://localhost:3000/api/cliente/';

  constructor(public http: HttpClient) { }
  ///Validar acceso a clientes usando el correo y dob///

  public validarAcceso(email: string, dob: string): Observable<boolean> {
    return this.http.get<boolean>(this.dataUrl + 'validar-acceso', { params: { email, dob } });
  }




  public agregar(client: Client): Observable<void> {
    console.log(client);
    return this.http.post<void>(this.dataUrl + 'agregar', client);
  }
   
}