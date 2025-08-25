import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService, Category } from './category.service';
import { firstValueFrom } from 'rxjs';

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
  providers: [CategoryService],
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
  newPlan: Partial<Plan> = { categoryId: undefined, name: '', description: '', price: 0, duration: 30 };

  constructor(private categoryService: CategoryService) { }

  ngOnInit(): void {
    this.consultarCategorias();
  }

  consultarCategorias() {
    this.categoryService.consultar().subscribe((categorias) => {
      this.existingCategories = categorias;
    });
  }

  async saveCategory() {

    if (this.newCategory.id) {
      await firstValueFrom(this.categoryService.update(this.newCategory));
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







} 