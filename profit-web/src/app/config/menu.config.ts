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
        id: 'reportes', 
        name: 'Reportes', 
        icon: 'fas fa-chart-bar',
        route: 'reportes'
      },
      { 
        id: 'configuracion', 
        name: 'Configuración', 
        icon: 'fas fa-cog',
        route: 'administracion'
      },
      { 
        id: 'monitor-acceso', 
        name: 'Monitor de Acceso', 
        icon: 'fas fa-video',
        route: 'monitor-acceso'
      },
      { 
        id: 'acceso-clientes', 
        name: 'Acceso a Clientes', 
        icon: 'fas fa-user',
        route: 'acceso-clientes'
      },
      { 
        id: 'categoria-planes', 
        name: 'Categoría/Planes', 
        icon: 'fas fa-layer-group',
        route: 'categoria-planes'
      },
      { 
        id: 'catalogo-socios', 
        name: 'Catálogo de Socios', 
        icon: 'fas fa-users',
        route: 'catalogo-socios'
      }
    ]
  },
  {
    title: 'INVENTARIO Y VENTAS',
    items: [
      { 
        id: 'catalogo-productos', 
        name: 'Catálogo de Productos', 
        icon: 'fas fa-box-open',
        route: 'catalogo-productos'
      },
      { 
        id: 'punto-venta', 
        name: 'Punto de Venta', 
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
