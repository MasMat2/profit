import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { EstadisticasService, SociosPorClaseEstadistica } from '@services/estadisticas.service';
import { BarraItem, BarrasComponent } from '../shared/barras.component';
import { PALETA } from '../shared/chart-theme';
import { Kpi, KpisComponent } from '../shared/kpis.component';
import { TarjetaBase } from '../shared/tarjeta-base';
import { TarjetaShellComponent } from '../shared/tarjeta-shell.component';

@Component({
  selector: 'app-tarjeta-socios-por-clase',
  standalone: true,
  imports: [CommonModule, FormsModule, TarjetaShellComponent, BarrasComponent, KpisComponent],
  template: `
    <app-tarjeta-shell
      [opcion]="opcion"
      [expandida]="expandida"
      [cargando]="cargando"
      [error]="error"
      [vacia]="vacia"
      mensajeVacio="No hay clases activas con socios"
      (alternar)="alternar.emit()"
      (recargar)="cargar()"
      (quitar)="quitar.emit()"
    >
      <label cardControls class="control-check">
        <input type="checkbox" [(ngModel)]="soloActivos" (ngModelChange)="cargar()" />
        Solo activos
      </label>

      <ng-container *ngIf="mostrarContenido">
        <app-kpis [kpis]="kpis" />
        <app-barras [items]="items" />
        <p class="nota">
          Un socio puede estar inscrito en varias clases, así que la suma puede superar el
          total.
        </p>
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

      .nota {
        margin: 0.75rem 0 0;
        font-size: 0.72rem;
        color: var(--text-color-secondary);
      }
    `,
  ],
})
export class TarjetaSociosPorClaseComponent extends TarjetaBase<SociosPorClaseEstadistica> {
  soloActivos = true;
  items: BarraItem[] = [];
  kpis: Kpi[] = [];

  constructor(private estadisticasService: EstadisticasService) {
    super();
  }

  get vacia(): boolean {
    return !this.datos || this.datos.clases.length === 0;
  }

  protected consultar(): Observable<SociosPorClaseEstadistica> {
    return this.estadisticasService.getSociosPorClase(this.soloActivos);
  }

  protected override alRecibirDatos(datos: SociosPorClaseEstadistica): void {
    this.kpis = [
      { etiqueta: 'Socios', valor: datos.totalSocios.toLocaleString('es-MX'), tono: 'marca' },
      { etiqueta: 'Clases', valor: String(datos.clases.filter((c) => c.clase !== 0).length) },
    ];

    // La barra se mide contra la clase más poblada: comparar contra el total dejaría
    // todas las barras diminutas cuando hay muchas clases.
    const mayor = Math.max(...datos.clases.map((clase) => clase.socios), 1);

    this.items = datos.clases.map((clase, indice) => ({
      etiqueta: clase.nombre,
      valor: clase.socios.toLocaleString('es-MX'),
      detalle: `${clase.porcentaje.toFixed(1)}%`,
      porcentaje: (clase.socios / mayor) * 100,
      color: clase.clase === 0 ? '#9CA3AF' : PALETA[indice % PALETA.length],
    }));
  }
}
