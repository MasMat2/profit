import {
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import ApexCharts, { ApexOptions } from 'apexcharts';

// Wrapper mínimo sobre apexcharts. No se usa `ng-apexcharts` porque desde la 1.16 exige
// Angular >= 20 y aquí hay 19; apexcharts a secas no tiene peer deps de framework.
@Component({
  selector: 'app-apex-chart',
  standalone: true,
  template: `<div #host class="apex-host"></div>`,
  styles: [
    `
      .apex-host {
        width: 100%;
      }
    `,
  ],
})
export class ApexChartComponent implements OnChanges, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLDivElement>;

  @Input({ required: true }) options!: ApexOptions;

  private chart?: ApexCharts;
  private pendiente = false;
  private destruido = false;

  constructor(private zone: NgZone) {}

  ngOnChanges(): void {
    this.programarSincronizacion();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.destruirChart();
  }

  // El host puede no estar conectado al DOM todavía cuando corre ngOnChanges: la tarjeta
  // y su marco resuelven sus *ngIf en la misma pasada de detección de cambios y el orden
  // entre ambas vistas no está garantizado. ApexCharts exige un elemento ya conectado
  // (si no, falla con "Element not found"), así que el montaje se difiere al final de la
  // pasada, cuando el DOM ya está completo.
  private programarSincronizacion(): void {
    if (this.pendiente || !this.options) return;
    this.pendiente = true;

    // Las animaciones corren por rAF: fuera de la zona no disparan change detection.
    this.zone.runOutsideAngular(() => {
      setTimeout(() => {
        this.pendiente = false;
        this.sincronizar();
      });
    });
  }

  private sincronizar(): void {
    if (this.destruido) return;

    const host = this.host.nativeElement;
    if (!host.isConnected) {
      this.destruirChart();
      return;
    }

    if (!this.chart) {
      this.chart = new ApexCharts(host, this.options);
      void this.chart.render();
      return;
    }

    void this.chart.updateOptions(this.options, true, true);
  }

  private destruirChart(): void {
    // Si el render nunca llegó a completarse, destroy() revienta por dentro al buscar
    // nodos que no existen; no debe tumbar la vista que lo contiene.
    try {
      this.chart?.destroy();
    } catch {
      /* chart a medio construir */
    }
    this.chart = undefined;
  }
}
