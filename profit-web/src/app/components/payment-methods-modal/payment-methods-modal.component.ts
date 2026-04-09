import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentMethodsService, PaymentMethod } from '../../services/payment-methods.service';

@Component({
  selector: 'app-payment-methods-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-methods-modal.component.html',
  styleUrls: ['./payment-methods-modal.component.scss']
})
export class PaymentMethodsModalComponent implements OnInit {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  paymentMethods: PaymentMethod[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  isEditing = false;
  editingMethod: Partial<PaymentMethod> = {};
  showForm = false;

  constructor(private paymentMethodsService: PaymentMethodsService) {}

  ngOnInit(): void {
    this.loadPaymentMethods();
  }

  loadPaymentMethods(): void {
    this.isLoading = true;
    this.paymentMethodsService.getAllPaymentMethods().subscribe({
      next: (data) => {
        this.paymentMethods = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading payment methods:', error);
        this.errorMessage = 'Error al cargar formas de pago';
        this.isLoading = false;
      }
    });
  }

  openAddForm(): void {
    this.isEditing = false;
    this.editingMethod = {
      fp: 0,
      nomfp: '',
      c_formapago: '',
      c_moneda: 'MXN'
    };
    this.showForm = true;
  }

  openEditForm(method: PaymentMethod): void {
    this.isEditing = true;
    this.editingMethod = { ...method };
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingMethod = {};
    this.errorMessage = '';
    this.successMessage = '';
  }

  savePaymentMethod(): void {
    if (!this.editingMethod.nomfp?.trim()) {
      this.errorMessage = 'El nombre de la forma de pago es requerido';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.isEditing && this.editingMethod.id) {
      this.paymentMethodsService.updatePaymentMethod(this.editingMethod.id, this.editingMethod).subscribe({
        next: () => {
          this.successMessage = 'Forma de pago actualizada correctamente';
          this.loadPaymentMethods();
          this.cancelForm();
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error updating payment method:', error);
          this.errorMessage = 'Error al actualizar forma de pago';
          this.isLoading = false;
        }
      });
    } else {
      this.paymentMethodsService.createPaymentMethod(this.editingMethod).subscribe({
        next: () => {
          this.successMessage = 'Forma de pago creada correctamente';
          this.loadPaymentMethods();
          this.cancelForm();
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error creating payment method:', error);
          this.errorMessage = 'Error al crear forma de pago';
          this.isLoading = false;
        }
      });
    }
  }

  deletePaymentMethod(id: number): void {
    if (!confirm('¿Está seguro de eliminar esta forma de pago?')) {
      return;
    }

    this.isLoading = true;
    this.paymentMethodsService.deletePaymentMethod(id).subscribe({
      next: () => {
        this.successMessage = 'Forma de pago eliminada correctamente';
        this.loadPaymentMethods();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('Error deleting payment method:', error);
        this.errorMessage = 'Error al eliminar forma de pago';
        this.isLoading = false;
      }
    });
  }

  closeModal(): void {
    this.cancelForm();
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }
}
