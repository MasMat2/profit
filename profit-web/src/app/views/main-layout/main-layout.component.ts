import { Component } from '@angular/core';
import { Router, RouterOutlet, RouterModule } from '@angular/router';
import { Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MENU_CONFIG, MenuSection } from '../../config/menu.config';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    RouterModule,
  ],
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

  menuSections: MenuSection[] = MENU_CONFIG;

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

    this.loadMenuState();
  }


  selectComponent(componentName: string) {
    console.log(componentName);
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

    // guardar el estado del menu
    localStorage.setItem("selectedComponent", componentName);
    
  }

  loadMenuState() {
    const savedAccordion = localStorage.getItem("selectedAccordion");
    if (savedAccordion) {
      this.toggleAccordion(savedAccordion);
    }


    const savedComponent = localStorage.getItem("selectedComponent");
    if (savedComponent) {
      this.selectComponent(savedComponent);
    }
  }

  toggleAccordion(componentId: string) {
    this.accordions[componentId] = !this.accordions[componentId];
    // guardar el estado del menu
    localStorage.setItem("selectedAccordion", componentId);
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
