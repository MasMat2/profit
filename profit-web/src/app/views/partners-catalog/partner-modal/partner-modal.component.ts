import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Partner, PartnerStatus, PaymentPeriod } from '../../../models/partner.model';
import { PartnersService } from '../../../services/partners.service';
import { ClassAssignmentModalComponent } from '../class-assignment-modal/class-assignment-modal.component';
import { PaymentTicketModalComponent, PaymentTicket } from '../payment-ticket-modal/payment-ticket-modal.component';

@Component({
  selector: 'app-partner-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ClassAssignmentModalComponent, PaymentTicketModalComponent],
  templateUrl: './partner-modal.component.html',
  styleUrls: ['./partner-modal.component.scss']
})
export class PartnerModalComponent implements OnInit {
  @Input() partner?: Partner;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Partner>();

  partnerForm!: FormGroup;
  activeTab: 'datos' | 'suscripciones' | 'descuentos' | 'ventas' = 'datos';
  showClassAssignmentModal: boolean = false;
  temporaryClasses: any[] = [];
  totalInscripcion: number = 0;
  showTicketModal: boolean = false;
  ticketData: PaymentTicket | null = null;

  PartnerStatus = PartnerStatus;
  PaymentPeriod = PaymentPeriod;
  availableStatuses = Object.values(PartnerStatus);
  availablePeriods = Object.values(PaymentPeriod);

  constructor(
    private fb: FormBuilder,
    private partnersService: PartnersService
  ) {}

  ngOnInit(): void {
    this.initForm();
    if (this.partner) {
      this.loadPartnerData();
      this.loadMensualidades();
    }
  }

  loadMensualidades(): void {
    if (this.partner && this.partner.id > 0) {
      console.log('Cargando mensualidades para socio ID:', this.partner.id);
      this.partnersService.getMensualidadesBySocio(this.partner.id).subscribe({
        next: (mensualidades) => {
          console.log('Mensualidades recibidas:', mensualidades);
          this.partner!.suscripciones = mensualidades.map(m => this.mapMensualidadToSubscription(m));
          console.log('Suscripciones mapeadas:', this.partner!.suscripciones);
        },
        error: (error) => {
          console.error('Error al cargar mensualidades:', error);
        }
      });
    } else {
      console.log('Partner no válido para cargar mensualidades:', this.partner);
    }
  }

  mapMensualidadToSubscription(mensualidad: any): any {
    return {
      id: mensualidad.id,
      fecha: new Date(mensualidad.fecha),
      descripcion: mensualidad.descrip,
      importe: mensualidad.importe,
      descuento: mensualidad.descuento,
      total: mensualidad.total,
      pagado: mensualidad.pagado === 1,
      saldo: mensualidad.saldo,
      fechaPago: mensualidad.fecpago ? new Date(mensualidad.fecpago) : undefined,
      cancelado: mensualidad.cancelado === 1,
      motivo: mensualidad.motivo || undefined,
      factura: mensualidad.factura || undefined,
      esInscripcion: mensualidad.inscrip === 1
    };
  }

  get assignedClasses(): any[] {
    return this.partner ? this.partner.clases : this.temporaryClasses;
  }

