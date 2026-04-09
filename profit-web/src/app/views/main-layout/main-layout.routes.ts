import { Route } from "@angular/router";
import { MainLayoutComponent } from "./main-layout.component";

export const MAIN_LAYOUT_ROUTES: Route[] = [
    {
        path: '',
        component: MainLayoutComponent,
        children: [
            {
                path: 'administracion',
                loadComponent: () => import('../administration/administration.component').then(m => m.AdministrationComponent)
            }
        ]
    },
];