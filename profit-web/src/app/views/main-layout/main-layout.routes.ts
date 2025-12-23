import { Route } from "@angular/router";
import { MainLayoutComponent } from "./main-layout.component";
import { CategoryPlansComponent } from "../category-plans/category-plans.component";
import { EnrollClientComponent } from "../enroll-client/enroll-client.component";
import { AccessClientComponent } from "../access-client/access-client.component";
import { ClientManagementComponent } from "../client-management/client-management.component";
import { AdministrationComponent } from "../administration/administration.component";

export const MAIN_LAYOUT_ROUTES: Route[] = [
    {
        path: '',
        component: MainLayoutComponent,
        children: [
            {
                path: 'categoria-planes',
                component: CategoryPlansComponent,
            },
            {
                path: 'clientes/inscribir',
                component: EnrollClientComponent,
            },
            {
                path: 'acceso-clientes',
                component: AccessClientComponent,
            },
            {
                path: 'clientes/gestionar',
                component: ClientManagementComponent,
            },
            {
                path: 'administracion',
                component: AdministrationComponent,
            },
        ]
    },
];