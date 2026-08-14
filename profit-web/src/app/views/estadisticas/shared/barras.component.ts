import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NARANJA } from './chart-theme';

export interface BarraItem {
  etiqueta: string;
  valor: string;
  // 0-100. Se recorta al pintar por si la suma pasa de 100 (un socio puede estar en
  // varias clases).
  porcentaje: number;
  color?: string;
  detalle?: string;
}

// Ranking en barras horizontales. Es CSS puro a propósito: se integra mejor con la
// tarjeta que un canvas y no paga el costo de una gráfica para una lista ordenada.
@Component({
  selector: 'app-barras',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="barras">
      <div class="barra" *ngFor="let item of items">
        <span class="barra-etiqueta" [title]="item.etiqueta">{{ item.etiqueta }}</span>
        <div class="barra-pista">
          <div
            class="barra-relleno"
            [style.width.%]="ancho(item.porcentaje)"
            [style.background]="item.color ?? colorPorDefecto"
          ></div>
        </div>
        <span class="barra-valor">
          {{ item.valor }}
          <small *ngIf="item.detalle">{{ item.detalle }}</small>
        </span>
      </div>
    </div>
  `,
  styles: [
    `
      .barras {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .barra {
        display: grid;
        grid-template-columns: minmax(90px, 1.1fr) 3fr minmax(72px, auto);
        align-items: center;
        gap: 0.75rem;
      }

      .barra-etiqueta {
        font-size: 0.82rem;
        color: var(--text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .barra-pista {
        height: 24px;
        border-radius: 6px;
        background: var(--surface-c);
        overflow: hidden;
      }

      .barra-relleno {
        height: 100%;
        border-radius: 6px;
        min-width: 2px;
        transition: width 0.45s ease-out;
      }

      .barra-valor {
        display: flex;
        align-items: baseline;
        justify-content: flex-end;
        gap: 0.35rem;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-color);
        white-space: nowrap;

        small {
          font-weight: 500;
          font-size: 0.75rem;
          color: var(--text-color-secondary);
        }
      }
    `,
  ],
})
export class BarrasComponent {
  @Input({ required: true }) items: BarraItem[] = [];
  @Input() colorPorDefecto = NARANJA;

  ancho(porcentaje: number): number {
    return Math.max(0, Math.min(100, porcentaje));
  }
}
