import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Partner, ClassCategory, AvailableClass, PaymentPeriod, PartnerClass } from '../../../models/partner.model';
import { PartnersService } from '../../../services/partners.service';

@Component({
  selector: 'app-class-assignment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './class-assignment-modal.component.html',
  styleUrls: ['./class-assignment-modal.component.scss']
})
export class ClassAssignmentModalComponent implements OnInit {
  @Input() partner!: Partner;
  @Output() close = new EventEmitter<void>();

  classCategories: ClassCategory[] = [];
  selectedCategory: ClassCategory | null = null;
  selectedClass: AvailableClass | null = null;
  
  selectedPeriod: PaymentPeriod = PaymentPeriod.MENSUAL;
  PaymentPeriod = PaymentPeriod;
  availablePeriods = Object.values(PaymentPeriod);

  constructor(private partnersService: PartnersService) {}

  ngOnInit(): void {
    this.loadAvailableClasses();
    if (this.partner.periodicidad) {
      this.selectedPeriod = this.partner.periodicidad;
    }
  }

  loadAvailableClasses(): void {
    this.partnersService.getAvailableClasses().subscribe(categories => {
      this.classCategories = categories;
      if (categories.length > 0) {
        this.selectCategory(categories[0]);
      }
    });
  }

  selectCategory(category: ClassCategory): void {
    this.selectedCategory = category;
    if (category.clases.length > 0) {
      this.selectClass(category.clases[0]);
    }
  }

  selectClass(clase: AvailableClass): void {
    this.selectedClass = clase;
  }

  getCurrentPrice(): number {
    if (!this.selectedClass) return 0;
    const priceConfig = this.selectedClass.precios.find(p => p.periodicidad === this.selectedPeriod);
    return priceConfig ? priceConfig.precio : 0;
  }

  getCurrentDiscount(): number {
    if (!this.selectedClass) return 0;
    const priceConfig = this.selectedClass.precios.find(p => p.periodicidad === this.selectedPeriod);
    return priceConfig ? priceConfig.descuento : 0;
  }

  getSubtotal(): number {
    const price = this.getCurrentPrice();
    const discount = this.getCurrentDiscount();
    return price - discount;
  }

  onConfirm(): void {
    if (this.selectedClass) {
      const subtotal = this.getSubtotal();
      
      const newClass: PartnerClass = {
        id: Date.now() + Math.random(),
        nombre: this.selectedClass.nombre,
        categoria: this.selectedClass.categoria,
        horario: 'Por definir',
        instructor: 'Por asignar',
        dias: [],
        precio: this.getCurrentPrice(),
        descuento: this.getCurrentDiscount(),
        periodicidad: this.selectedPeriod,
        cobrarInscripcion: false,
        montoInscripcion: 0,
        subtotal: subtotal,
        total: subtotal
      };

      const updatedClases = [...(this.partner.clases || []), newClass];
      
      if (this.partner.id === 0) {
        // Partner temporal (nuevo socio)
        this.partner.clases = updatedClases;
        this.close.emit();
      } else {
        // Partner existente
        this.partnersService.updatePartner(this.partner.id, {
          clases: updatedClases,
          periodicidad: this.selectedPeriod
        }).subscribe(() => {
          this.close.emit();
        });
      }
    }
  }

  onCancel(): void {
    this.close.emit();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }
}
