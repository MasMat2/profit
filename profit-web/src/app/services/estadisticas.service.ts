import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

export interface Estadistica {
  id: string;
  titulo: string;
  icono: string;
  tipo: 'genero' | 'edades' | 'paquetes' | 'inscripciones' | 'saldo' | 'deudas' | 'pagos' | 'membresias' | 'clientes' | 'accesos';
  expanded: boolean;
  data: any;
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
      }
    ]);
  }

  getEstadisticaGenero(fechaInicio?: string, fechaFin?: string): Observable<any> {
    let params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;
    return this.http.get<any>(`${this.apiUrl}/genero`, { params });
  }

  getEstadisticaEdades(fechaInicio?: string, fechaFin?: string): Observable<any[]> {
    let params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;
    return this.http.get<any[]>(`${this.apiUrl}/edades`, { params });
  }

  getEstadisticaPaquetes(fechaInicio?: string, fechaFin?: string): Observable<any[]> {
    let params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;
    return this.http.get<any[]>(`${this.apiUrl}/paquetes`, { params });
  }

  getEstadisticaInscripciones(fechaInicio?: string, fechaFin?: string): Observable<any> {
    let params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;
    return this.http.get<any>(`${this.apiUrl}/inscripciones`, { params });
  }

  getEstadisticaSaldo(fechaInicio?: string, fechaFin?: string): Observable<any> {
    let params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;
    return this.http.get<any>(`${this.apiUrl}/saldo`, { params });
  }

  getEstadisticaDeudas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/deudas`);
  }

  getEstadisticaPagos(fechaInicio?: string, fechaFin?: string): Observable<any[]> {
    let params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;
    return this.http.get<any[]>(`${this.apiUrl}/pagos`, { params });
  }

  getEstadisticaMembresias(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/membresias`);
  }

  getEstadisticaTiposClientes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tipos-clientes`);
  }

  getEstadisticaAccesos(fechaInicio?: string, fechaFin?: string): Observable<any[]> {
    let params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;
    return this.http.get<any[]>(`${this.apiUrl}/accesos`, { params });
  }

}
