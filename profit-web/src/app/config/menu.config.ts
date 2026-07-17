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
        id: 'administracion', 
        name: 'Configuración', 
        icon: 'fas fa-cog',
        route: 'administracion'
      },
      { 
        id: 'estadisticas', 
        name: 'Estadísticas', 
        icon: 'fas fa-chart-line',
        route: 'estadisticas'
      },
      { 
        id: 'comunicacion', 
        name: 'Comunicación', 
        icon: 'fas fa-bullhorn',
        route: 'comunicacion'
      }
    ]
  },
  {
    title: 'ACCESO',
    items: [
      { 
        id: 'acceso-clientes', 
        name: 'Registro Asistencia', 
        icon: 'fas fa-fingerprint',
        route: 'acceso-clientes'
      }
    ]
  },
  {
    title: 'CATÁLOGOS',
    items: [
      { 
        id: 'clases', 
        name: 'Clases', 
        icon: 'fas fa-layer-group',
        route: 'clases'
      },
      { 
        id: 'socios', 
        name: 'Socios', 
        icon: 'fas fa-users',
        route: 'socios'
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
        id: 'registro-tickets', 
        name: 'Registro de Tickets', 
        icon: 'fas fa-ticket-alt',
        route: 'registro-tickets'
      },
      {
        id: 'caja',
        name: 'Caja',
        icon: 'fas fa-cash-register',
        route: 'caja'
      }
    ]
  }
];
