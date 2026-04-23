import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ClassModel {
  id: number;
  clase: number;
  nomclase: string;
  controlhr: number;
  limitectes: number;
  cntlimite: number;
  impticketasist: number;
  activa: number;
  cobinsc: number;
  prinsc: number;
  prsem: number;
  prqna: number;
  prmes: number;
  prtrim: number;
  prstre: number;
  pranual: number;
  descsem: number;
  descqna: number;
  descmes: number;
  desctrim: number;
  descstre: number;
  descanual: number;
  usunvo?: number;
  fecnvo?: Date;
  usumod?: number;
  fecmod?: Date;
  envia?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ClassesService {
  private apiUrl = '/classes';

  constructor(private http: HttpClient) {}

  getAllClasses(): Observable<ClassModel[]> {
    return this.http.get<ClassModel[]>(this.apiUrl);
  }

  getActiveClasses(): Observable<ClassModel[]> {
    return this.http.get<ClassModel[]>(`${this.apiUrl}/active`);
  }

  getClassById(id: number): Observable<ClassModel> {
    return this.http.get<ClassModel>(`${this.apiUrl}/${id}`);
  }

  createClass(data: Partial<ClassModel>): Observable<ClassModel> {
    return this.http.post<ClassModel>(this.apiUrl, data);
  }

  updateClass(id: number, data: Partial<ClassModel>): Observable<ClassModel> {
    return this.http.put<ClassModel>(`${this.apiUrl}/${id}`, data);
  }

  deleteClass(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  toggleActive(id: number): Observable<ClassModel> {
    return this.http.put<ClassModel>(`${this.apiUrl}/${id}/toggle-active`, {});
  }
}
