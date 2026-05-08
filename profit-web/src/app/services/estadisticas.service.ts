import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Estadistica {
  id: string;
  titulo: string;
  icono: string;
  tipo: 'genero' | 'edades' | 'paquetes' | 'inscripciones' | 'saldo' | 'deudas' | 'pagos' | 'membresias' | 'ingresos' | 'clientes' | 'accesos';
  expanded: boolean;
  data: any;
}

export interface EstadisticaGenero {
  masculino: number;
  femenino: number;
  total: number;
}

export interface EstadisticaEdad {
  rango: string;
  cantidad: number;
}

export interface EstadisticaPaquete {
  paquete: string;
  usuarios: number;
}

export interface EstadisticaInscripciones {
  nuevas: number;
  bajas: number;
  periodo: string;
}

export interface EstadisticaSaldo {
  saldoTotal: number;
  fecha: Date;
}

export interface EstadisticaDeudas {
  totalDeudas: number;
  clientesConDeuda: number;
}

export interface EstadisticaPago {
  tipoPago: string;
  cantidad: number;
  monto: number;
}

export interface EstadisticaMembresia {
  membresiasActivas: number;
  membresiasInactivas: number;
  porcentajeActivas: number;
}

export interface EstadisticaIngreso {
  ingresoTotal: number;
  periodo: string;
  desglose: { concepto: string; monto: number }[];
}

export interface EstadisticaTipoCliente {
  tipo: string;
  cantidad: number;
}

export interface EstadisticaAcceso {
  fecha: Date;
  cantidad: number;
}

@Injectable({
  providedIn: 'root'
})
export class EstadisticasService {
  private apiUrl = '/estadisticas';

  constructor(private http: HttpClient) {}

  getEstadisticas(): Observable<Estadistica[]> {
    return of([
      {
        id: 'genero',
        titulo: 'Distribución por Género',
        icono: 'fas fa-venus-mars',
        tipo: 'genero',
        expanded: false,
        data: { masculino: 0, femenino: 0, total: 0 }
      },
      {
        id: 'ingresos',
        titulo: 'Ingresos',
        icono: 'fas fa-chart-line',
        tipo: 'ingresos',
        expanded: false,
        data: { ingresoTotal: 0, periodo: 'Mes actual', desglose: [] }
      },
      {
        id: 'edades',
        titulo: 'Distribución por Edad',
        icono: 'fas fa-birthday-cake',
        tipo: 'edades',
        expanded: false,
        data: []
      },
      {
        id: 'paquetes',
        titulo: 'Usuarios por Paquete',
        icono: 'fas fa-box',
        tipo: 'paquetes',
        expanded: false,
        data: []
      },
      {
        id: 'inscripciones',
        titulo: 'Nuevas Inscripciones y Bajas',
        icono: 'fas fa-user-plus',
        tipo: 'inscripciones',
        expanded: false,
        data: { nuevas: 0, bajas: 0, periodo: 'Mes actual' }
      },
      {
        id: 'saldo',
        titulo: 'Saldo al Corte',
        icono: 'fas fa-wallet',
        tipo: 'saldo',
        expanded: false,
        data: { saldoTotal: 0, fecha: new Date() }
      },
      {
        id: 'deudas',
        titulo: 'Deudas',
        icono: 'fas fa-exclamation-triangle',
        tipo: 'deudas',
        expanded: false,
        data: { totalDeudas: 0, clientesConDeuda: 0 }
      },
      {
        id: 'pagos',
        titulo: 'Tipos de Pago',
        icono: 'fas fa-credit-card',
        tipo: 'pagos',
        expanded: false,
        data: []
      },
      {
        id: 'membresias',
        titulo: 'Membresías Activas',
        icono: 'fas fa-id-card',
        tipo: 'membresias',
        expanded: false,
        data: { membresiasActivas: 0, membresiasInactivas: 0, porcentajeActivas: 0 }
      },
      {
        id: 'clientes',
        titulo: 'Tipos de Clientes',
        icono: 'fas fa-users',
        tipo: 'clientes',
        expanded: false,
        data: []
      },
      {
        id: 'accesos',
        titulo: 'Accesos',
        icono: 'fas fa-door-open',
        tipo: 'accesos',
        expanded: false,
        data: []
      }
    ]);
  }

  getEstadisticaGenero(): Observable<EstadisticaGenero> {
    return this.http.get<EstadisticaGenero>(`${this.apiUrl}/genero`);
  }

  getEstadisticaEdades(): Observable<EstadisticaEdad[]> {
    return this.http.get<EstadisticaEdad[]>(`${this.apiUrl}/edades`);
  }

  getEstadisticaPaquetes(): Observable<EstadisticaPaquete[]> {
    return this.http.get<EstadisticaPaquete[]>(`${this.apiUrl}/paquetes`);
  }

  getEstadisticaInscripciones(): Observable<EstadisticaInscripciones> {
    return this.http.get<EstadisticaInscripciones>(`${this.apiUrl}/inscripciones`);
  }

  getEstadisticaSaldo(): Observable<EstadisticaSaldo> {
    return this.http.get<EstadisticaSaldo>(`${this.apiUrl}/saldo`);
  }

  getEstadisticaDeudas(): Observable<EstadisticaDeudas> {
    return this.http.get<EstadisticaDeudas>(`${this.apiUrl}/deudas`);
  }

  getEstadisticaPagos(): Observable<EstadisticaPago[]> {
    return this.http.get<EstadisticaPago[]>(`${this.apiUrl}/pagos`);
  }

  getEstadisticaMembresias(): Observable<EstadisticaMembresia> {
    return this.http.get<EstadisticaMembresia>(`${this.apiUrl}/membresias`);
  }

  getEstadisticaIngresos(): Observable<EstadisticaIngreso> {
    return this.http.get<EstadisticaIngreso>(`${this.apiUrl}/ingresos`);
  }

  getEstadisticaTiposClientes(): Observable<EstadisticaTipoCliente[]> {
    return this.http.get<EstadisticaTipoCliente[]>(`${this.apiUrl}/tipos-clientes`);
  }

  getEstadisticaAccesos(): Observable<EstadisticaAcceso[]> {
    return this.http.get<EstadisticaAcceso[]>(`${this.apiUrl}/accesos`);
  }
}
