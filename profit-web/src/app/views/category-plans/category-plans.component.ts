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
  newPlan: Plan = { category_id: undefined, name: '', description: '', price: 0, duration: 30, inscription_price: 0 }; //to do: Crear constructor a futuro

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
      
      if (this.newCategory.id==category.id) {
        this.newCategory.id=undefined;
      }
    });
}



  editCategory(category: Category) {
    this.newCategory = {...category};
    this.activeView = 'categoria';
  }




  async savePlan() {
    // Validación simple
    if (this.newPlan.id) {
      await firstValueFrom(this.plansService.editar(this.newPlan));
    } else {
      await firstValueFrom(this.plansService.agregar(this.newPlan));
    }
    this.newPlan = { category_id: undefined, name: '', description: '', price: 0, duration: 30, inscription_price: 0 };
    this.consultarPlanes();
  }

  getCategoryName(categoryId?: number): any {
    const category = this.existingCategories.find(c => c.id === categoryId);
    return category ? category.name : 'Sin categoría';
  }

// --- PLANES EDITAR Y ELIMINAR ---
  deletePlan(plan: Plan) {
    if (!plan.id) {
      return;
    }

    this.plansService.eliminar(plan.id).subscribe(() => {
      this.consultarPlanes();

      if (this.newPlan.id==plan.id) {
      this.newPlan.id=undefined;
      }
    });
  }

  editPlan(plan: Plan) {
    this.newPlan = {...plan};
    this.activeView = 'planes';
  }










} 