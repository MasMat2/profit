import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface User {
  id: number;
  usuario: number;
  clave: string;
  nombre: string;
  email: string;
  admin: number;
  perfil: number;
  foto: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    const userData = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(
      userData ? JSON.parse(userData) : null
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  login(clave: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/auth/login', { clave, password })
      .pipe(
        tap(response => {
          localStorage.setItem('token', response.token);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          sessionStorage.setItem('isLoggedIn', 'true');
          this.currentUserSubject.next(response.user);
        })
      );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('isLoggedIn');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token') && !!sessionStorage.getItem('isLoggedIn');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
