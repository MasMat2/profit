import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApexOptions } from 'apexcharts';
import { Observable } from 'rxjs';
import {
  Agrupacion,
  AltasBajasEstadistica,
  EstadisticasService,
} from '@services/estadisticas.service';
import { ApexChartComponent } from '../shared/apex-chart.component';
import { combinarOpciones, EJE_ETIQUETAS } from '../shared/chart-theme';
import { Kpi, KpisComponent } from '../shared/kpis.component';
import { TarjetaBase } from '../shared/tarjeta-base';
import { TarjetaShellComponent } from '../shared/tarjeta-shell.component';

@Component({
  selector: 'app-tarjeta-altas-bajas',
  standalone: true,
  imports: [CommonModule, FormsModule, TarjetaShellComponent, ApexChartComponent, KpisComponent],
  template: `
    <app-tarjeta-shell
      [opcion]="opcion"
      [expandida]="expandida"
      [cargando]="cargando"
      [error]="error"
      [vacia]="vacia"
      mensajeVacio="Sin movimientos de padrón en el periodo"
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
        <p class="nota">
          Las bajas se derivan del log de movimientos del socio: el padrón no guarda fecha de
          baja.
        </p>
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

      .nota {
        margin: 0.25rem 0 0;
        font-size: 0.72rem;
        color: var(--text-color-secondary);
      }
    `,
  ],
})
export class TarjetaAltasBajasComponent extends TarjetaBase<AltasBajasEstadistica> {
  agrupacion: Agrupacion = 'mes';
  opciones: ApexOptions = {};
  kpis: Kpi[] = [];

  constructor(private estadisticasService: EstadisticasService) {
    super();
  }

  get vacia(): boolean {
    return !this.datos || (this.datos.totalAltas === 0 && this.datos.totalBajas === 0);
  }

  protected consultar(): Observable<AltasBajasEstadistica> {
    return this.estadisticasService.getAltasBajas({
      desde: this.desde,
      hasta: this.hasta,
      agrupacion: this.agrupacion,
    });
  }

  protected override alRecibirDatos(datos: AltasBajasEstadistica): void {
    const signo = datos.neto > 0 ? '+' : '';

    this.kpis = [
      { etiqueta: 'Altas', valor: String(datos.totalAltas), tono: 'exito' },
      { etiqueta: 'Bajas', valor: String(datos.totalBajas), tono: 'peligro' },
      {
        etiqueta: 'Neto',
        valor: `${signo}${datos.neto}`,
        tono: datos.neto >= 0 ? 'exito' : 'peligro',
      },
    ];

    this.opciones = combinarOpciones({
      chart: { type: 'bar', height: 320, stacked: true },
      // Las bajas van en negativo para que la gráfica se lea contra la línea del cero.
      series: [
        { name: 'Altas', data: datos.periodos.map((p) => p.altas) },
        { name: 'Bajas', data: datos.periodos.map((p) => -p.bajas) },
      ],
      colors: ['#10B981', '#EF4444'],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      xaxis: {
        categories: datos.periodos.map((p) => p.etiqueta),
        labels: { ...EJE_ETIQUETAS, rotate: 0, hideOverlappingLabels: true },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false },
      },
      yaxis: {
        labels: {
          ...EJE_ETIQUETAS,
          formatter: (valor: number) => String(Math.abs(Math.round(valor))),
        },
      },
      tooltip: {
        y: { formatter: (valor: number) => `${Math.abs(valor)} socios` },
      },
    });
  }
}
