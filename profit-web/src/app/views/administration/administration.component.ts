import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BusinessInfoService, BusinessInfo } from '../../services/business-info.service';
import { UsersService, User, CreateUserDto, UpdateUserDto } from '../../services/users.service';
import { UserModalComponent } from './user-modal.component';

@Component({
  selector: 'app-administration',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, UserModalComponent],
  templateUrl: './administration.component.html',
  styleUrls: ['./administration.component.css']
})
export class AdministrationComponent implements OnInit {
  activeSection: string = 'empresa'; // 'empresa', 'roles', 'permisos', 'sistema'
  isModalOpen = false;
  editingUser: any = null;
  selectedUserForPermissions: any = null;
  userPermissions: { [userId: number]: { [moduleName: string]: string[] } } = {};
  editandoEmpresa: boolean = false;
  businessInfoOriginal: any = {};

  userSearchTerm: string = '';
  get filteredUsers() {
    if (!this.userSearchTerm) {
      return this.userData;
    }
    const lowerCaseTerm = this.userSearchTerm.toLowerCase();
    return this.userData.filter(user =>
      user.nombre.toLowerCase().includes(lowerCaseTerm) ||
      user.usuario.toLowerCase().includes(lowerCaseTerm) ||
      user.puesto.toLowerCase().includes(lowerCaseTerm)
    );
  }

  businessInfo = {
    name: 'NOMBRE DE SU NEGOCIO',
    address: 'AV. SIEMPRE VIVA 742',
    neighborhood: 'COLONIA',
    cityState: 'CIUDAD, ESTADO',
    phone: 'MI TELEFONO',
    branchNumber: 1,
    logoUrl: 'assets/logo.png.png'
  };

  // Configuración centralizada
  private readonly PERMISSION_MODULES = [
    { name: 'Estadísticas', permissions: ['Ver'] },
    { name: 'Administración', permissions: ['Ver', 'Modificar'] },
    { name: 'Monitor de Acceso', permissions: ['Ver'] },
    { name: 'Acceso a Clientes', permissions: ['Ver', 'Modificar'] },
    { name: 'Categoría / Planes', permissions: ['Ver', 'Crear', 'Modificar', 'Eliminar'] },
    { name: 'Inscribir Cliente', permissions: ['Ver', 'Crear', 'Modificar'] },
    { name: 'Gestionar Clientes', permissions: ['Ver', 'Modificar', 'Eliminar'] },
    { name: 'Gestión de Membresías', permissions: ['Ver', 'Crear', 'Modificar', 'Eliminar'] },
    { name: 'Productos y Stock', permissions: ['Ver', 'Crear', 'Modificar', 'Eliminar'] },
    { name: 'Punto de Venta', permissions: ['Ver', 'Crear', 'Modificar'] },
    { name: 'Carrito de Usuario', permissions: ['Ver', 'Crear', 'Modificar'] }
  ];

  get permissionModules() {
    return this.PERMISSION_MODULES;
  }

  userData: User[] = [];

  systemSettings = {
    openingHours: {
      weekdays: { from: '09:00', to: '18:00' },
      saturdays: { from: '10:00', to: '14:00' },
      sundays: { from: '12:00', to: '12:00' } // Cerrado
    },
    taxRate: 16,
    regional: {
      currencySymbol: '$',
      timezone: 'America/Mexico_City',
      dateFormat: 'dd/MM/yyyy'
    },
    notifications: {
      emailsEnabled: true
    },
    security: {
      sessionTimeout: 30 // en minutos
    }
  };

  constructor(
    private businessInfoService: BusinessInfoService,
    private usersService: UsersService
  ) {}

  public ngOnInit(): void {
    this.loadDefaultPermissions();
    this.cargarInformacionNegocio();
    this.cargarUsuarios();
    this.cargarConfiguracionSistema();
  }

