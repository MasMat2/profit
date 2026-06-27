import { Injectable } from '@angular/core';
import { MENU_CONFIG, MenuItem } from '../../config/menu.config';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private allItems: MenuItem[] = MENU_CONFIG.flatMap(s => s.items);

  getItemByRoute(route: string): MenuItem | undefined {
    return this.allItems.find(i => i.route === route);
  }

  getIconByRoute(route: string): string {
    return this.getItemByRoute(route)?.icon ?? '';
  }
}
