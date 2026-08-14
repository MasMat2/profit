import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApexOptions } from 'apexcharts';
import { Observable } from 'rxjs';
import { EstadisticasService, GeneroEstadistica } from '@services/estadisticas.service';
import { ApexChartComponent } from '../shared/apex-chart.component';
import { combinarOpciones } from '../shared/chart-theme';
import { TarjetaBase } from '../shared/tarjeta-base';
import { TarjetaShellComponent } from '../shared/tarjeta-shell.component';

// Colores convencionales por género; el resto cae al gris neutro.
const COLOR_GENERO: Record<string, string> = {
  Masculino: '#3B82F6',
  Femenino: '#EC4899',
  'No especificado': '#9CA3AF',
};

@Component({
  selector: 'app-tarjeta-genero',
  standalone: true,
  imports: [CommonModule, FormsModule, TarjetaShellComponent, ApexChartComponent],
  template: `
    <app-tarjeta-shell
      [opcion]="opcion"
      [expandida]="expandida"
      [cargando]="cargando"
      [error]="error"
      [vacia]="vacia"
      mensajeVacio="No hay socios registrados"
      (alternar)="alternar.emit()"
      (recargar)="cargar()"
      (quitar)="quitar.emit()"
    >
      <label cardControls class="control-check">
        <input type="checkbox" [(ngModel)]="soloActivos" (ngModelChange)="cargar()" />
        Solo activos
      </label>

      <ng-container *ngIf="mostrarContenido">
        <app-apex-chart [options]="opciones" />
      </ng-container>
    </app-tarjeta-shell>
  `,
  styles: [
    `
      .control-check {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        margin-right: 0.5rem;
        font-size: 0.78rem;
        color: var(--text-color-secondary);
        cursor: pointer;
        white-space: nowrap;

        input {
          accent-color: var(--primary-color);
          cursor: pointer;
        }
      }
    `,
  ],
})
export class TarjetaGeneroComponent extends TarjetaBase<GeneroEstadistica> {
  soloActivos = true;
  opciones: ApexOptions = {};

  constructor(private estadisticasService: EstadisticasService) {
    super();
  }

  get vacia(): boolean {
    return !this.datos || this.datos.totalSocios === 0;
  }

  protected consultar(): Observable<GeneroEstadistica> {
    return this.estadisticasService.getGenero(this.soloActivos);
  }

  protected override alRecibirDatos(datos: GeneroEstadistica): void {
    this.opciones = combinarOpciones({
      chart: { type: 'donut', height: 300 },
      labels: datos.items.map((item) => item.etiqueta),
      series: datos.items.map((item) => item.cantidad),
      colors: datos.items.map((item) => COLOR_GENERO[item.etiqueta] ?? '#9CA3AF'),
      stroke: { width: 0 },
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
            labels: {
              show: true,
              value: { fontSize: '24px', fontWeight: 700, offsetY: 0 },
              total: {
                show: true,
                label: 'Socios',
                fontSize: '13px',
                formatter: () => datos.totalSocios.toLocaleString('es-MX'),
              },
            },
          },
        },
      },
      tooltip: {
        y: { formatter: (valor: number) => `${valor.toLocaleString('es-MX')} socios` },
      },
    });
  }
}
