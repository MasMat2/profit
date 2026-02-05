export interface PermissionModule {
  name: string;
  permissions: string[];
}

export interface UserPermissions {
  [userId: number]: {
    [moduleName: string]: string[];
  };
}

export interface SystemSettings {
  openingHours: {
    weekdays: { from: string; to: string };
    saturdays: { from: string; to: string };
    sundays: { from: string; to: string };
  };
  taxRate: number;
  regional: {
    currencySymbol: string;
    timezone: string;
    dateFormat: string;
  };
  notifications: {
    emailsEnabled: boolean;
  };
  security: {
    sessionTimeout: number;
  };
}

export interface BusinessInfoForm {
  name: string;
  address: string;
  neighborhood: string;
  cityState: string;
  phone: string;
  branchNumber: number;
  logoUrl: string;
}

export interface UserForm {
  id: number;
  usuario: string;
  nombre: string;
  puesto: string;
  email: string;
  telefono: string;
  pc: string;
  rol: string;
}

export type AdminSection = 'empresa' | 'roles' | 'permisos' | 'sistema';

export interface PermissionOperation {
  moduleName: string;
  permission: string;
}

export interface UserOperationResult {
  success: boolean;
  message: string;
  user?: UserForm;
}
