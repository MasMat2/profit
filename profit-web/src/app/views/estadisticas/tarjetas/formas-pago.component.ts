import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ApexOptions } from 'apexcharts';
import { Observable } from 'rxjs';
import { EstadisticasService, FormasPagoEstadistica } from '@services/estadisticas.service';
import { ApexChartComponent } from '../shared/apex-chart.component';
import { combinarOpciones, CURRENCY_EXACTA, PALETA } from '../shared/chart-theme';
import { TarjetaBase } from '../shared/tarjeta-base';
import { TarjetaShellComponent } from '../shared/tarjeta-shell.component';

// La leyenda se arma en TS para formatear el importe con Intl es-MX: el CurrencyPipe de
// Angular usaría el locale por defecto de la app (en-US).
interface FilaLeyenda {
  nombre: string;
  movimientos: string;
  importe: string;
  porcentaje: string;
  color: string;
}

@Component({
  selector: 'app-tarjeta-formas-pago',
  standalone: true,
  imports: [CommonModule, TarjetaShellComponent, ApexChartComponent],
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
      <ng-container *ngIf="mostrarContenido">
        <app-apex-chart [options]="opciones" />

        <ul class="leyenda">
          <li *ngFor="let fila of filas">
            <span class="punto" [style.background]="fila.color"></span>
            <span class="nombre">{{ fila.nombre }}</span>
            <span class="movimientos">{{ fila.movimientos }}</span>
            <span class="importe">{{ fila.importe }}</span>
            <span class="porcentaje">{{ fila.porcentaje }}</span>
          </li>
        </ul>
      </ng-container>
    </app-tarjeta-shell>
  `,
  styles: [
    `
      .leyenda {
        list-style: none;
        margin: 0.5rem 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;

        li {
          display: grid;
          grid-template-columns: 10px 1fr auto auto auto;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.82rem;
        }
      }

      .punto {
        width: 10px;
        height: 10px;
        border-radius: 3px;
      }

      .nombre {
        color: var(--text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .movimientos {
        font-size: 0.75rem;
        color: var(--text-color-secondary);
      }

      .importe {
        font-weight: 600;
        color: var(--text-color);
      }

      .porcentaje {
        min-width: 46px;
        text-align: right;
        font-size: 0.78rem;
        color: var(--text-color-secondary);
      }
    `,
  ],
})
export class TarjetaFormasPagoComponent extends TarjetaBase<FormasPagoEstadistica> {
  opciones: ApexOptions = {};
  filas: FilaLeyenda[] = [];

  constructor(private estadisticasService: EstadisticasService) {
    super();
  }

  get vacia(): boolean {
    return !this.datos || this.datos.formas.length === 0;
  }

  protected consultar(): Observable<FormasPagoEstadistica> {
    return this.estadisticasService.getFormasPago({ desde: this.desde, hasta: this.hasta });
  }

  protected override alRecibirDatos(datos: FormasPagoEstadistica): void {
    const colores = datos.formas.map((_, indice) => PALETA[indice % PALETA.length]);

    this.filas = datos.formas.map((forma, indice) => ({
      nombre: forma.nombre,
      movimientos: `${forma.movimientos} mov.`,
      importe: CURRENCY_EXACTA.format(forma.importe),
      porcentaje: `${forma.porcentaje.toFixed(1)}%`,
      color: colores[indice],
    }));

    this.opciones = combinarOpciones({
      chart: { type: 'donut', height: 260 },
      labels: datos.formas.map((forma) => forma.nombre),
      series: datos.formas.map((forma) => forma.importe),
      colors: colores,
      stroke: { width: 0 },
      // La leyenda propia de abajo ya detalla importe y porcentaje.
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
            labels: {
              show: true,
              value: { fontSize: '20px', fontWeight: 700 },
              total: {
                show: true,
                label: 'Cobrado',
                fontSize: '13px',
                formatter: () => CURRENCY_EXACTA.format(datos.totalCobrado),
              },
            },
          },
        },
      },
      tooltip: { y: { formatter: (valor: number) => CURRENCY_EXACTA.format(valor) } },
    });
  }
}
