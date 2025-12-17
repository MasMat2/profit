import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClientPlan } from './client.service'

@Injectable({
  providedIn: 'root'
})
export class MembershipService {
  private dataUrl = '/api/membership/';

  constructor(public http: HttpClient) { }
  
  public consultarPorCliente(client_id: number): Observable<ClientPlan[]> {
    return this.http.get<ClientPlan[]>(this.dataUrl + 'consultarPorCliente', {params: {client_id}});
  }
  
}