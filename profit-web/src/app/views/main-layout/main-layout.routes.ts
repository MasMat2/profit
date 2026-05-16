import { Route } from "@angular/router";
import { MainLayoutComponent } from "./main-layout.component";

export const MAIN_LAYOUT_ROUTES: Route[] = [
    {
        path: '',
        component: MainLayoutComponent,
        children: [
            {
                path: 'administracion',
                loadComponent: () =>
                    import('../administracion/administracion.component').then(
                        (m) => m.AdministracionComponent
                    ),
            },
            {
                path: 'clases',
                loadComponent: () =>
                    import('../clases/clases.component').then(
                        (m) => m.ClasesComponent
                    ),
            },
        ]
    },
];