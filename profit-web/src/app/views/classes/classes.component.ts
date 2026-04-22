import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClassesService } from '../../services/classes.service';

interface ClassModel {
  id: number;
  clase: number;
  nomclase: string;
  controlhr: number;
  limitectes: number;
  cntlimite: number;
  impticketasist: number;
  activa: number;
  cobinsc: number;
  prinsc: number;
  prsem: number;
  prqna: number;
  prmes: number;
  prtrim: number;
  prstre: number;
  pranual: number;
  descsem: number;
  descqna: number;
  descmes: number;
  desctrim: number;
  descstre: number;
  descanual: number;
  usunvo?: number;
  fecnvo?: Date;
  usumod?: number;
  fecmod?: Date;
  envia?: number;
}

interface PrecioDisplay {
  periodo: string;
  precioNormal: number;
  descuento: number;
}

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './classes.component.html',
  styleUrls: ['./classes.component.scss']
})
export class ClassesComponent implements OnInit {
  clases: ClassModel[] = [];
  selectedClassId: number = 0;
  currentClass: ClassModel | null = null;
  isLoading = false;
  isLoadingDetails = false;
  isEditing = false;
  successMessage = '';
  errorMessage = '';

  precios: PrecioDisplay[] = [];
  editingPriceIndex: number | null = null;
  showAddClassModal = false;
  showDeleteConfirmModal = false;
  newClassName = '';

  constructor(private classesService: ClassesService) {}

  ngOnInit(): void {
    this.loadClasses();
  }

