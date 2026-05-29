import { CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanMatchFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  if (token) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