  public guardarInformacionNegocio() {
    const payload: Partial<BusinessInfo> = {
      name: this.businessInfo.name,
      address: this.businessInfo.address,
      neighborhood: this.businessInfo.neighborhood,
      city_state: this.businessInfo.cityState,
      phone: this.businessInfo.phone,
      logo_url: this.businessInfo.logoUrl,
      branch_number: this.businessInfo.branchNumber,
    };
    
    this.businessInfoService.updateBusinessInfo(payload).subscribe({
      next: (res) => {
        console.log('Información del negocio guardada en backend:', res);
        alert('Información del negocio guardada exitosamente.');
        this.editandoEmpresa = false;
      },
      error: (err) => {
        console.error('Error guardando información del negocio:', err);
        // Fallback a localStorage si falla el backend
        localStorage.setItem('businessInfo', JSON.stringify(this.businessInfo));
        alert('Información guardada localmente.');
      }
    });
  }

  public cargarInformacionNegocio() {
    this.businessInfoService.getBusinessInfo().subscribe({
      next: (data) => {
        if (data) {
          this.businessInfo = {
            name: data.name,
            address: data.address || '',
            neighborhood: data.neighborhood || '',
            cityState: data.city_state || '',
            phone: data.phone || '',
            branchNumber: data.branch_number || 1,
            logoUrl: data.logo_url || 'assets/logo.png',
          };
          console.log('Información del negocio cargada desde backend.');
        }
      },
      error: (err) => {
        console.error('Error cargando información del negocio:', err);
        // Fallback a localStorage si falla el backend
        const fallback = localStorage.getItem('businessInfo');
        if (fallback) {
          this.businessInfo = JSON.parse(fallback);
        }
      }
    });
  }

  public toggleEdicionEmpresa() {
    if (!this.editandoEmpresa) {
      // Entrar en modo edición: guardar copia original
      this.businessInfoOriginal = { ...this.businessInfo };
    }
    this.editandoEmpresa = !this.editandoEmpresa;
  }

  public cancelarEdicionEmpresa() {
    // Restaurar valores originales
    this.businessInfo = { ...this.businessInfoOriginal };
    this.editandoEmpresa = false;
  }

  public cargarUsuarios() {
    this.usersService.getUsers().subscribe({
      next: (data) => {
        this.userData = data;
        console.log('Usuarios cargados desde backend.');
        // Actualizar permisos después de cargar usuarios
        this.loadDefaultPermissions();
      },
      error: (err) => {
        console.error('Error cargando usuarios:', err);
        // Fallback a localStorage si falla el backend
        const fallback = localStorage.getItem('userData');
        if (fallback) {
          this.userData = JSON.parse(fallback);
        }
      }
    });
  }

  public cargarConfiguracionSistema() {
    const data = localStorage.getItem('systemSettings');
    if (data) {
      this.systemSettings = JSON.parse(data);
    }
  }

  public selectSection(section: string) {
    this.activeSection = section;
    if (section !== 'permisos') {
      this.selectedUserForPermissions = null; // Deseleccionamos al usuario si salimos de la pestaña de permisos
    }
  }

  // --- Lógica de Permisos simplificada ---
  private initializeUserPermissions(user: User) {
    if (!user.id) return;
    
    const userId = user.id;
    this.userPermissions[userId] = {};
    this.PERMISSION_MODULES.forEach(module => {
      this.userPermissions[userId]![module.name] = [];
    });
    
    // Administrador tiene todos los permisos
    if (user.usuario === 'ADMINISTRADOR') {
      this.PERMISSION_MODULES.forEach(module => {
        this.userPermissions[userId]![module.name] = [...module.permissions];
      });
    }
  }

  private loadDefaultPermissions() {
    this.userData.forEach(user => this.initializeUserPermissions(user));
  }

  public editUserPermissions(user: any) {
    this.selectedUserForPermissions = user;
    this.activeSection = 'permisos';
  }

  public hasPermission(moduleName: string, permission: string): boolean {
    return this.selectedUserForPermissions?.id && 
           this.userPermissions[this.selectedUserForPermissions.id]?.[moduleName]?.includes(permission) || false;
  }

