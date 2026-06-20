import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Estadistica {
  id: string;
  titulo: string;
  icono: string;
  tipo: 'genero' | 'edades' | 'paquetes' | 'inscripciones' | 'saldo' | 'deudas' | 'pagos' | 'membresias' | 'clientes' | 'accesos' | 'ingresos' | 'tickets-global';
  expanded: boolean;
  data: any;
}

export interface TicketGlobal {
  ticket: number;
  folio: number;
  fecha: Date;
  cliente: string;
  total: number;
  credito: boolean;
}

export interface EstadisticaTicketsGlobal {
  tickets: TicketGlobal[];
  totales: {
    dia: number;
    mes: number;
    anio: number;
    cantidadTickets: number;
    porMetodo: { metodo: string; monto: number }[];
  };
  periodo: string;
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
  periodo?: string;
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
        titulo: 'Ingresos por Período',
        icono: 'fas fa-wallet',
        tipo: 'saldo',
        expanded: false,
        data: { saldoTotal: 0, fecha: new Date(), periodo: 'Hoy' }
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
      },
      {
        id: 'ingresos',
        titulo: 'Ingresos',
        icono: 'fas fa-chart-line',
        tipo: 'ingresos',
        expanded: false,
        data: {
          ingresoTotal: 0,
          totalPagos: 0,
          promedioPorPago: 0,
          mensuales: [],
          porMetodo: []
        }
      },
      {
        id: 'tickets-global',
        titulo: 'Tickets Global',
        icono: 'fas fa-receipt',
        tipo: 'tickets-global',
        expanded: false,
        data: {
          tickets: [],
          totales: {
            dia: 0,
            mes: 0,
            anio: 0,
            cantidadTickets: 0,
            porMetodo: []
          },
          periodo: 'Hoy'
        }
      }
    ]);
  }

  getEstadisticaGenero(fechaInicio?: string, fechaFin?: string): Observable<EstadisticaGenero> {
    let params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;
    return this.http.get<EstadisticaGenero>(`${this.apiUrl}/genero`, { params });
  }

  getEstadisticaEdades(fechaInicio?: string, fechaFin?: string): Observable<EstadisticaEdad[]> {
    let params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;
    return this.http.get<EstadisticaEdad[]>(`${this.apiUrl}/edades`, { params });
  }

  getEstadisticaPaquetes(fechaInicio?: string, fechaFin?: string): Observable<EstadisticaPaquete[]> {
    let params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;
    return this.http.get<EstadisticaPaquete[]>(`${this.apiUrl}/paquetes`, { params });
  }

  getEstadisticaInscripciones(fechaInicio?: string, fechaFin?: string): Observable<EstadisticaInscripciones> {
    let params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;
    return this.http.get<EstadisticaInscripciones>(`${this.apiUrl}/inscripciones`, { params });
  }

  getEstadisticaSaldo(fechaInicio?: string, fechaFin?: string): Observable<EstadisticaSaldo> {
    let params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;
    return this.http.get<EstadisticaSaldo>(`${this.apiUrl}/saldo`, { params });
  }

  getEstadisticaDeudas(): Observable<EstadisticaDeudas> {
    return this.http.get<EstadisticaDeudas>(`${this.apiUrl}/deudas`);
  }

  getEstadisticaPagos(fechaInicio?: string, fechaFin?: string): Observable<EstadisticaPago[]> {
    let params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;
    return this.http.get<EstadisticaPago[]>(`${this.apiUrl}/pagos`, { params });
  }

  getEstadisticaMembresias(): Observable<EstadisticaMembresia> {
    return this.http.get<EstadisticaMembresia>(`${this.apiUrl}/membresias`);
  }

  getEstadisticaTiposClientes(): Observable<EstadisticaTipoCliente[]> {
    return this.http.get<EstadisticaTipoCliente[]>(`${this.apiUrl}/tipos-clientes`);
  }

  getEstadisticaAccesos(fechaInicio?: string, fechaFin?: string): Observable<EstadisticaAcceso[]> {
    let params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;
    return this.http.get<EstadisticaAcceso[]>(`${this.apiUrl}/accesos`, { params });
  }

  getEstadisticaIngresos(fechaInicio?: string, fechaFin?: string): Observable<{
    ingresoTotal: number;
    totalPagos: number;
    promedioPorPago: number;
    periodo: string;
    mensuales: { mes: string; monto: number; pagos: number }[];
    porMetodo: { metodo: string; monto: number; pagos: number }[];
  }> {
    let params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;
    return this.http.get<any>(`${this.apiUrl}/ingresos`, { params });
  }

  getTicketsGlobal(fechaInicio?: string, fechaFin?: string): Observable<EstadisticaTicketsGlobal> {
    let params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;
    return this.http.get<EstadisticaTicketsGlobal>(`${this.apiUrl}/tickets-global`, { params });
  }
}
