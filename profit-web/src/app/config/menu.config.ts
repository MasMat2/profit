export interface MenuItem {
  id: string;
  name: string;
  icon?: string;
  route?: string;
  children?: MenuItem[];
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export const MENU_CONFIG: MenuSection[] = [
  {
    title: 'ADMINISTRACIÓN',
    items: [

      { 
        id: 'configuracion', 
        name: 'Configuración', 
        icon: 'fas fa-cog',
        route: 'administracion'
      },
      { 
        id: 'estadisticas', 
        name: 'Estadísticas', 
        icon: 'fas fa-chart-bar',
        route: 'estadisticas'
      },
    ]
  },
  {
    title: 'ACCESO',
    items: [

      { 
        id: 'acceso-clientes', 
        name: 'Registro Asistencia', 
        icon: 'fas fa-user',
        route: 'acceso-clientes'
      },
    ]
  },
  {
    title: 'CATÁLOGOS',
    items: [
      { 
        id: 'categoria-planes', 
        name: 'Clases', 
        icon: 'fas fa-layer-group',
        route: 'categoria-planes'
      },
      { 
        id: 'catalogo-socios', 
        name: 'Socios', 
        icon: 'fas fa-users',
        route: 'catalogo-socios'
      }
    ]
  },
  {
    title: 'INVENTARIO Y VENTAS',
    items: [
      { 
        id: 'punto-venta', 
        name: 'Punto de venta', 
        icon: 'fas fa-cash-register',
        route: 'punto-venta'
      },
     
      { 
        id: 'ventas-credito', 
        name: 'Ventas a Crédito', 
        icon: 'fas fa-credit-card',
        route: 'ventas-credito'
      },
      { 
        id: 'registro-tickets', 
        name: 'Registro de Tickets', 
        icon: 'fas fa-receipt',
        route: 'registro-tickets'
      }
    ]
  }
];
