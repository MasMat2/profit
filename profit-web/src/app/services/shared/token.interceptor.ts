import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export const tokenInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const router = inject(Router);
  const token: string | null = localStorage.getItem('token');

  const isAbsolute = req.url.startsWith('http');

  const newReq = isAbsolute
    ? req
    : req.clone({
        url: environment.apiUrl + req.url,
        ...(token && {
          setHeaders: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        })
      });

  return next(newReq).pipe(
    catchError(error => {
      // Sólo un fallo del API propio puede significar que la sesión expiró.
      //
      // Las URL absolutas van al servicio local de huella, y ahí un status 0 sólo quiere decir
      // que el servicio no está corriendo. Sin esta condición, tener el kiosco con el servicio
      // apagado cerraba la sesión y mandaba la pantalla de acceso al login.
      if (!isAbsolute && (error.status === 401 || error.status === 0)) {
        localStorage.removeItem('token');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
