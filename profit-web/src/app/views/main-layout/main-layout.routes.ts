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
                path: 'acceso-clientes',
                loadComponent: () =>
                    import('../acceso-cliente/acceso-cliente.component').then(
                        (m) => m.AccessClientComponent
                    ),
            },
            {
                path: 'socios',
                loadComponent: () =>
                    import('../socios/socios.component').then(
                        (m) => m.SociosComponent
                    ),
            },
            {
                path: 'caja',
                loadComponent: () =>
                    import('../caja/caja.component').then(
                        (m) => m.CajaComponent
                    ),
            },
            {
                path: 'estadisticas',
                loadComponent: () =>
                    import('../estadisticas/estadisticas.component').then(
                        (m) => m.EstadisticasComponent
                    ),
            },
            {
                path: 'registro-tickets',
                loadComponent: () =>
                    import('../registro-tickets/registro-tickets.component').then(
                        (m) => m.RegistroTicketsComponent
                    ),
            },
        ]
    },
];