  public togglePermission(moduleName: string, permission: string) {
    if (!this.selectedUserForPermissions?.id) return;
    
    const userId = this.selectedUserForPermissions.id;
    const perms = this.userPermissions[userId][moduleName];
    const index = perms.indexOf(permission);
    
    if (index > -1) {
      perms.splice(index, 1);
    } else {
      perms.push(permission);
    }
  }

  public savePermissions() {
    if (!this.selectedUserForPermissions) {
      alert('No hay un usuario seleccionado.');
      return;
    }
    console.log('Permisos guardados para:', this.selectedUserForPermissions.nombre);
    alert(`Permisos guardados para ${this.selectedUserForPermissions.nombre}`);
  }

  public saveSystemSettings() {
    localStorage.setItem('systemSettings', JSON.stringify(this.systemSettings));
    console.log('Guardando configuración del sistema:', this.systemSettings);
    alert('Configuración del sistema guardada con éxito.');
  }

  public clearCache() {
    alert('Caché del sistema limpiada (simulación).');
  }

  public onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido.');
        return;
      }
      
      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 2MB.');
        return;
      }

      // Convertir a base64
      const reader = new FileReader();
      reader.onload = (e) => {
        this.businessInfo.logoUrl = e.target?.result as string;
        this.guardarInformacionNegocio();
      };
      reader.readAsDataURL(file);
    }
  }

  // --- Lógica del Modal de Usuario ---
  public openModal(user: any = null) {
    this.editingUser = user ? { ...user } : { id: 0, usuario: '', nombre: '', puesto: '', email: '', telefono: '', pc: '', rol: '' };
    this.isModalOpen = true;
  }

  public closeModal() {
    this.isModalOpen = false;
    this.editingUser = null;
  }

  private handleUserOperation(operation: 'create' | 'update') {
    const isCreate = operation === 'create';
    const userData = {
      usuario: this.editingUser.usuario,
      nombre: this.editingUser.nombre,
      puesto: this.editingUser.puesto,
      email: this.editingUser.email,
      telefono: this.editingUser.telefono,
      pc: this.editingUser.pc,
      rol: this.editingUser.rol
    };

    const serviceCall = isCreate ? 
      this.usersService.createUser(userData) :
      this.usersService.updateUser(this.editingUser.id, userData);

    serviceCall.subscribe({
      next: () => {
        const message = isCreate ? 'Usuario creado exitosamente.' : 'Usuario actualizado exitosamente.';
        alert(message);
        this.cargarUsuarios();
        this.closeModal();
      },
      error: () => {
        const message = isCreate ? 'Error al crear usuario.' : 'Error al actualizar usuario.';
        alert(message);
      }
    });
  }

  public saveUser(user: any) {
    this.handleUserOperation(user.id === 0 ? 'create' : 'update');
  }

  public deleteUser(user: any) {
    if (user.usuario === 'ADMINISTRADOR') {
      alert('El usuario administrador no puede ser eliminado por seguridad del sistema.');
      return;
    }
    
    if (confirm(`¿Estás seguro de que deseas eliminar al usuario "${user.nombre}"? Esta acción no se puede deshacer.`)) {
      this.usersService.deleteUser(user.id).subscribe({
        next: () => {
          alert(`Usuario "${user.nombre}" eliminado exitosamente.`);
          this.cargarUsuarios();
          this.cleanupUserData(user.id);
        },
        error: () => alert('Error al eliminar usuario.')
      });
    }
  }

  private cleanupUserData(userId: number) {
    delete this.userPermissions[userId];
    if (this.selectedUserForPermissions?.id === userId) {
      this.selectedUserForPermissions = null;
    }
  }

  public getNewId(): number {
    return this.userData.length > 0 ? Math.max(...this.userData.map(u => u.id!)) + 1 : 1;
  }

  // --- Utilidades simplificadas ---
  private showSuccessMessage(message: string) {
    alert(message);
  }

  private showErrorMessage(message: string) {
    alert(message);
  }
}