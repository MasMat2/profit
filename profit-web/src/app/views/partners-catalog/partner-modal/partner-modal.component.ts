import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
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
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ConfirmationModalComponent, ClassAssignmentModalComponent, PaymentTicketModalComponent, FingerprintModalComponent],
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
  selectedPeriodicidad: PaymentPeriod = PaymentPeriod.MENSUAL;
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
  showReactivationClassModal: boolean = false;
  availableClasses: any[] = [];
  selectedReactivationClass: any = null;
  showEditFechaModal: boolean = false;
  mensualidadEditando: any = null;
  editFechaForm!: FormGroup;
  showChangeClassModal: boolean = false;
  claseACambiar: any = null;
  availableClassesForChange: any[] = [];
  selectedNewClass: any = null;
  changeClassForm!: FormGroup;

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
    this.initEditFechaForm();
    this.initChangeClassForm();
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
    if (this.partner && (this.partner.socio > 0 || this.partner.id > 0)) {
      console.log('🔄 Cargando mensualidades para socio:', {
        id: this.partner.id,
        socio: this.partner.socio,
        nombre: this.partner.nombre
      });
      
      this.loadingSubscriptions = true;
      const socioId = this.partner.socio > 0 ? this.partner.socio : this.partner.id;
      
      this.partnersService.getMensualidadesBySocio(socioId).subscribe({
        next: (mensualidades) => {
          console.log('📊 Mensualidades cargadas:', mensualidades.length);
          this.partner!.suscripciones = mensualidades.map(m => this.mapMensualidadToSubscription(m));
          this.loadingSubscriptions = false;
        },
        error: (error) => {
          console.error('Error al cargar mensualidades:', error);
          this.loadingSubscriptions = false;
        }
      });
    } else {
      console.log('⚠️ No se pueden cargar mensualidades - partner inválido:', this.partner);
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
        precio = parseFloat(clase.prsem || 0);
        descuento = parseFloat(clase.descsem || 0);
        break;
      case 'Quincenal':
        precio = parseFloat(clase.prqna || 0);
        descuento = parseFloat(clase.descqna || 0);
        break;
      case 'Mensual':
        precio = parseFloat(clase.prmes || 0);
        descuento = parseFloat(clase.descmes || 0);
        break;
      case 'Trimestral':
        precio = parseFloat(clase.prtrim || 0);
        descuento = parseFloat(clase.desctrim || 0);
        break;
      case 'Semestral':
        precio = parseFloat(clase.prstre || 0);
        descuento = parseFloat(clase.descstre || 0);
        break;
      case 'Anual':
        precio = parseFloat(clase.pranual || 0);
        descuento = parseFloat(clase.descanual || 0);
        break;
      default:
        precio = parseFloat(clase.prmes || 0);
        descuento = parseFloat(clase.descmes || 0);
    }

    // Calcular total
    const total = precio - descuento;

    console.log('📊 Mapeo de clase:', {
      nombre: clase.nomclase,
      periodicidad,
      precio,
      descuento,
      total
    });

    return {
      id: clase.id,
      nombre: clase.nomclase,
      categoria: clase.nomclase,
      horario: 'Por definir',
      instructor: 'Por asignar',
      dias: [],
      precio: precio,
      descuento: descuento,
      total: total,
      periodicidad: periodicidad || 'Mensual'
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
        periodicidad: this.selectedPeriodicidad || PaymentPeriod.MENSUAL, // Usar periodicidad seleccionada si existe
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
    // Si era un partner temporal, guardar las clases y periodicidad
    if (this.partner && this.partner.id === 0) {
      this.temporaryClasses = this.partner.clases;
      this.selectedPeriodicidad = this.partner.periodicidad;
      this.partner = undefined;
    }
    // Actualizar el monto de inscripción según la configuración de las clases
    this.actualizarMontoInscripcion();
  }

  private actualizarMontoInscripcion(): void {
    const montoInscripcion = this.assignedClasses
      .filter((clase: any) => clase.cobrarInscripcion)
      .reduce((sum, clase: any) => sum + (clase.montoInscripcion || 0), 0);
    
    this.partnerForm.patchValue({ montoInscripcion }, { emitEvent: false });
    this.calculateTotal();
  }

  onSubmit(): void {
    if (this.partnerForm.valid) {
      const formValue = this.partnerForm.value;
      
      if (this.partner && this.partner.id !== 0) {
        // Actualizar socio existente: preservar el estatus actual
        this.partnersService.updatePartner(this.partner.id, {
          ...formValue,
          estatus: this.partner.estatus
        }).subscribe(() => {
          this.close.emit();
        });
      } else {
        // Crear nuevo socio con clases temporales, cobro de inscripción y huella digital
        const newPartnerData = {
          ...formValue,
          estatus: formValue.becado ? PartnerStatus.BECADO : PartnerStatus.ACTIVO,
          periodicidad: this.selectedPeriodicidad,
          clases: this.temporaryClasses,
          fechaRegistro: new Date(),
          huella: this.fingerprintData,
          pagoInscripcion: {
            monto: formValue.montoInscripcion,
            descuento: formValue.descuentoInscripcion,
            total: this.getGranTotal(),
            metodoPago: formValue.metodoPago
          }
        };
        
        console.log('Periodicidad seleccionada:', this.selectedPeriodicidad);
        console.log('Total clases:', this.getTotalClases());
        console.log('Gran total:', this.getGranTotal());
        console.log('Creando nuevo socio con datos:', newPartnerData);
        if (this.fingerprintData) {
          console.log('Huella digital incluida:', this.fingerprintData);
        }
        
        this.partnersService.createPartner(newPartnerData).subscribe({
          next: (response) => {
            console.log('Socio creado exitosamente:', response);
            
            // Actualizar el objeto partner con los datos completos del socio creado
            this.partner = response;
            
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
    
    // Si es un socio nuevo, cargar sus mensualidades antes de cerrar
    if (this.partner && this.partner.socio > 0) {
      console.log('🔄 Cargando mensualidades del nuevo socio antes de cerrar...');
      this.loadMensualidades();
    }
    
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
    
    // Cargar clases disponibles y mostrar modal de selección
    this.loadAvailableClasses();
    this.showReactivationClassModal = true;
  }

  loadAvailableClasses(): void {
    this.partnersService.getActiveClasses().subscribe({
      next: (classes: any[]) => {
        this.availableClasses = classes;
      },
      error: (error: any) => {
        console.error('Error al cargar clases disponibles:', error);
      }
    });
  }

  confirmReactivacionConClase(): void {
    if (!this.selectedReactivationClass) {
      alert('Por favor seleccione una clase para asignar al socio.');
      return;
    }

    if (!confirm(`¿Está seguro que desea reactivar a este socio con la clase "${this.selectedReactivationClass.nomclase}"?`)) {
      return;
    }

    // Por ahora usamos un ID de usuario fijo (1), en una implementación real debería venir del servicio de autenticación
    const usuarioId = 1;
    
    console.log('🔍 Enviando reactivación con clase:', this.selectedReactivationClass);
    console.log('🔍 claseId a enviar:', this.selectedReactivationClass?.id);
    
    this.partnersService.reactivarSocio(this.partner!.socio, usuarioId, this.selectedReactivationClass.id).subscribe({
      next: (updatedPartner) => {
        this.partner = updatedPartner;
        console.log('Socio reactivado exitosamente:', updatedPartner);
        
        // Recargar mensualidades y clases para mostrar los cambios
        if (this.activeTab === 'suscripciones') {
          this.loadMensualidades();
        }
        
        // Recargar clases asignadas
        this.loadClaseAsignada();
        
        // Mostrar confirmación sin cerrar el modal
        this.confirmationService.confirm({
          title: 'Socio Reactivado',
          message: `Socio reactivado exitosamente. Se ha asignado la clase "${this.selectedReactivationClass.nomclase}", las mensualidades pasadas han sido condonadas y se ha generado una nueva mensualidad.`,
          type: 'success',
          confirmText: 'Aceptar'
        }).subscribe();
        
        // Cerrar solo el modal de selección de clase, mantener el modal principal abierto
        this.showReactivationClassModal = false;
        this.selectedReactivationClass = null;
      },
      error: (error) => {
        console.error('Error al reactivar al socio:', error);
        this.confirmationService.confirm({
          title: 'Error',
          message: 'Error al reactivar al socio. Por favor intente nuevamente.',
          type: 'error',
          confirmText: 'Aceptar'
        }).subscribe();
      }
    });
  }

  cancelReactivacion(): void {
    this.showReactivationClassModal = false;
    this.selectedReactivationClass = null;
  }

  selectClase(clase: any): void {
    console.log('🎯 Clase seleccionada:', clase);
    console.log('🎯 clase.clase:', clase.clase);
    console.log('🎯 clase.id:', clase.id);
    console.log('🎯 Propiedades completas:', Object.keys(clase));
    this.selectedReactivationClass = clase;
  }

  initCobroForm(): void {
    this.cobroForm = this.fb.group({
      formaPago: ['', Validators.required],
      descuento: [0, [Validators.min(0)]],
      referencia: [''],
      motivoDescuento: ['']
    });
  }

  initEditFechaForm(): void {
    this.editFechaForm = this.fb.group({
      nuevaFecha: [null, Validators.required]
    });
  }

  initChangeClassForm(): void {
    this.changeClassForm = this.fb.group({
      nuevaClase: [null, Validators.required],
      nuevoImporte: [null, Validators.required]
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

  onEditarFechaMensualidad(mensualidad: any): void {
    this.mensualidadEditando = mensualidad;
    this.editFechaForm.patchValue({
      nuevaFecha: this.formatDateForInput(mensualidad.fecha)
    });
    this.showEditFechaModal = true;
  }

  closeEditFechaModal(): void {
    this.showEditFechaModal = false;
    this.mensualidadEditando = null;
    this.editFechaForm.reset();
  }

  onSaveFecha(): void {
    if (this.editFechaForm.valid && this.mensualidadEditando) {
      const nuevaFecha = this.editFechaForm.get('nuevaFecha')?.value;
      console.log('📅 Fecha seleccionada en frontend:', nuevaFecha);
      
      // Asegurarse de que la fecha esté en formato YYYY-MM-DD
      const fechaFormateada = new Date(nuevaFecha).toISOString().split('T')[0];
      console.log('📅 Fecha formateada para backend:', fechaFormateada);
      
      this.partnersService.actualizarFechaMensualidad(
        this.mensualidadEditando.idMens,
        fechaFormateada,
        1 // TODO: Obtener ID del usuario actual
      ).subscribe({
        next: (response) => {
          console.log('Fecha actualizada exitosamente:', response);
          this.closeEditFechaModal();
          this.loadMensualidades(); // Recargar las mensualidades
          this.confirmationService.confirm({
            title: 'Fecha Actualizada',
            message: response.message || 'La fecha de pago se ha actualizado correctamente.',
            type: 'success',
            confirmText: 'Aceptar'
          }).subscribe();
        },
        error: (error) => {
          console.error('Error al actualizar fecha:', error);
          this.confirmationService.confirm({
            title: 'Error',
            message: 'No se pudo actualizar la fecha. ' + (error.error?.message || error.message),
            type: 'error',
            confirmText: 'Aceptar'
          }).subscribe();
        }
      });
    }
  }

  puedeCobrarse(mensualidad: any): boolean {
    const pagado = mensualidad.pagado === 0 || mensualidad.pagado === false || !mensualidad.pagado;
    const cancelado = mensualidad.cancelado === 0 || mensualidad.cancelado === false || !mensualidad.cancelado;
    const saldo = parseFloat(mensualidad.saldo || 0);
    const total = parseFloat(mensualidad.total || 0);
    const importe = parseFloat(mensualidad.importe || 0);
    const tieneMonto = saldo > 0 || total > 0 || importe > 0;
    
    const resultado = pagado && cancelado && tieneMonto;
    
    console.log('🔍 Validación cobro:', {
      idmens: mensualidad.idmens,
      pagado: mensualidad.pagado,
      cancelado: mensualidad.cancelado,
      saldo: mensualidad.saldo,
      total: mensualidad.total,
      importe: mensualidad.importe,
      validaciones: { pagado, cancelado, tieneMonto },
      puedeCobrarse: resultado
    });
    
    return resultado;
  }

  onCobrarMensualidad(mensualidad: any): void {
    console.log('💰 Abriendo modal de cobro para:', mensualidad);
    this.mensualidadACobrar = mensualidad;
    this.cobroForm.patchValue({
      descuento: mensualidad.descuento || 0,
      referencia: '',
      motivoDescuento: ''
    });
    this.showCobroModal = true;
  }

  onChangeClass(clase: any): void {
    this.claseACambiar = clase;
    this.loadAvailableClassesForChange();
    this.changeClassForm.patchValue({
      nuevoImporte: 0
    });
    this.showChangeClassModal = true;
  }

  loadAvailableClassesForChange(): void {
    this.partnersService.getActiveClasses().subscribe({
      next: (classes: any[]) => {
        // Filtrar la clase actual para que no aparezca en las opciones
        this.availableClassesForChange = classes.filter(c => c.id !== this.claseACambiar.id);
      },
      error: (error: any) => {
        console.error('Error al cargar clases disponibles:', error);
      }
    });
  }

  closeChangeClassModal(): void {
    this.showChangeClassModal = false;
    this.claseACambiar = null;
    this.selectedNewClass = null;
    this.changeClassForm.reset();
  }

  onSelectNewClass(clase: any): void {
    this.selectedNewClass = clase;
    // Intentar obtener el precio de diferentes campos posibles
    const nuevoImporte = parseFloat(clase.preciomes || clase.prmes || clase.precio || '0');
    this.changeClassForm.patchValue({
      nuevaClase: clase.clase,
      nuevoImporte: nuevoImporte
    });
    console.log('Clase seleccionada:', clase);
    console.log('Nuevo importe:', nuevoImporte);
    console.log('Campos de precio disponibles:', {
      preciomes: clase.preciomes,
      prmes: clase.prmes,
      precio: clase.precio
    });
  }

  onSaveChangeClass(): void {
    if (!this.selectedNewClass) {
      this.confirmationService.confirm({
        title: 'Advertencia',
        message: 'Por favor selecciona una clase antes de continuar.',
        type: 'warning',
        confirmText: 'Aceptar'
      }).subscribe();
      return;
    }

    if (this.changeClassForm.valid && this.claseACambiar && this.selectedNewClass) {
      const nuevaClaseId = this.changeClassForm.get('nuevaClase')?.value;
      const nuevoImporte = this.changeClassForm.get('nuevoImporte')?.value;
      
      console.log('Cambiando clase:', {
        socioId: this.partner!.socio,
        nuevaClaseId,
        nuevoImporte,
        claseAnterior: this.claseACambiar,
        claseNueva: this.selectedNewClass
      });
      
      this.partnersService.cambiarClaseSocio(
        this.partner!.socio,
        1, // TODO: Obtener ID del usuario actual
        nuevaClaseId,
        nuevoImporte
      ).subscribe({
        next: (response) => {
          console.log('Clase cambiada exitosamente:', response);
          this.closeChangeClassModal();
          this.loadClaseAsignada(); // Recargar clases asignadas
          this.loadMensualidades(); // Recargar mensualidades
          this.confirmationService.confirm({
            title: 'Clase Cambiada',
            message: `La clase ha sido cambiada exitosamente de "${this.claseACambiar.nombre || this.claseACambiar.nomclase}" a "${this.selectedNewClass.nomclase}".`,
            type: 'success',
            confirmText: 'Aceptar'
          }).subscribe();
        },
        error: (error) => {
          console.error('Error al cambiar clase:', error);
          this.confirmationService.confirm({
            title: 'Error',
            message: 'No se pudo cambiar la clase. ' + (error.error?.message || error.message),
            type: 'error',
            confirmText: 'Aceptar'
          }).subscribe();
        }
      });
    }
  }


  closeCobroModal(): void {
    this.showCobroModal = false;
    this.mensualidadACobrar = null;
    this.cobroForm.reset();
  }

  procesarCobro(): void {
    console.log('🔍 Iniciando proceso de cobro');
    console.log('Mensualidad a cobrar:', this.mensualidadACobrar);
    console.log('Formulario válido:', this.cobroForm.valid);
    console.log('Valores del formulario:', this.cobroForm.value);
    
    if (!this.mensualidadACobrar) {
      console.error('❌ No hay mensualidad seleccionada');
      return;
    }
    
    if (this.cobroForm.invalid) {
      console.error('❌ Formulario inválido');
      console.log('Errores del formulario:', this.cobroForm.errors);
      return;
    }

    const cobroData = {
      idMens: this.mensualidadACobrar.idmens || this.mensualidadACobrar.idMens,
      formaPago: this.cobroForm.get('formaPago')?.value,
      descuento: this.cobroForm.get('descuento')?.value || 0,
      referencia: this.cobroForm.get('referencia')?.value || '',
      motivoDescuento: this.cobroForm.get('motivoDescuento')?.value || '',
      usuarioId: 1 // ID de usuario fijo por ahora
    };

    console.log('📤 Datos de cobro a enviar:', cobroData);

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
