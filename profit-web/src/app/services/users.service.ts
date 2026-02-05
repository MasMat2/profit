import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  id?: number;
  usuario: string;
  nombre: string;
  puesto: string;
  email: string;
  telefono?: string | null;
  pc?: string | null;
  rol?: string | null;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export interface CreateUserDto {
  usuario: string;
  nombre: string;
  puesto: string;
  email: string;
  telefono?: string | null;
  pc?: string | null;
  rol?: string | null;
}

export interface UpdateUserDto {
  usuario?: string;
  nombre?: string;
  puesto?: string;
  email?: string;
  telefono?: string | null;
  pc?: string | null;
  rol?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly apiUrl = 'http://localhost:3000/users';

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  searchUsers(term: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/search/${term}`);
  }

  createUser(data: CreateUserDto): Observable<User> {
    return this.http.post<User>(this.apiUrl, data);
  }

  updateUser(id: number, data: UpdateUserDto): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, data);
  }

  deleteUser(id: number): Observable<User> {
    return this.http.delete<User>(`${this.apiUrl}/${id}`);
  }
}