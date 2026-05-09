import { Component, Input, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [`
    .chart-container {
      position: relative;
      width: 100%;
      height: 300px;
    }

    canvas {
      max-height: 300px;
    }
  `]
})
export class ChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  @Input() type: 'line' | 'bar' | 'pie' | 'doughnut' = 'bar';
  @Input() data: any;
  @Input() options?: any;
  
  private chart: Chart | null = null;

  ngOnInit() {}

  ngAfterViewInit() {
    this.createChart();
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private createChart() {
    if (!this.chartCanvas || !this.data) {
      return;
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }

    // Destruir gráfico anterior si existe
    if (this.chart) {
      this.chart.destroy();
    }

    const defaultOptions: ChartConfiguration['options'] = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: this.type === 'pie' || this.type === 'doughnut',
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 15,
            font: {
              size: 11,
              family: 'Inter, sans-serif'
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          padding: 12,
          cornerRadius: 8,
          titleFont: {
            size: 13,
            weight: 'bold',
            family: 'Inter, sans-serif'
          },
          bodyFont: {
            size: 12,
            family: 'Inter, sans-serif'
          },
          displayColors: true,
          boxWidth: 12,
          boxHeight: 12
        }
      },
      scales: this.type !== 'pie' && this.type !== 'doughnut' ? {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(209, 213, 219, 0.3)'
          },
          border: {
            display: false
          },
          ticks: {
            font: {
              size: 11,
              family: 'Inter, sans-serif'
            }
          }
        },
        x: {
          grid: {
            display: false
          },
          border: {
            display: false
          },
          ticks: {
            font: {
              size: 11,
              family: 'Inter, sans-serif'
            }
          }
        }
      } : undefined
    };

    const config: ChartConfiguration = {
      type: this.type,
      data: this.data,
      options: { ...defaultOptions, ...this.options }
    };

    this.chart = new Chart(ctx, config);
  }

  updateChart(newData: any) {
    if (this.chart) {
      this.chart.data = newData;
      this.chart.update();
    }
  }
}
