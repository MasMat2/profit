import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormaPago } from '@services/formas-pago.service';
import { SharedModalComponent } from '@views/shared/shared-modal/shared-modal.component';
import { ToastService } from '@services/shared/toast.service';
import { FormasPagoService } from '@services/formas-pago.service';

@Component({
  selector: 'app-formas-pago',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModalComponent],
  templateUrl: './formas-pago.component.html',
  styleUrls: ['./formas-pago.component.scss']
})
export class FormasPagoComponent implements OnInit {

  showForm = false;

  isLoadingFormasPago = false;

  formasPago: FormaPago[] = [];

  isEditing = false;

  editingFormaPago: Partial<FormaPago> = {};

  constructor(
    private formasPagoService: FormasPagoService,
    private toast: ToastService) {}

  ngOnInit(): void {
    this.loadFormasPago();
  }

    
  loadFormasPago(): void {
    this.isLoadingFormasPago = true;
    this.formasPagoService.getFormasPago().subscribe({
      next: (data) => {
        this.formasPago = data;
        this.isLoadingFormasPago = false;
      },
      error: (error) => {
        console.error('Error loading payment methods:', error);
        this.toast.show('Error al cargar formas de pago', 'error');
        this.isLoadingFormasPago = false;
      }
    });
  }

  openAddForm(): void {
    this.showForm = true;
    this.isEditing = false;
    this.editingFormaPago = {};
  }

  openEditForm(formaPago: FormaPago): void {
    this.showForm = true;
    this.isEditing = true;
    this.editingFormaPago = { ...formaPago };
  }

  saveFormaPago(): void {
    if (!this.editingFormaPago.nomfp?.trim()) {
      this.toast.show('El nombre de la forma de pago es requerido', 'error');
      return;
    }


    if (this.isEditing && this.editingFormaPago.id) {
      this.formasPagoService.updateFormaPago(this.editingFormaPago.id, this.editingFormaPago).subscribe({
        next: () => {
          this.toast.show('Forma de pago actualizada correctamente', 'success');
        },
        error: (error) => {
          console.error('Error updating payment method:', error);
          this.toast.show('Error al actualizar forma de pago', 'error');
        }
      });
    } else {
      this.formasPagoService.createFormaPago(this.editingFormaPago).subscribe({
        next: () => {
          this.toast.show('Forma de pago creada correctamente', 'success');
        },
        error: (error) => {
          console.error('Error creating payment method:', error);
          this.toast.show('Error al crear forma de pago', 'error');
        }
      });
    }
  }

  deleteFormaPago(id: number): void {
    this.formasPagoService.deleteFormaPago(id).subscribe({
      next: () => {
        this.toast.show('Forma de pago eliminada correctamente', 'success');
        this.loadFormasPago();
      },
      error: (error) => {
        console.error('Error deleting payment method:', error);
        this.toast.show('Error al eliminar forma de pago', 'error');
      }
    });
  }

  closeForm(): void {
    this.showForm = false;
    this.isEditing = false;
    this.loadFormasPago();
  }

}
