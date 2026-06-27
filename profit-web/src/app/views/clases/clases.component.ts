import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MenuService } from '../../services/shared/menu.service';
import { ToastService } from '../../services/shared/toast.service';
import { ClasesService, Clase } from '../../services/clases.service';
import { SharedModalComponent } from '../../components/shared-modal/shared-modal.component';

@Component({
  selector: 'app-clases',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModalComponent],
  templateUrl: './clases.component.html',
  styleUrls: ['./clases.component.scss'],
})
export class ClasesComponent implements OnInit {
  classes: Clase[] = [];
  selectedClass: Partial<Clase> = {};

  showInactive = false;
  private savedFilterIds: { active?: number; inactive?: number } = {};
  isLoadingClases = false;
  isSaving = false;
  editingPriceIndex: number | null = null;
  showCreateModal = false;
  newClaseName = '';

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

  get filteredClasses(): Clase[] {
    if (this.showInactive) return this.classes.filter(c => c.activa == 0);
    return this.classes.filter(c => c.activa == 1);
  }

  toggleInactiveFilter(): void {
    const fromKey = this.showInactive ? 'inactive' : 'active';
    if (this.selectedClass.id) this.savedFilterIds[fromKey] = this.selectedClass.id;

    this.showInactive = !this.showInactive;

    const toKey = this.showInactive ? 'inactive' : 'active';
    const saved = this.filteredClasses.find(c => c.id === this.savedFilterIds[toKey]);
    this.selectedClass = saved ? { ...saved } : { ...(this.filteredClasses[0] ?? {}) };
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

  openCreateModal(): void {
    this.newClaseName = '';
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  saveNewClase(): void {
    if (!this.newClaseName.trim()) {
      this.toast.show('El nombre de la clase es requerido', 'error');
      return;
    }
    this.classesService.createClase({ nomclase: this.newClaseName.trim() }).subscribe({
      next: (newClase) => {
        this.classes.push(newClase);
        this.classes.sort((a, b) => a.nomclase.localeCompare(b.nomclase));
        this.selectClass(newClase);
        this.showCreateModal = false;
        this.toast.show('Clase creada correctamente', 'success');
      },
      error: () => {
        this.toast.show('Error al crear la clase', 'error');
      },
    });
  }

  guardarInformacion(): void {
    if (!this.selectedClass.id) return;
    this.isSaving = true;
    this.classesService.updateClase(this.selectedClass).subscribe({
      next: () => {
        this.editingPriceIndex = null;
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
