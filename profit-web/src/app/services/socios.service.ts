import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class SociosService {
  private apiUrl = '/socios';

  constructor(private http: HttpClient) {}

  getAllSocios(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

}
