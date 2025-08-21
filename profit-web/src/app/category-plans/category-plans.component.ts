import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Definimos las estructuras para claridad
interface Categoria {
  id: number;
  name: string;
  description: string;
}

interface Plan {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  price: number;
  duration: number; // en días
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-category-plans',
  templateUrl: './category-plans.component.html',
  styleUrls: ['./category-plans.component.css']
})
export class CategoryPlansComponent {
  activeView: 'categoria' | 'planes' = 'categoria';

  // --- DATOS DE CATEGORÍAS ---
  existingCategories: Categoria[] = [
    { id: 1, name: 'Acceso General', description: 'Acceso a todas las áreas comunes.' },
    { id: 2, name: 'Clases de Yoga', description: 'Acceso exclusivo a clases de yoga.' },
    { id: 3, name: 'Entrenamiento Personalizado', description: 'Incluye sesiones con entrenador.' }
  ];
  newCategory = { name: '', description: '' };

  // --- DATOS DE PLANES ---
  existingPlans: Plan[] = [
    { id: 101, categoryId: 1, name: 'Acceso Básico Mensual', description: 'Acceso de 8am a 5pm.', price: 29.99, duration: 30 },
    { id: 102, categoryId: 1, name: 'Acceso VIP Mensual', description: 'Acceso ilimitado 24/7.', price: 49.99, duration: 30 },
    { id: 103, categoryId: 2, name: 'Paquete 10 Clases de Yoga', description: 'Válido por 3 meses.', price: 89.99, duration: 90 },
    { id: 104, categoryId: 3, name: 'Entrenamiento Personal 12 Sesiones', description: '12 sesiones con un entrenador certificado.', price: 250, duration: 60 }
  ];
  newPlan: Partial<Plan> = { categoryId: undefined, name: '', description: '', price: 0, duration: 30 };

  saveCategory() {
    // Enviar a la API
    // this.existingCategories.push({
    //   id: this.existingCategories.length + 1,
    //   ...this.newCategory
    // });
    this.newCategory = { name: '', description: '' };
  }

  savePlan() {
    // Validación simple
    if (!this.newPlan.categoryId || !this.newPlan.name || !this.newPlan.price) {
      console.error("Faltan datos para guardar el plan.");
      return;
    }
    console.log('Guardando plan:', this.newPlan);
    this.existingPlans.push({
      id: this.existingPlans.length + 101, // Simulación de ID único
      ...this.newPlan
    } as Plan);
    // Limpiamos el formulario
    this.newPlan = { categoryId: undefined, name: '', description: '', price: 0, duration: 30 };
  }

  getCategoryName(categoryId: number): string {
    const category = this.existingCategories.find(c => c.id === categoryId);
    return category ? category.name : 'Sin categoría';
  }
} 