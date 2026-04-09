import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BusinessParameters {
  id: number;
  empresa: string;
  dir1: string;
  dir2: string;
  dir3: string;
  tels: string;
  sucursal: number;
  logocte: string;
  paqvisvence?: number;
  diaspaqvisvence?: number;
  aplicadescdias?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ParametersService {
  private apiUrl = 'http://localhost:3000/api/parameters';

  constructor(private http: HttpClient) {}

  getParameters(): Observable<BusinessParameters> {
    return this.http.get<BusinessParameters>(this.apiUrl);
  }

  updateParameters(data: BusinessParameters): Observable<BusinessParameters> {
    return this.http.put<BusinessParameters>(this.apiUrl, data);
  }
}
