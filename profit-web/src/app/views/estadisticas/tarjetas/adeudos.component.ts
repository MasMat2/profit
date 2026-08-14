import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { AdeudosEstadistica, EstadisticasService } from '@services/estadisticas.service';
import { BarraItem, BarrasComponent } from '../shared/barras.component';
import { CURRENCY_EXACTA } from '../shared/chart-theme';
import { Kpi, KpisComponent } from '../shared/kpis.component';
import { TarjetaBase } from '../shared/tarjeta-base';
import { TarjetaShellComponent } from '../shared/tarjeta-shell.component';

// La escala va de verde a rojo conforme envejece el adeudo.
const COLOR_ANTIGUEDAD = ['#10B981', '#F59E0B', '#F97316', '#EF4444'];

@Component({
  selector: 'app-tarjeta-adeudos',
  standalone: true,
  imports: [CommonModule, TarjetaShellComponent, BarrasComponent, KpisComponent],
  template: `
    <app-tarjeta-shell
      [opcion]="opcion"
      [expandida]="expandida"
      [cargando]="cargando"
      [error]="error"
      [vacia]="vacia"
      mensajeVacio="No hay adeudos pendientes"
      (alternar)="alternar.emit()"
      (recargar)="cargar()"
      (quitar)="quitar.emit()"
    >
      <ng-container *ngIf="mostrarContenido">
        <app-kpis [kpis]="kpis" />
        <app-barras [items]="items" />
      </ng-container>
    </app-tarjeta-shell>
  `,
})
export class TarjetaAdeudosComponent extends TarjetaBase<AdeudosEstadistica> {
  items: BarraItem[] = [];
  kpis: Kpi[] = [];

  constructor(private estadisticasService: EstadisticasService) {
    super();
  }

  get vacia(): boolean {
    return !this.datos || this.datos.totalImporte === 0;
  }

  protected consultar(): Observable<AdeudosEstadistica> {
    return this.estadisticasService.getAdeudos();
  }

  protected override alRecibirDatos(datos: AdeudosEstadistica): void {
    this.kpis = [
      {
        etiqueta: 'Adeudo total',
        valor: CURRENCY_EXACTA.format(datos.totalImporte),
        tono: 'peligro',
      },
      { etiqueta: 'Socios con adeudo', valor: datos.totalSocios.toLocaleString('es-MX') },
    ];

    const mayor = Math.max(...datos.buckets.map((bucket) => bucket.importe), 1);

    this.items = datos.buckets.map((bucket, indice) => ({
      etiqueta: bucket.etiqueta,
      valor: CURRENCY_EXACTA.format(bucket.importe),
      detalle: `${bucket.socios} ${bucket.socios === 1 ? 'socio' : 'socios'}`,
      porcentaje: (bucket.importe / mayor) * 100,
      color: COLOR_ANTIGUEDAD[indice] ?? COLOR_ANTIGUEDAD[COLOR_ANTIGUEDAD.length - 1],
    }));
  }
}
