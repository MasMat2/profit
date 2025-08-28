import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService, Category } from '../../services/category.service';
import { PlansService, Plan } from '../../services/plans.service';
import { firstValueFrom } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [CategoryService, PlansService],
  selector: 'app-category-plans',
  templateUrl: './category-plans.component.html',
  styleUrls: ['./category-plans.component.css']
})
export class CategoryPlansComponent implements OnInit {
  activeView: 'categoria' | 'planes' = 'categoria';

  // --- DATOS DE CATEGORÍAS ---
  existingCategories: Category[] = [];
  newCategory: Category = { name: '', description: '' };

  // --- DATOS DE PLANES ---
  existingPlans: Plan[] = [];
  newPlan: Plan = { category_id: undefined, name: '', description: '', price: 0, duration: 30 };

  constructor(private categoryService: CategoryService, private plansService: PlansService) { }

  ngOnInit(): void {
    this.consultarCategorias();
    this.consultarPlanes();
  }

  consultarCategorias() {
    this.categoryService.consultar().subscribe((categorias) => {
      this.existingCategories = categorias;
    });
  }

  consultarPlanes() {
    this.plansService.consultar().subscribe((planes) => {
      this.existingPlans = planes;
    });
  }

  async saveCategory() {

    if (this.newCategory.id) {
      await firstValueFrom(this.categoryService.editar(this.newCategory));
    } else {
      await firstValueFrom(this.categoryService.agregar(this.newCategory));
    }

    this.newCategory = { name: '', description: '' };
    this.consultarCategorias();


  }

  deleteCategory(category: Category) {
    if (!category.id) {
      return;
    }

    this.categoryService.eliminar(category.id).subscribe(() => {
      this.consultarCategorias();
    });
  }

  editCategory(category: Category) {
    this.newCategory = {...category};
    this.activeView = 'categoria';
  }

  savePlan() {
    // Validación simple
    if (!this.newPlan.category_id || !this.newPlan.name || !this.newPlan.price) {
      console.error("Faltan datos para guardar el plan.");
      return;
    }
    console.log('Guardando plan:', this.newPlan);
    this.plansService.agregar(this.newPlan).subscribe(() => {
      this.consultarPlanes();
    });
      
    // Limpiamos el formulario
    this.newPlan = { category_id: undefined, name: '', description: '', price: 0, duration: 30 };
  }

  getCategoryName(categoryId?: number): any {
    const category = this.existingCategories.find(c => c.id === categoryId);
    return category ? category.name : 'Sin categoría';
  }
} 