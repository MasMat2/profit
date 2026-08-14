import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ApexOptions } from 'apexcharts';
import { Observable } from 'rxjs';
import { AsistenciasEstadistica, EstadisticasService } from '@services/estadisticas.service';
import { ApexChartComponent } from '../shared/apex-chart.component';
import { combinarOpciones, EJE_ETIQUETAS, NARANJA } from '../shared/chart-theme';
import { Kpi, KpisComponent } from '../shared/kpis.component';
import { TarjetaBase } from '../shared/tarjeta-base';
import { TarjetaShellComponent } from '../shared/tarjeta-shell.component';

// El backend devuelve el día con la convención de weekday() de MySQL: 0 = lunes.
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

@Component({
  selector: 'app-tarjeta-asistencias',
  standalone: true,
  imports: [CommonModule, TarjetaShellComponent, ApexChartComponent, KpisComponent],
  template: `
    <app-tarjeta-shell
      [opcion]="opcion"
      [expandida]="expandida"
      [cargando]="cargando"
      [error]="error"
      [vacia]="vacia"
      mensajeVacio="Sin accesos registrados en el periodo"
      (alternar)="alternar.emit()"
      (recargar)="cargar()"
      (quitar)="quitar.emit()"
    >
      <ng-container *ngIf="mostrarContenido">
        <app-kpis [kpis]="kpis" />
        <app-apex-chart [options]="opciones" />
      </ng-container>
    </app-tarjeta-shell>
  `,
})
export class TarjetaAsistenciasComponent extends TarjetaBase<AsistenciasEstadistica> {
  opciones: ApexOptions = {};
  kpis: Kpi[] = [];

  constructor(private estadisticasService: EstadisticasService) {
    super();
  }

  get vacia(): boolean {
    return !this.datos || this.datos.totalAccesos === 0;
  }

  protected consultar(): Observable<AsistenciasEstadistica> {
    return this.estadisticasService.getAsistencias({ desde: this.desde, hasta: this.hasta });
  }

  protected override alRecibirDatos(datos: AsistenciasEstadistica): void {
    this.kpis = [
      { etiqueta: 'Accesos', valor: datos.totalAccesos.toLocaleString('es-MX'), tono: 'marca' },
      { etiqueta: 'Promedio diario', valor: datos.promedioDiario.toLocaleString('es-MX') },
      { etiqueta: 'Día pico', valor: datos.diaPico ?? '—' },
      { etiqueta: 'Hora pico', valor: datos.horaPico ?? '—' },
    ];

    const porDia = DIAS.map((_, dia) =>
      datos.celdas.filter((celda) => celda.dia === dia).sort((a, b) => a.hora - b.hora),
    );

    this.opciones = combinarOpciones({
      chart: { type: 'heatmap', height: 320 },
      // Apex dibuja la primera serie abajo: se invierte para que el lunes quede arriba.
      series: DIAS.map((nombre, dia) => ({
        name: nombre,
        data: porDia[dia].map((celda) => ({
          x: String(celda.hora).padStart(2, '0'),
          y: celda.accesos,
        })),
      })).reverse(),
      colors: [NARANJA],
      legend: { show: false },
      plotOptions: {
        heatmap: {
          radius: 3,
          enableShades: true,
          shadeIntensity: 0.65,
          useFillColorAsStroke: false,
        },
      },
      stroke: { width: 1, colors: ['#FFFFFF'] },
      xaxis: {
        type: 'category',
        labels: { ...EJE_ETIQUETAS, rotate: 0, hideOverlappingLabels: true },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false },
      },
      yaxis: { labels: EJE_ETIQUETAS },
      grid: { padding: { left: 4, right: 4, top: 0 } },
      tooltip: {
        y: { formatter: (valor: number) => `${valor} ${valor === 1 ? 'acceso' : 'accesos'}` },
      },
    });
  }
}
