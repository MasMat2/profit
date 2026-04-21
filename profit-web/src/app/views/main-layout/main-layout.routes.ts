import { Route } from "@angular/router";
import { MainLayoutComponent } from "./main-layout.component";

export const MAIN_LAYOUT_ROUTES: Route[] = [
    {
        path: '',
        component: MainLayoutComponent,
        children: [
            {
                path: 'categoria-planes',
                loadComponent: () => import('../classes/classes.component').then(m => m.ClassesComponent)
            }
        ]
    },
];