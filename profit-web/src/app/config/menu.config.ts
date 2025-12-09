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
    title: 'PRINCIPAL',
    items: [
      { 
        id: 'estadisticas', 
        name: 'Estadísticas', 
        icon: 'fas fa-chart-line',
        route: 'estadisticas'
      },
      { 
        id: 'administracion', 
        name: 'Administración', 
        icon: 'fas fa-building',
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
    ]
  },
  {
    title: 'GESTIÓN',
    items: [
      { 
        id: 'categoria-planes', 
        name: 'Categoría/Planes', 
        icon: 'fas fa-layer-group',
        route: 'categoria-planes'
      },
      { 
        id: 'clientes-accordion', 
        name: 'Clientes', 
        icon: 'fas fa-users',
        children: [
          { 
            id: 'inscribir-cliente', 
            name: 'Inscribir Cliente',
            route: 'clientes/inscribir'
          },
          { 
            id: 'gestionar-clientes', 
            name: 'Gestionar Clientes',
            route: 'clientes/gestionar'
          },
          { 
            id: 'gestionar-membresias', 
            name: 'Gestión de Membresías',
            route: 'clientes/membresias'
          }
        ]
      }
    ]
  },
  {
    title: 'INVENTARIO Y VENTAS',
    items: [
      { 
        id: 'productos', 
        name: 'Productos y Stock', 
        icon: 'fas fa-box-open',
        route: 'productos'
      },
      { 
        id: 'punto-venta', 
        name: 'Punto de Venta', 
        icon: 'fas fa-cash-register',
        route: 'punto-venta'
      },
      { 
        id: 'carrito-usuario', 
        name: 'Carrito de Usuario', 
        icon: 'fas fa-shopping-cart',
        route: 'carrito-usuario'
      }
    ]
  }
];
