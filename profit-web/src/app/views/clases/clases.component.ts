import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MenuService } from '../../services/shared/menu.service';
import { ToastService } from '../../services/shared/toast.service';
import { ClasesService, Clase } from '../../services/clases.service';

@Component({
  selector: 'app-clases',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clases.component.html',
  styleUrls: ['./clases.component.scss'],
})
export class ClasesComponent implements OnInit {
  classes: Clase[] = [];
  selectedClass: Partial<Clase> = {};

  isLoadingClases = false;
  isSaving = false;
  editingPriceIndex: number | null = null;

  pageIcon: string;

  constructor(
    private classesService: ClasesService,
    private menuService: MenuService,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {
    const segment = this.route.snapshot.url[0]?.path;
    this.pageIcon = this.menuService.getIconByRoute(segment);
  }

  ngOnInit(): void {
    this.loadClases();
  }

  loadClases(): void {
    this.isLoadingClases = true;
    this.classesService.getAllClases().subscribe({
      next: (data) => {
        this.classes = data;
        if (data.length > 0) this.selectedClass = data[0];
        this.isLoadingClases = false;
      },
      error: () => {
        this.isLoadingClases = false;
        this.toast.show('Error al cargar las clases.', 'error');
      },
    });
  }

  isEditingPrice(index: number): boolean {
    return this.editingPriceIndex === index;
  }

  toggleEditPrice(index: number): void {
    if (this.editingPriceIndex === index) {
      this.editingPriceIndex = null;
    } else {
      // Activar edición
      this.editingPriceIndex = index;
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  }

  selectClass(c: Clase): void {
    this.selectedClass = {...c};
  }

  guardarInformacion(): void {
    if (!this.selectedClass.id) return;
    this.isSaving = true;
    this.classesService.updateClase(this.selectedClass).subscribe({
      next: () => {
        this.isSaving = false;
        this.toast.show('Cambios guardados correctamente', 'success');
      },
      error: () => {
        this.isSaving = false;
        this.toast.show('Error al guardar los cambios', 'error');
      },
    });
  }
}
