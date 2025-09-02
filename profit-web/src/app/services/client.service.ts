import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PaymentDetails {
  method: string | null;
  reference: string;
}

export interface Client {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  address: string;
  planId: number | null;
  paymentDetails: PaymentDetails;
  medicalNotes: string;
}


@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private dataUrl = 'http://localhost:3000/api/cliente/';

  constructor(public http: HttpClient) { }
  
  public agregar(client: Client): Observable<void> {
    return this.http.post<void>(this.dataUrl + 'agregar', client);
  }
   
}