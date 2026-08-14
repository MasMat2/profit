import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApexOptions } from 'apexcharts';
import { Observable } from 'rxjs';
import {
  Agrupacion,
  EstadisticasService,
  IngresosEstadistica,
} from '@services/estadisticas.service';
import { ApexChartComponent } from '../shared/apex-chart.component';
import {
  combinarOpciones,
  CURRENCY,
  CURRENCY_EXACTA,
  EJE_ETIQUETAS,
} from '../shared/chart-theme';
import { Kpi, KpisComponent } from '../shared/kpis.component';
import { TarjetaBase } from '../shared/tarjeta-base';
import { TarjetaShellComponent } from '../shared/tarjeta-shell.component';

@Component({
  selector: 'app-tarjeta-ingresos',
  standalone: true,
  imports: [CommonModule, FormsModule, TarjetaShellComponent, ApexChartComponent, KpisComponent],
  template: `
    <app-tarjeta-shell
      [opcion]="opcion"
      [expandida]="expandida"
      [cargando]="cargando"
      [error]="error"
      [vacia]="vacia"
      mensajeVacio="Sin cobros en el periodo"
      (alternar)="alternar.emit()"
      (recargar)="cargar()"
      (quitar)="quitar.emit()"
    >
      <select
        cardControls
        class="control-select"
        [(ngModel)]="agrupacion"
        (ngModelChange)="cargar()"
      >
        <option value="dia">Por día</option>
        <option value="semana">Por semana</option>
        <option value="mes">Por mes</option>
      </select>

      <ng-container *ngIf="mostrarContenido">
        <app-kpis [kpis]="kpis" />
        <app-apex-chart [options]="opciones" />
      </ng-container>
    </app-tarjeta-shell>
  `,
  styles: [
    `
      .control-select {
        padding: 0.25rem 0.5rem;
        border: 1px solid var(--surface-border);
        border-radius: 6px;
        background: var(--surface-a);
        color: var(--text-color);
        font-size: 0.78rem;
        cursor: pointer;
      }
    `,
  ],
})
export class TarjetaIngresosComponent extends TarjetaBase<IngresosEstadistica> {
  agrupacion: Agrupacion = 'mes';
  opciones: ApexOptions = {};
  kpis: Kpi[] = [];

  constructor(private estadisticasService: EstadisticasService) {
    super();
  }

  get vacia(): boolean {
    return !this.datos || this.datos.totalCobrado === 0;
  }

  protected consultar(): Observable<IngresosEstadistica> {
    return this.estadisticasService.getIngresos({
      desde: this.desde,
      hasta: this.hasta,
      agrupacion: this.agrupacion,
    });
  }

  protected override alRecibirDatos(datos: IngresosEstadistica): void {
    this.kpis = [
      { etiqueta: 'Cobrado', valor: CURRENCY_EXACTA.format(datos.totalCobrado), tono: 'marca' },
      { etiqueta: 'Mensualidades', valor: CURRENCY_EXACTA.format(datos.totalMensualidades) },
      { etiqueta: 'Ventas', valor: CURRENCY_EXACTA.format(datos.totalVentas) },
    ];

    this.opciones = combinarOpciones({
      chart: { type: 'area', height: 320, stacked: true },
      series: [
        { name: 'Mensualidades', data: datos.periodos.map((p) => p.mensualidades) },
        { name: 'Ventas', data: datos.periodos.map((p) => p.ventas) },
      ],
      xaxis: {
        categories: datos.periodos.map((p) => p.etiqueta),
        labels: { ...EJE_ETIQUETAS, rotate: 0, hideOverlappingLabels: true },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false },
      },
      yaxis: {
        labels: { ...EJE_ETIQUETAS, formatter: (valor: number) => CURRENCY.format(valor) },
      },
      stroke: { curve: 'smooth', width: 2 },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] },
      },
      tooltip: { y: { formatter: (valor: number) => CURRENCY_EXACTA.format(valor) } },
    });
  }
}
