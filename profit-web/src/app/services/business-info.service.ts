import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BusinessInfo {
  id?: number;
  name: string;
  address?: string | null;
  neighborhood?: string | null;
  city_state?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  branch_number?: number | null;
  created_at?: Date | null;
  updated_at?: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class BusinessInfoService {
  private readonly apiUrl = 'http://localhost:3000/business-info';

  constructor(private http: HttpClient) {}

  getBusinessInfo(): Observable<BusinessInfo | null> {
    return this.http.get<BusinessInfo>(this.apiUrl);
  }

  updateBusinessInfo(data: Partial<BusinessInfo>): Observable<BusinessInfo> {
    return this.http.put<BusinessInfo>(this.apiUrl, data);
  }
}
