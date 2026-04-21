import { Route } from "@angular/router";
import { MainLayoutComponent } from "./main-layout.component";

export const MAIN_LAYOUT_ROUTES: Route[] = [
    {
        path: '',
        component: MainLayoutComponent,
        children: [
            {
                path: 'catalogo-socios',
                loadComponent: () => import('../partners-catalog/partners-catalog.component').then(m => m.PartnersCatalogComponent)
            }
        ]
    },
];