  initForm(): void {
    this.partnerForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      correo: ['', [Validators.required, Validators.email]],
      sexo: ['M', Validators.required],
      fechaNacimiento: ['', Validators.required],
      estatus: [PartnerStatus.ACTIVO, Validators.required],
      becado: [false],
      periodicidad: [PaymentPeriod.MENSUAL, Validators.required],
      comentarios: [''],
      montoInscripcion: [0, [Validators.min(0)]],
      descuentoInscripcion: [0, [Validators.min(0)]],
      metodoPago: ['']
    });
  }

  loadPartnerData(): void {
    if (this.partner) {
      this.partnerForm.patchValue({
        nombre: this.partner.nombre,
        telefono: this.partner.telefono,
        correo: this.partner.correo,
        sexo: this.partner.sexo,
        fechaNacimiento: this.formatDateForInput(this.partner.fechaNacimiento),
        estatus: this.partner.estatus,
        becado: this.partner.becado,
        periodicidad: this.partner.periodicidad,
        comentarios: this.partner.comentarios
      });

      // Cargar clase asignada si existe
      this.loadClaseAsignada();
    }
  }

  loadClaseAsignada(): void {
    // Obtener el partner RAW desde la API para tener el campo clases sin mapear
    if (this.partner && this.partner.id > 0) {
      console.log('Cargando clase asignada para socio ID:', this.partner.id);
      this.partnersService.getPartnerRawById(this.partner.id).subscribe({
        next: (socioRaw: any) => {
          console.log('Datos RAW del socio:', socioRaw);
          console.log('Campo clases:', socioRaw.clases);
          
          const claseId = this.extractClaseId(socioRaw);
          console.log('ID de clase extraído:', claseId);
          
          if (claseId) {
            this.partnersService.getClaseDetails(claseId).subscribe({
              next: (clase) => {
                console.log('Clase obtenida:', clase);
                const claseAsignada = this.mapClaseToPartnerClass(clase, this.partner!.periodicidad);
                console.log('Clase mapeada:', claseAsignada);
                this.partner!.clases = [claseAsignada];
              },
              error: (error) => console.error('Error al cargar clase:', error)
            });
          } else {
            console.log('No hay clase asignada para este socio');
          }
        },
        error: (error) => console.error('Error al obtener datos del socio:', error)
      });
    }
  }

  extractClaseId(partnerData: any): number | null {
    // El campo clases del SQL puede ser un string con formato ",005"
    if (partnerData.clases && partnerData.clases.trim() !== '') {
      // Eliminar comas y espacios, luego parsear
      const cleanedClases = partnerData.clases.replace(/,/g, '').trim();
      if (cleanedClases === '') return null;
      
      const claseId = parseInt(cleanedClases, 10);
      return isNaN(claseId) || claseId === 0 ? null : claseId;
    }
    return null;
  }

  mapClaseToPartnerClass(clase: any, periodicidad: any): any {
    // Obtener precio según periodicidad
    let precio = 0;
    let descuento = 0;

    switch (periodicidad) {
      case 'Semanal':
        precio = clase.prsem || 0;
        descuento = clase.descsem || 0;
        break;
      case 'Quincenal':
        precio = clase.prqna || 0;
        descuento = clase.descqna || 0;
        break;
      case 'Mensual':
        precio = clase.prmes || 0;
        descuento = clase.descmes || 0;
        break;
      case 'Trimestral':
        precio = clase.prtrim || 0;
        descuento = clase.desctrim || 0;
        break;
      case 'Semestral':
        precio = clase.prstre || 0;
        descuento = clase.descstre || 0;
        break;
      case 'Anual':
        precio = clase.pranual || 0;
        descuento = clase.descanual || 0;
        break;
      default:
        precio = clase.prmes || 0;
        descuento = clase.descmes || 0;
    }

    return {
      id: clase.id,
      nombre: clase.nomclase,
      categoria: clase.nomclase,
      horario: 'Por definir',
      instructor: 'Por asignar',
      dias: [],
      precio: precio,
      descuento: descuento
    };
  }

  formatDateForInput(date: Date): string {
    const d = new Date(date);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + month + '-' + day;
  }

  setActiveTab(tab: 'datos' | 'suscripciones' | 'ventas'): void {
    this.activeTab = tab;
  }

  calculateTotal(): void {
    const monto = this.partnerForm.get('montoInscripcion')?.value || 0;
    const descuento = this.partnerForm.get('descuentoInscripcion')?.value || 0;
    this.totalInscripcion = monto; // Ya no se resta el descuento aquí
  }

  getTotalClases(): number {
    return this.assignedClasses.reduce((sum, clase) => sum + (clase.total || 0), 0);
  }

  getSubtotal(): number {
    return this.totalInscripcion + this.getTotalClases();
  }

  getDescuentoGeneral(): number {
    return this.partnerForm.get('descuentoInscripcion')?.value || 0;
  }

  getGranTotal(): number {
    return Math.max(0, this.getSubtotal() - this.getDescuentoGeneral());
  }

  openClassAssignment(): void {
    if (!this.partner) {
      // Crear un partner temporal para el modal de asignación
      const tempPartner: Partner = {
        id: 0,
        nombre: this.partnerForm.get('nombre')?.value || 'Nuevo Socio',
        telefono: this.partnerForm.get('telefono')?.value || '',
        correo: this.partnerForm.get('correo')?.value || '',
        sexo: this.partnerForm.get('sexo')?.value || 'M',
        fechaNacimiento: this.partnerForm.get('fechaNacimiento')?.value || new Date(),
        estatus: this.partnerForm.get('estatus')?.value || PartnerStatus.ACTIVO,
        saldo: 0,
        becado: this.partnerForm.get('becado')?.value || false,
        fechaRegistro: new Date(),
        periodicidad: this.partnerForm.get('periodicidad')?.value || PaymentPeriod.MENSUAL,
        clases: this.temporaryClasses,
        suscripciones: [],
        ventas: [],
        comentarios: this.partnerForm.get('comentarios')?.value
      };
      this.partner = tempPartner;
    }
    this.showClassAssignmentModal = true;
  }

  closeClassAssignment(): void {
    this.showClassAssignmentModal = false;
    // Si era un partner temporal, guardar las clases y limpiar el partner
    if (this.partner && this.partner.id === 0) {
      this.temporaryClasses = this.partner.clases;
      this.partner = undefined;
    }
  }

  onSubmit(): void {
    if (this.partnerForm.valid) {
      const formValue = this.partnerForm.value;
      
      if (this.partner && this.partner.id !== 0) {
        // Actualizar socio existente
        this.partnersService.updatePartner(this.partner.id, formValue).subscribe(() => {
          this.close.emit();
        });
      } else {
        // Crear nuevo socio con clases temporales y cobro de inscripción
        const newPartnerData = {
          ...formValue,
          clases: this.temporaryClasses,
          fechaRegistro: new Date(),
          pagoInscripcion: {
            monto: formValue.montoInscripcion,
            descuento: formValue.descuentoInscripcion,
            total: this.totalInscripcion,
            metodoPago: formValue.metodoPago
          }
        };
        
        console.log('Creando nuevo socio con datos:', newPartnerData);
        
        this.partnersService.createPartner(newPartnerData).subscribe({
          next: (response) => {
            console.log('Socio creado exitosamente:', response);
            
            // Crear datos del ticket
            this.ticketData = {
              socioNombre: formValue.nombre,
              socioId: response.id || 0,
              fecha: new Date(),
              montoInscripcion: formValue.montoInscripcion || 0,
              totalClases: this.getTotalClases(),
              clases: this.temporaryClasses.map((c: any) => ({
                nombre: c.nombre,
                periodicidad: c.periodicidad,
                total: c.total || 0
              })),
              subtotal: this.getSubtotal(),
              descuento: formValue.descuentoInscripcion || 0,
              total: this.getGranTotal(),
              metodoPago: formValue.metodoPago || 'No especificado'
            };
            
            // Mostrar ticket modal en lugar de cerrar inmediatamente
            this.showTicketModal = true;
          },
          error: (error) => {
            console.error('Error al crear socio:', error);
            alert('Error al crear socio: ' + (error.error?.message || error.message));
          }
        });
      }
    } else {
      this.markFormGroupTouched(this.partnerForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  onCancel(): void {
    this.close.emit();
  }

  closeTicketModal(): void {
    this.showTicketModal = false;
    this.ticketData = null;
    this.close.emit();
  }

  onDelete(): void {
    if (!this.partner || this.partner.id === 0) return;

    const confirmacion = confirm(
      `¿Estás seguro de eliminar al socio "${this.partner.nombre}"?\n\n` +
      `Esta acción NO se puede deshacer y eliminará:\n` +
      `- Datos del socio\n` +
      `- Clases asignadas\n` +
      `- Historial de suscripciones\n` +
      `- Historial de ventas\n\n` +
      `¿Deseas continuar?`
    );

    if (confirmacion) {
      this.partnersService.deletePartner(this.partner.id).subscribe({
        next: () => {
          alert('Socio eliminado exitosamente');
          this.close.emit();
        },
        error: (error) => {
          console.error('Error al eliminar socio:', error);
          alert('Error al eliminar socio: ' + (error.error?.message || error.message));
        }
      });
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + month + '-' + day;
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

  isFieldInvalid(fieldName: string): boolean {
    const field = this.partnerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.partnerForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['email']) return 'Correo electrónico inválido';
      if (field.errors['pattern']) return 'Formato inválido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    }
    return '';
  }
}
