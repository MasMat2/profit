import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type KpiTono = 'neutro' | 'marca' | 'exito' | 'peligro';

export interface Kpi {
  etiqueta: string;
  valor: string;
  tono?: KpiTono;
}

@Component({
  selector: 'app-kpis',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kpi-row">
      <div class="kpi" *ngFor="let kpi of kpis">
        <span class="kpi-valor" [class]="'tono-' + (kpi.tono ?? 'neutro')">{{ kpi.valor }}</span>
        <span class="kpi-etiqueta">{{ kpi.etiqueta }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      .kpi-row {
        display: flex;
        flex-wrap: wrap;
        gap: 1.75rem;
        margin-bottom: 0.75rem;
      }

      .kpi {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
      }

      .kpi-valor {
        font-size: 1.35rem;
        font-weight: 700;
        line-height: 1.15;
        color: var(--text-color);

        &.tono-marca {
          color: var(--primary-color);
        }
        &.tono-exito {
          color: var(--success-color);
        }
        &.tono-peligro {
          color: var(--danger-color);
        }
      }

      .kpi-etiqueta {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: var(--text-color-secondary);
      }
    `,
  ],
})
export class KpisComponent {
  @Input({ required: true }) kpis: Kpi[] = [];
}
