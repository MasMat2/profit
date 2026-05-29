import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./views/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canMatch: [authGuard],
    loadChildren: () => import('./views/main-layout/main-layout.routes').then(m => m.MAIN_LAYOUT_ROUTES)
  }
];