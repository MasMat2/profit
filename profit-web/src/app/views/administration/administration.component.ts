import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserModalComponent } from './user-modal.component';

@Component({
  selector: 'app-administration',
  standalone: true,
  imports: [CommonModule, FormsModule, UserModalComponent],
  templateUrl: './administration.component.html',
  styleUrls: ['./administration.component.css']
})
export class AdministrationComponent implements OnInit {
  activeSection: string = 'empresa'; // 'empresa', 'roles', 'permisos', 'sistema'
  isModalOpen = false;
  editingUser: any = null;
  selectedUserForPermissions: any = null;
  userPermissions: { [userId: number]: { [moduleName: string]: string[] } } = {};

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

  // Permisos adaptados a la estructura real de la aplicación
  permissionModules = [
    { name: 'Estadísticas', permissions: ['Ver'] },
    { name: 'Administración', permissions: ['Ver', 'Modificar'] },
    { name: 'Planes y Clases', permissions: ['Ver', 'Modificar'] },
    { name: 'Clientes', permissions: ['Ver', 'Modificar'] },
    { name: 'Inscripción de Clientes', permissions: ['Ver', 'Modificar'] },
    { name: 'Gestión de Membresías', permissions: ['Ver', 'Modificar'] },
    { name: 'Productos y Stock', permissions: ['Ver', 'Modificar'] },
    { name: 'Punto de Venta', permissions: ['Ver', 'Modificar'] }
  ];

  userData = [
    { id: 1, usuario: 'ADMINISTRADOR', nombre: 'Admin General', puesto: 'ADMINISTRADOR', email: 'admin@profit.com', telefono: '555-0101', pc: 'BDKLAP', permisos: 'ADMINISTRADOR' },
    { id: 2, usuario: 'VENTAS_01', nombre: 'Vendedor Principal', puesto: 'VENDEDOR', email: 'ventas@profit.com', telefono: '555-0102', pc: 'VENTASLAP', permisos: 'VENTAS' },
    { id: 3, usuario: 'CAJERO_M', nombre: 'Cajero Matutino', puesto: 'CAJERO', email: 'caja@profit.com', telefono: '555-0103', pc: 'CAJA_01', permisos: 'PUNTO DE VENTA' }
  ];

  systemSettings = {
    openingHours: {
      weekdays: { from: '09:00', to: '18:00' },
      saturdays: { from: '10:00', to: '14:00' },
      sundays: { from: '12:00', to: '12:00' } // Cerrado
    },
    taxRate: 16,
    smtp: {
      server: 'smtp.example.com',
      port: 587,
      user: 'user@example.com',
      pass: ''
    },
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

  constructor() {}

  public ngOnInit(): void {
    this.loadDefaultPermissions();
    this.cargarInformacionNegocio();
    this.cargarUsuarios();
    this.cargarConfiguracionSistema();
  }

  public guardarInformacionNegocio() {
    localStorage.setItem('businessInfo', JSON.stringify(this.businessInfo));
    // Opcional: mostrar una notificación sutil de que se guardó.
    console.log('Información del negocio guardada en localStorage.');
  }

  public cargarInformacionNegocio() {
    const data = localStorage.getItem('businessInfo');
    if (data) {
      this.businessInfo = JSON.parse(data);
      console.log('Información del negocio cargada desde localStorage.');
    }
  }

  public cargarUsuarios() {
    const data = localStorage.getItem('userData');
    if (data) {
      this.userData = JSON.parse(data);
    }
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

  // --- Lógica de Permisos ---
  public loadDefaultPermissions() {
    this.userData.forEach(user => {
      this.userPermissions[user.id] = {};
      this.permissionModules.forEach(module => {
        // Por defecto, nadie tiene permisos
        this.userPermissions[user.id][module.name] = [];
      });
      // Damos todos los permisos al admin como ejemplo
      if (user.usuario === 'ADMINISTRADOR') {
        Object.keys(this.userPermissions[user.id]).forEach(moduleName => {
          const module = this.permissionModules.find(m => m.name === moduleName);
          if (module) {
            this.userPermissions[user.id][moduleName] = [...module.permissions];
          }
        });
      }
    });
  }

  public editUserPermissions(user: any) {
    this.selectedUserForPermissions = user;
    this.activeSection = 'permisos';
  }

  public hasPermission(moduleName: string, permission: string): boolean {
    if (!this.selectedUserForPermissions) return false;
    const userId = this.selectedUserForPermissions.id;
    return this.userPermissions[userId]?.[moduleName]?.includes(permission) || false;
  }

  public togglePermission(moduleName: string, permission: string) {
    if (!this.selectedUserForPermissions) return;
    const userId = this.selectedUserForPermissions.id;
    const userModulePermissions = this.userPermissions[userId][moduleName];
    
    const index = userModulePermissions.indexOf(permission);
    if (index > -1) {
      userModulePermissions.splice(index, 1); // Quitar permiso
    } else {
      userModulePermissions.push(permission); // Añadir permiso
    }
  }

  public savePermissions() {
    if (!this.selectedUserForPermissions) {
      alert('No hay un usuario seleccionado.');
      return;
    }
    const userName = this.selectedUserForPermissions.nombre;
    console.log('Guardando permisos para:', userName, this.userPermissions[this.selectedUserForPermissions.id]);
    alert(`Permisos guardados para ${userName}`);
    this.selectedUserForPermissions = null; // Opcional: deseleccionar después de guardar
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
    this.editingUser = user ? { ...user } : { id: 0, usuario: '', nombre: '', puesto: '', email: '', telefono: '', pc: '', permisos: '' };
    this.isModalOpen = true;
  }

  public closeModal() {
    this.isModalOpen = false;
    this.editingUser = null;
  }

  public saveUser(user: any) {
    if (this.editingUser.id === 0) { // New user
      this.editingUser.id = this.getNewId();
      this.userData.push(this.editingUser);
    } else { // Existing user
      const index = this.userData.findIndex(u => u.id === this.editingUser.id);
      if (index !== -1) {
        this.userData[index] = this.editingUser;
      }
    }
    localStorage.setItem('userData', JSON.stringify(this.userData));
    this.closeModal();
  }

  public getNewId(): number {
    return this.userData.length > 0 ? Math.max(...this.userData.map(u => u.id)) + 1 : 1;
  }
} 