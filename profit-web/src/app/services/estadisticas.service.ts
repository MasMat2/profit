import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type Agrupacion = 'dia' | 'semana' | 'mes';

export interface RangoFiltros {
  desde?: string; // 'yyyy-MM-dd'
  hasta?: string; // 'yyyy-MM-dd'
}

export interface PeriodoFiltros extends RangoFiltros {
  agrupacion?: Agrupacion;
}

export interface GeneroEstadistica {
  totalSocios: number;
  items: { etiqueta: string; cantidad: number; porcentaje: number }[];
}

export interface IngresosEstadistica {
  agrupacion: Agrupacion;
  totalCobrado: number;
  totalMensualidades: number;
  totalVentas: number;
  periodos: {
    clave: string;
    etiqueta: string;
    mensualidades: number;
    ventas: number;
    total: number;
  }[];
}

export interface AltasBajasEstadistica {
  agrupacion: Agrupacion;
  totalAltas: number;
  totalBajas: number;
  neto: number;
  periodos: { clave: string; etiqueta: string; altas: number; bajas: number }[];
}

export interface SociosPorClaseEstadistica {
  // Un socio puede estar en varias clases (tbsocios.clases es un CSV), así que la suma
  // de `socios` puede superar a `totalSocios`.
  totalSocios: number;
  clases: { clase: number; nombre: string; socios: number; porcentaje: number }[];
}

export interface FormasPagoEstadistica {
  totalCobrado: number;
  formas: { nombre: string; importe: number; movimientos: number; porcentaje: number }[];
}

export interface AdeudosEstadistica {
  totalImporte: number;
  totalSocios: number;
  buckets: { etiqueta: string; importe: number; socios: number }[];
}

export interface AsistenciasEstadistica {
  totalAccesos: number;
  promedioDiario: number;
  diaPico: string | null;
  horaPico: string | null;
  // Matriz de 7 x 24: día de la semana (0 = lunes) x hora.
  celdas: { dia: number; hora: number; accesos: number }[];
}

@Injectable({
  providedIn: 'root',
})
export class EstadisticasService {
  private apiUrl = '/estadisticas';

  constructor(private http: HttpClient) {}

  getGenero(soloActivos = true): Observable<GeneroEstadistica> {
    return this.http.get<GeneroEstadistica>(`${this.apiUrl}/genero`, {
      params: new HttpParams().set('soloActivos', soloActivos),
    });
  }

  getIngresos(filtros: PeriodoFiltros = {}): Observable<IngresosEstadistica> {
    return this.http.get<IngresosEstadistica>(`${this.apiUrl}/ingresos`, {
      params: this.aParams(filtros),
    });
  }

  getAltasBajas(filtros: PeriodoFiltros = {}): Observable<AltasBajasEstadistica> {
    return this.http.get<AltasBajasEstadistica>(`${this.apiUrl}/altas-bajas`, {
      params: this.aParams(filtros),
    });
  }

  getSociosPorClase(soloActivos = true): Observable<SociosPorClaseEstadistica> {
    return this.http.get<SociosPorClaseEstadistica>(`${this.apiUrl}/socios-por-clase`, {
      params: new HttpParams().set('soloActivos', soloActivos),
    });
  }

  getFormasPago(filtros: RangoFiltros = {}): Observable<FormasPagoEstadistica> {
    return this.http.get<FormasPagoEstadistica>(`${this.apiUrl}/formas-pago`, {
      params: this.aParams(filtros),
    });
  }

  getAdeudos(): Observable<AdeudosEstadistica> {
    return this.http.get<AdeudosEstadistica>(`${this.apiUrl}/adeudos`);
  }

  getAsistencias(filtros: RangoFiltros = {}): Observable<AsistenciasEstadistica> {
    return this.http.get<AsistenciasEstadistica>(`${this.apiUrl}/asistencias`, {
      params: this.aParams(filtros),
    });
  }

  // PeriodoFiltros es el superconjunto: sirve también para los endpoints que solo
  // reciben rango. Una interfaz no encaja en Record<string, ...> porque no tiene índice.
  private aParams(filtros: PeriodoFiltros): HttpParams {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor) params = params.set(clave, valor);
    }
    return params;
  }
}
