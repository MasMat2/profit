import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Partner, PartnerStatus, PaymentPeriod, FingerprintData } from '../../../models/partner.model';
import { PartnersService } from '../../../services/partners.service';
import { ConfirmationService } from '../../../services/confirmation.service';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { ClassAssignmentModalComponent } from '../class-assignment-modal/class-assignment-modal.component';
import { PaymentTicketModalComponent, PaymentTicket } from '../payment-ticket-modal/payment-ticket-modal.component';
import { FingerprintModalComponent } from '../fingerprint-modal/fingerprint-modal.component';

@Component({
  selector: 'app-partner-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmationModalComponent, ClassAssignmentModalComponent, PaymentTicketModalComponent, FingerprintModalComponent],
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
  loadingSubscriptions: boolean = false;
  fingerprintData: FingerprintData | null = null;
  showFingerprintModal: boolean = false;
  showCobroModal: boolean = false;
  mensualidadACobrar: any = null;
  cobroForm!: FormGroup;
  formasPago: any[] = [];

  PartnerStatus = PartnerStatus;
  PaymentPeriod = PaymentPeriod;
  availableStatuses = Object.values(PartnerStatus);
  availablePeriods = Object.values(PaymentPeriod);

  constructor(
    private fb: FormBuilder,
    private partnersService: PartnersService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.initCobroForm();
    this.loadFormasPago();
    if (this.partner) {
      this.loadPartnerData();
      this.loadMensualidades();
      this.loadHuellaExistente();
    }
  }

  loadHuellaExistente(): void {
    if (this.partner && this.partner.id > 0) {
      this.partnersService.getHuellaBySocio(this.partner.id).subscribe({
        next: (huella) => {
          if (huella && huella.huella) {
            this.fingerprintData = {
              fmd: huella.huella,
              image: '',
              quality: 100,
              captured: true,
              fechaRegistro: huella.fecnvo ? new Date(huella.fecnvo) : undefined
            };
            console.log('Huella existente cargada:', this.fingerprintData);
          }
        },
        error: (error) => {
          console.log('No se encontró huella para este socio o error:', error);
        }
      });
    }
  }

  loadMensualidades(): void {
    if (this.partner && this.partner.id > 0) {
      this.loadingSubscriptions = true;
      this.partnersService.getMensualidadesBySocio(this.partner.id).subscribe({
        next: (mensualidades) => {
          this.partner!.suscripciones = mensualidades.map(m => this.mapMensualidadToSubscription(m));
          this.loadingSubscriptions = false;
        },
        error: (error) => {
          console.error('Error al cargar mensualidades:', error);
          this.loadingSubscriptions = false;
        }
      });
    }
  }

  mapMensualidadToSubscription(mensualidad: any): any {
    return {
      id: mensualidad.id,
      idMens: mensualidad.idmens, // Agregar campo idMens para el cobro
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
      becado: [false],
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
        becado: this.partner.becado,
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
    if (tab === 'suscripciones' && this.partner && this.partner.id > 0) {
      this.loadMensualidades();
    }
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
        socio: 0, // Número de socio temporal
        nombre: this.partnerForm.get('nombre')?.value || 'Nuevo Socio',
        telefono: this.partnerForm.get('telefono')?.value || '',
        correo: this.partnerForm.get('correo')?.value || '',
        sexo: this.partnerForm.get('sexo')?.value || 'M',
        fechaNacimiento: this.partnerForm.get('fechaNacimiento')?.value || new Date(),
        estatus: PartnerStatus.ACTIVO, // Valor por defecto para nuevos socios
        saldo: 0,
        becado: this.partnerForm.get('becado')?.value || false,
        fechaRegistro: new Date(),
        periodicidad: PaymentPeriod.MENSUAL, // Valor por defecto aunque no se muestre en formulario
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
        // Crear nuevo socio con clases temporales, cobro de inscripción y huella digital
        const newPartnerData = {
          ...formValue,
          clases: this.temporaryClasses,
          fechaRegistro: new Date(),
          huella: this.fingerprintData,
          pagoInscripcion: {
            monto: formValue.montoInscripcion,
            descuento: formValue.descuentoInscripcion,
            total: this.totalInscripcion,
            metodoPago: formValue.metodoPago
          }
        };
        
        console.log('Creando nuevo socio con datos:', newPartnerData);
        if (this.fingerprintData) {
          console.log('Huella digital incluida:', this.fingerprintData);
        }
        
        this.partnersService.createPartner(newPartnerData).subscribe({
          next: (response) => {
            console.log('Socio creado exitosamente:', response);
            
            // Guardar huella digital si existe
            if (this.fingerprintData && response.id) {
              this.partnersService.guardarHuella(response.id, this.fingerprintData).subscribe({
                next: () => {
                  console.log('Huella digital guardada exitosamente');
                },
                error: (error) => {
                  console.error('Error al guardar huella:', error);
                }
              });
            }
            
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

  onFingerprintCaptured(fingerprintData: FingerprintData): void {
    this.fingerprintData = {
      ...fingerprintData,
      fechaRegistro: new Date()
    };
    console.log('Huella capturada:', this.fingerprintData);

    // Si es un socio existente, guardar huella inmediatamente
    if (this.partner && this.partner.id > 0) {
      this.guardarHuellaExistente();
    }
  }

  onFingerprintCleared(): void {
    // Si es un socio existente, eliminar de la BD
    if (this.partner && this.partner.id > 0) {
      this.eliminarHuellaExistente();
    } else {
      this.fingerprintData = null;
      console.log('Huella eliminada');
    }
  }

  guardarHuellaExistente(): void {
    if (!this.partner || this.partner.id === 0 || !this.fingerprintData) return;

    this.partnersService.guardarHuella(this.partner.id, this.fingerprintData).subscribe({
      next: (response) => {
        console.log('Huella guardada exitosamente:', response);
        alert('Huella digital registrada exitosamente');
      },
      error: (error) => {
        console.error('Error al guardar huella:', error);
        alert('Error al guardar huella digital: ' + (error.error?.message || error.message));
      }
    });
  }

  eliminarHuellaExistente(): void {
    if (!this.partner || this.partner.id === 0) return;

    this.partnersService.eliminarHuella(this.partner.id).subscribe({
      next: () => {
        this.fingerprintData = null;
        console.log('Huella eliminada');
      },
      error: (error) => {
        console.error('Error al eliminar huella:', error);
      }
    });
  }

  openFingerprintModal(): void {
    this.showFingerprintModal = true;
  }

  closeFingerprintModal(): void {
    this.showFingerprintModal = false;
  }

  onDarDeBaja(): void {
    if (!this.partner || this.partner.id === 0) return;
    
    if (confirm('¿Está seguro que desea dar de baja a este socio?')) {
      // Por ahora usamos un ID de usuario fijo (1), en una implementación real debería venir del servicio de autenticación
      const usuarioId = 1;
      
      this.partnersService.darDeBajaSocio(this.partner.socio, usuarioId).subscribe({
        next: (updatedPartner) => {
          this.partner = updatedPartner;
          console.log('Socio dado de baja exitosamente:', updatedPartner);
          alert('Socio dado de baja exitosamente');
          this.close.emit();
        },
        error: (error) => {
          console.error('Error al dar de baja al socio:', error);
          alert('Error al dar de baja al socio. Por favor intente nuevamente.');
        }
      });
    }
  }

  onReactivar(): void {
    if (!this.partner || this.partner.id === 0) return;
    
    if (confirm('¿Está seguro que desea reactivar a este socio?')) {
      // Por ahora usamos un ID de usuario fijo (1), en una implementación real debería venir del servicio de autenticación
      const usuarioId = 1;
      
      this.partnersService.reactivarSocio(this.partner.socio, usuarioId).subscribe({
        next: (updatedPartner) => {
          this.partner = updatedPartner;
          console.log('Socio reactivado exitosamente:', updatedPartner);
          alert('Socio reactivado exitosamente');
          this.close.emit();
        },
        error: (error) => {
          console.error('Error al reactivar al socio:', error);
          alert('Error al reactivar al socio. Por favor intente nuevamente.');
        }
      });
    }
  }

  initCobroForm(): void {
    this.cobroForm = this.fb.group({
      formaPago: ['', Validators.required],
      descuento: [0, [Validators.min(0)]],
      referencia: [''],
      motivoDescuento: ['']
    });
  }

  loadFormasPago(): void {
    this.partnersService.getFormasPago().subscribe({
      next: (formas) => {
        this.formasPago = formas;
      },
      error: (error) => {
        console.error('Error al cargar formas de pago:', error);
      }
    });
  }

  onCobrarMensualidad(mensualidad: any): void {
    this.mensualidadACobrar = mensualidad;
    this.cobroForm.patchValue({
      descuento: mensualidad.descuento || 0,
      referencia: '',
      motivoDescuento: ''
    });
    this.showCobroModal = true;
  }

  closeCobroModal(): void {
    this.showCobroModal = false;
    this.mensualidadACobrar = null;
    this.cobroForm.reset();
  }

  procesarCobro(): void {
    if (!this.mensualidadACobrar || this.cobroForm.invalid) return;

    const cobroData = {
      idMens: this.mensualidadACobrar.idMens,
      formaPago: this.cobroForm.get('formaPago')?.value,
      descuento: this.cobroForm.get('descuento')?.value || 0,
      referencia: this.cobroForm.get('referencia')?.value || '',
      motivoDescuento: this.cobroForm.get('motivoDescuento')?.value || '',
      usuarioId: 1 // ID de usuario fijo por ahora
    };

    this.partnersService.cobrarMensualidad(cobroData).subscribe({
      next: (response) => {
        console.log('Cobro procesado exitosamente:', response);
        this.confirmationService.confirm({
          title: '¡Cobro Exitoso!',
          message: 'La mensualidad ha sido cobrada correctamente.',
          type: 'success',
          confirmText: 'Aceptar'
        }).subscribe(() => {
          this.closeCobroModal();
          // Recargar las mensualidades para actualizar la tabla
          this.loadMensualidades();
        });
      },
      error: (error) => {
        console.error('Error al procesar cobro:', error);
        this.confirmationService.confirm({
          title: 'Error en el Cobro',
          message: 'No se pudo procesar el cobro. Por favor intente nuevamente.',
          type: 'error',
          confirmText: 'Aceptar'
        }).subscribe();
      }
    });
  }

  calcularTotalConDescuento(): number {
    const importe = this.mensualidadACobrar?.importe || 0;
    const descuento = this.cobroForm.get('descuento')?.value || 0;
    return Math.max(0, importe - descuento);
  }
}
