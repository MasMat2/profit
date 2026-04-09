import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParametersService, BusinessParameters } from '../../services/parameters.service';
import { PaymentMethodsModalComponent } from '../../components/payment-methods-modal/payment-methods-modal.component';

@Component({
  selector: 'app-administration',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentMethodsModalComponent],
  templateUrl: './administration.component.html',
  styleUrls: ['./administration.component.scss']
})
export class AdministrationComponent implements OnInit {
  businessInfo = {
    id: 0,
    businessName: '',
    address: '',
    colony: '',
    city: '',
    state: '',
    phone: '',
    branchNumber: 1,
    paqvisvence: 0,
    diaspaqvisvence: 15,
    aplicadescdias: 10
  };

  isLoading = false;
  successMessage = '';
  errorMessage = '';
  isBusinessInfoCollapsed = true;
  isPaymentMethodsModalOpen = false;

  constructor(private parametersService: ParametersService) {}

  toggleBusinessInfo(): void {
    this.isBusinessInfoCollapsed = !this.isBusinessInfoCollapsed;
  }

  openPaymentMethodsModal(): void {
    this.isPaymentMethodsModalOpen = true;
  }

  closePaymentMethodsModal(): void {
    this.isPaymentMethodsModalOpen = false;
  }

  ngOnInit(): void {
    this.loadParameters();
  }

  loadParameters(): void {
    this.isLoading = true;
    this.parametersService.getParameters().subscribe({
      next: (data: BusinessParameters) => {
        if (data) {
          this.businessInfo.id = data.id;
          this.businessInfo.businessName = data.empresa || '';
          this.businessInfo.address = data.dir1 || '';
          this.businessInfo.colony = data.dir2 || '';
          this.businessInfo.city = data.dir3 || '';
          this.businessInfo.phone = data.tels || '';
          this.businessInfo.branchNumber = data.sucursal || 1;
          this.businessInfo.paqvisvence = data.paqvisvence || 0;
          this.businessInfo.diaspaqvisvence = data.diaspaqvisvence || 15;
          this.businessInfo.aplicadescdias = data.aplicadescdias || 10;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading parameters:', error);
        this.errorMessage = 'Error al cargar la información del negocio';
        this.isLoading = false;
      }
    });
  }

  saveBusinessInfo(): void {
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const updateData = {
      id: this.businessInfo.id,
      empresa: this.businessInfo.businessName,
      dir1: this.businessInfo.address,
      dir2: this.businessInfo.colony,
      dir3: this.businessInfo.city,
      tels: this.businessInfo.phone,
      sucursal: this.businessInfo.branchNumber,
      logocte: '',
      paqvisvence: this.businessInfo.paqvisvence,
      diaspaqvisvence: this.businessInfo.diaspaqvisvence,
      aplicadescdias: this.businessInfo.aplicadescdias,
      usumod: 1
    };

    this.parametersService.updateParameters(updateData as any).subscribe({
      next: (data) => {
        this.successMessage = 'Información guardada correctamente';
        this.isLoading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('Error saving parameters:', error);
        this.errorMessage = 'Error al guardar la información';
        this.isLoading = false;
      }
    });
  }
}
