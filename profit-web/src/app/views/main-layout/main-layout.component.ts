import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryPlansComponent } from '../category-plans/category-plans.component';
import { EnrollClientComponent } from '../enroll-client/enroll-client.component';

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  icon?: string;
  children?: MenuItem[];
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, CategoryPlansComponent, EnrollClientComponent],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent {
  title = 'profit-web';

  activeMenu: string | null = null;

  accordions: { [key: string]: boolean } = {};

  isDarkMode = false;

  isLoggedIn = false;

  selectedComponent: string = 'dashboard';

  menuSections: MenuSection[] = [
    {
      title: 'PRINCIPAL',
      items: [
        { id: 'dashboard', name: 'Estadísticas', icon: 'fas fa-chart-line' },
        { id: 'administration', name: 'Administración', icon: 'fas fa-building' },
        { id: 'access-monitor', name: 'Monitor de Acceso', icon: 'fas fa-video' }
      ]
    },
    {
      title: 'GESTIÓN',
      items: [
        { 
          id: 'plans-accordion', 
          name: 'Planes y Clases', 
          icon: 'fas fa-layer-group',
          children: [
            { id: 'category-plans', name: 'Categoría/Planes' },
            { id: 'classes', name: 'Clases' }
          ]
        },
        { 
          id: 'clients-accordion', 
          name: 'Clientes', 
          icon: 'fas fa-users',
          children: [
            { id: 'enroll-client', name: 'Inscribir Cliente' },
            { id: 'client-management', name: 'Gestionar Clientes' },
            { id: 'memberships-management', name: 'Gestión de Membresías' }
          ]
        }
      ]
    },
    {
      title: 'INVENTARIO Y VENTAS',
      items: [
        { id: 'products', name: 'Productos y Stock', icon: 'fas fa-box-open' },
        { id: 'point-of-sale', name: 'Punto de Venta', icon: 'fas fa-cash-register' },
        { id: 'user-cart', name: 'Carrito de Usuario', icon: 'fas fa-shopping-cart' }
      ]
    }
  ];

  constructor(private router: Router, private renderer: Renderer2) {
    // Revisa si ya existe una sesión al cargar la app
    if (sessionStorage.getItem('isLoggedIn')) {
      this.isLoggedIn = true;
    }
  }

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkMode = true;
      this.renderer.setAttribute(document.body, 'data-theme', 'dark');
    } else {
      this.renderer.setAttribute(document.body, 'data-theme', 'light');
    }
  }


  selectComponent(componentName: string) {
    this.selectedComponent = componentName;
    this.activeMenu = componentName;

    // Lógica para cerrar otros acordeones
    Object.keys(this.accordions).forEach(key => {
      const section = this.menuSections.find(s => s.items.some(i => i.id === key));
      const item = section?.items.find(i => i.id === key);
      if (item && item.children && !item.children.some(c => c.id === componentName)) {
        // this.accordions[key] = false;
      }
    });
  }

  toggleAccordion(componentId: string) {
    this.accordions[componentId] = !this.accordions[componentId];
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    const theme = this.isDarkMode ? 'dark' : 'light';
    this.renderer.setAttribute(document.body, 'data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  logout() {
    this.isLoggedIn = false;
    sessionStorage.removeItem('isLoggedIn');
  }
}