  loadClasses(): void {
    this.isLoading = true;
    this.classesService.getAllClasses().subscribe({
      next: (data: ClassModel[]) => {
        this.clases = data;
        if (this.clases.length > 0) {
          this.selectedClassId = this.clases[0].id;
          this.loadClassDetails(this.selectedClassId);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading classes:', error);
        this.errorMessage = 'Error al cargar las clases';
        this.isLoading = false;
      }
    });
  }

  loadClassDetails(id: number): void {
    this.isLoadingDetails = true;
    this.classesService.getClassById(id).subscribe({
      next: (data: ClassModel) => {
        this.currentClass = data;
        this.updatePreciosDisplay();
        this.isLoadingDetails = false;
      },
      error: (error) => {
        console.error('Error loading class details:', error);
        this.errorMessage = 'Error al cargar los detalles de la clase';
        this.isLoadingDetails = false;
      }
    });
  }

  updatePreciosDisplay(): void {
    if (!this.currentClass) return;
    
    this.precios = [
      { periodo: 'SEMANAL', precioNormal: this.currentClass.prsem, descuento: this.currentClass.descsem },
      { periodo: 'QUINCENAL', precioNormal: this.currentClass.prqna, descuento: this.currentClass.descqna },
      { periodo: 'MENSUAL', precioNormal: this.currentClass.prmes, descuento: this.currentClass.descmes },
      { periodo: 'TRIMESTRAL', precioNormal: this.currentClass.prtrim, descuento: this.currentClass.desctrim },
      { periodo: 'SEMESTRAL', precioNormal: this.currentClass.prstre, descuento: this.currentClass.descstre },
      { periodo: 'ANUAL', precioNormal: this.currentClass.pranual, descuento: this.currentClass.descanual }
    ];
  }

  onClassChange(): void {
    if (this.selectedClassId && this.selectedClassId > 0) {
      this.loadClassDetails(this.selectedClassId);
    }
  }

  selectClass(id: number): void {
    if (id !== this.selectedClassId) {
      this.selectedClassId = id;
      this.editingPriceIndex = null;
      this.loadClassDetails(id);
    }
  }

  toggleEditPrice(index: number): void {
    if (this.editingPriceIndex === index) {
      // Confirmar edición
      this.confirmPriceEdit(index);
      this.editingPriceIndex = null;
    } else {
      // Activar edición
      this.editingPriceIndex = index;
    }
  }

  confirmPriceEdit(index: number): void {
    if (!this.currentClass) return;

    const priceFields = [
      { precio: 'prsem', descuento: 'descsem' },
      { precio: 'prqna', descuento: 'descqna' },
      { precio: 'prmes', descuento: 'descmes' },
      { precio: 'prtrim', descuento: 'desctrim' },
      { precio: 'prstre', descuento: 'descstre' },
      { precio: 'pranual', descuento: 'descanual' }
    ];

    const field = priceFields[index];
    if (field) {
      (this.currentClass as any)[field.precio] = this.precios[index].precioNormal;
      (this.currentClass as any)[field.descuento] = this.precios[index].descuento;
    }
  }

  isEditingPrice(index: number): boolean {
    return this.editingPriceIndex === index;
  }

  toggleAddClassModal(open: boolean): void {
    this.showAddClassModal = open;
    if (open) this.newClassName = '';
  }

  openAddClassModal(): void {
    this.toggleAddClassModal(true);
  }

  closeAddClassModal(): void {
    this.toggleAddClassModal(false);
  }

  createNewClass(): void {
    if (!this.newClassName.trim()) {
      this.showMessage('El nombre de la clase es requerido', 'error');
      return;
    }

    this.isLoading = true;
    const newClassData = {
      clase: 0, nomclase: this.newClassName.trim(), controlhr: 0, limitectes: 0,
      cntlimite: 0, impticketasist: 0, activa: 1, cobinsc: 0, prinsc: 0,
      prsem: 0, prqna: 0, prmes: 0, prtrim: 0, prstre: 0, pranual: 0,
      descsem: 0, descqna: 0, descmes: 0, desctrim: 0, descstre: 0, descanual: 0
    };

    this.classesService.createClass(newClassData).subscribe({
      next: () => {
        this.showMessage('Clase creada correctamente', 'success');
        this.closeAddClassModal();
        this.loadClasses();
      },
      error: (error) => {
        console.error('Error creating class:', error);
        this.showMessage('Error al crear la clase', 'error');
      }
    });
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.isLoading = false;
    if (type === 'success') {
      this.successMessage = message;
      setTimeout(() => this.successMessage = '', 3000);
    } else {
      this.errorMessage = message;
      setTimeout(() => this.errorMessage = '', 3000);
    }
  }

  saveChanges(): void {
    if (!this.currentClass) return;

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.classesService.updateClass(this.currentClass.id, this.currentClass).subscribe({
      next: (data) => {
        this.currentClass = data;
        this.updatePreciosDisplay();
        this.showMessage('Cambios guardados correctamente', 'success');
      },
      error: (error) => {
        console.error('Error saving changes:', error);
        this.showMessage('Error al guardar los cambios', 'error');
      }
    });
  }

  toggleDeleteModal(open: boolean): void {
    this.showDeleteConfirmModal = open;
  }

  openDeleteConfirmModal(): void {
    this.toggleDeleteModal(true);
  }

  closeDeleteConfirmModal(): void {
    this.toggleDeleteModal(false);
  }

  confirmDelete(): void {
    if (!this.currentClass) return;

    this.closeDeleteConfirmModal();
    this.isLoading = true;
    
    this.classesService.deleteClass(this.currentClass.id).subscribe({
      next: () => {
        this.showMessage('Clase eliminada correctamente', 'success');
        this.loadClasses();
      },
      error: (error) => {
        console.error('Error deleting class:', error);
        this.showMessage('Error al eliminar la clase', 'error');
      }
    });
  }

  cancelChanges(): void {
    if (this.selectedClassId && this.selectedClassId > 0) {
      this.loadClassDetails(this.selectedClassId);
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  }

  get controlHr(): boolean {
    return this.currentClass?.controlhr === 1;
  }

  set controlHr(value: boolean) {
    if (this.currentClass) this.currentClass.controlhr = value ? 1 : 0;
  }

  get limiteSocios(): boolean {
    return this.currentClass?.limitectes === 1;
  }

  set limiteSocios(value: boolean) {
    if (this.currentClass) {
      this.currentClass.limitectes = value ? 1 : 0;
      if (!value) this.currentClass.cntlimite = 0;
    }
  }

  get imprimirTicket(): boolean {
    return this.currentClass?.impticketasist === 1;
  }

  set imprimirTicket(value: boolean) {
    if (this.currentClass) this.currentClass.impticketasist = value ? 1 : 0;
  }

  get cobrarInscripcion(): boolean {
    return this.currentClass?.cobinsc === 1;
  }

  set cobrarInscripcion(value: boolean) {
    if (this.currentClass) {
      this.currentClass.cobinsc = value ? 1 : 0;
      if (!value) this.currentClass.prinsc = 0;
    }
  }
}
