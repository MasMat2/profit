import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Partner, PartnerStatus, PartnerFilter } from '../../models/partner.model';
import { PartnersService } from '../../services/partners.service';
import { PartnerModalComponent } from './partner-modal/partner-modal.component';

@Component({
  selector: 'app-partners-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, PartnerModalComponent],
  templateUrl: './partners-catalog.component.html',
  styleUrls: ['./partners-catalog.component.scss']
})
export class PartnersCatalogComponent implements OnInit {
  partners: Partner[] = [];
  filteredPartners: Partner[] = [];
  searchTerm: string = '';
  
  selectedStatuses: PartnerStatus[] = [];
  selectedPeriods: string[] = [];
  hasSaldo: boolean | undefined = undefined;
  isBecado: boolean | undefined = undefined;
  sortOrder: 'asc' | 'desc' | 'none' = 'none';
  
  showModal: boolean = false;
  selectedPartner: Partner | undefined = undefined;
  
  PartnerStatus = PartnerStatus;
  availableStatuses = Object.values(PartnerStatus);
  
  showStatusDropdown: boolean = false;

  constructor(private partnersService: PartnersService) {}

  ngOnInit(): void {
    this.loadPartners();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.filter-dropdown')) {
      this.showStatusDropdown = false;
    }
  }

  loadPartners(): void {
    const filter: PartnerFilter = {
      busqueda: this.searchTerm,
      estatus: this.selectedStatuses.length > 0 ? this.selectedStatuses : undefined,
      becado: this.isBecado
    };

    this.partnersService.getPartners(filter).subscribe(partners => {
      this.partners = partners;
      this.applyClientSideFilters();
    });
  }

  applyClientSideFilters(): void {
    this.filteredPartners = this.partners.filter(partner => {
      // Filtro por periodicidad
      if (this.selectedPeriods.length > 0 && !this.selectedPeriods.includes(partner.periodicidad)) {
        return false;
      }
      // Filtro por saldo
      if (this.hasSaldo === true && partner.saldo <= 0) {
        return false;
      }
      if (this.hasSaldo === false && partner.saldo > 0) {
        return false;
      }
      return true;
    });

    // Aplicar ordenamiento alfabético
    this.applySorting();
  }

  applySorting(): void {
    if (this.sortOrder === 'asc') {
      this.filteredPartners.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    } else if (this.sortOrder === 'desc') {
      this.filteredPartners.sort((a, b) => b.nombre.localeCompare(a.nombre, 'es'));
    }
  }

  setSortOrder(order: 'asc' | 'desc' | 'none'): void {
    this.sortOrder = order;
    this.applyClientSideFilters();
  }

  onSearch(): void {
    this.loadPartners();
  }

  toggleStatus(status: PartnerStatus, closeDropdown: boolean = false): void {
    const index = this.selectedStatuses.indexOf(status);
    if (index > -1) {
      this.selectedStatuses.splice(index, 1);
    } else {
      this.selectedStatuses.push(status);
    }
    if (closeDropdown) {
      this.showStatusDropdown = false;
    }
    this.loadPartners();
  }

  isStatusSelected(status: PartnerStatus): boolean {
    return this.selectedStatuses.includes(status);
  }

  toggleBecado(): void {
    if (this.isBecado === true) {
      this.isBecado = undefined;
    } else {
      this.isBecado = true;
    }
    this.loadPartners();
  }

  togglePeriod(period: string): void {
    const index = this.selectedPeriods.indexOf(period);
    if (index > -1) {
      this.selectedPeriods.splice(index, 1);
    } else {
      this.selectedPeriods.push(period);
    }
    this.applyClientSideFilters();
  }

  toggleSaldo(value: boolean | undefined): void {
    this.hasSaldo = this.hasSaldo === value ? undefined : value;
    this.applyClientSideFilters();
  }

  isPeriodSelected(period: string): boolean {
    return this.selectedPeriods.includes(period);
  }

  removeStatusFilter(status: PartnerStatus): void {
    this.toggleStatus(status);
  }

  removePeriodFilter(period: string): void {
    this.togglePeriod(period);
  }

  getActiveFiltersCount(): number {
    let count = 0;
    count += this.selectedStatuses.length;
    count += this.selectedPeriods.length;
    if (this.isBecado === true) count++;
    if (this.hasSaldo !== undefined) count++;
    return count;
  }

  openNewPartnerModal(): void {
    this.selectedPartner = undefined;
    this.showModal = true;
  }

  openPartnerModal(partner: Partner): void {
    this.selectedPartner = partner;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedPartner = undefined;
    this.loadPartners();
  }

  toggleStatusDropdown(): void {
    this.showStatusDropdown = !this.showStatusDropdown;
  }

  clearFilters(): void {
    this.selectedStatuses = [];
    this.selectedPeriods = [];
    this.isBecado = undefined;
    this.hasSaldo = undefined;
    this.showStatusDropdown = false;
    this.loadPartners();
  }

  getStatusBadgeClass(status: PartnerStatus): string {
    switch (status) {
      case PartnerStatus.ACTIVO:
        return 'badge-active';
      case PartnerStatus.INACTIVO:
        return 'badge-inactive';
      case PartnerStatus.SUSPENDIDO:
        return 'badge-suspended';
      case PartnerStatus.BECADO:
        return 'badge-scholarship';
      default:
        return '';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-MX');
  }
}
