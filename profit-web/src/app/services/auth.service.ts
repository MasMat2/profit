import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private readonly http: HttpClient) {}

  async login(identifier: string, password: string) {
    const res = await firstValueFrom(
      this.http.post<any>('/auth/login', {
        identifier,
        password,
      }),
    );

    if (res?.token) {
      localStorage.setItem('token', res.token);
    }

    if (res?.user) {
      localStorage.setItem('user', JSON.stringify(res.user));
    }

    return res;
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('isLoggedIn');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }
}
