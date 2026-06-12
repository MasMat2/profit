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
            {
                path: 'punto-venta',
                loadComponent: () =>
                    import('../punto-venta/punto-venta.component').then(
                        (m) => m.PuntoVentaComponent
                    ),
            },
            {
                path: 'registro-tickets',
                loadComponent: () =>
                    import('../registro-tickets/registro-tickets.component').then(
                        (m) => m.RegistroTicketsComponent
                    ),
            },
            {
                path: 'estadisticas',
                loadComponent: () =>
                    import('../estadisticas/estadisticas.component').then(
                        (m) => m.EstadisticasComponent
                    ),
            },
        ]
    },
];