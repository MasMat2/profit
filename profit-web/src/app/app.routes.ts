import { Routes } from '@angular/router';
export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./views/main-layout/main-layout.routes').then(m => m.MAIN_LAYOUT_ROUTES)
  }
];
  