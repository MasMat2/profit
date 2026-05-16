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
      height: 320px;
      padding: 1rem;
      background: linear-gradient(to bottom, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0));
      border-radius: 8px;
    }

    canvas {
      max-height: 320px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.03));
    }

    :host {
      display: block;
      width: 100%;
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

    // Aplicar gradientes a los datasets
    const enhancedData = this.enhanceDataWithGradients(ctx, this.data);

    const defaultOptions: ChartConfiguration['options'] = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      plugins: {
        legend: {
          display: this.type === 'pie' || this.type === 'doughnut',
          position: 'bottom',
          labels: {
            boxWidth: 14,
            padding: 16,
            font: {
              size: 12,
              family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              weight: 500
            },
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.96)',
          padding: 14,
          cornerRadius: 10,
          titleFont: {
            size: 14,
            weight: 600,
            family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
          },
          bodyFont: {
            size: 13,
            family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
          },
          displayColors: true,
          boxWidth: 14,
          boxHeight: 14,
          boxPadding: 6,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1
        }
      },
      scales: this.type !== 'pie' && this.type !== 'doughnut' ? {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(209, 213, 219, 0.2)',
            lineWidth: 1
          },
          border: {
            display: false
          },
          ticks: {
            font: {
              size: 12,
              family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              weight: 500
            },
            color: '#6B7280',
            padding: 8
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
              size: 12,
              family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              weight: 500
            },
            color: '#6B7280',
            padding: 8
          }
        }
      } : undefined
    };

    const config: ChartConfiguration = {
      type: this.type,
      data: enhancedData,
      options: { ...defaultOptions, ...this.options }
    };

    this.chart = new Chart(ctx, config);
  }

  private enhanceDataWithGradients(ctx: CanvasRenderingContext2D, data: any): any {
    const canvas = ctx.canvas;
    const enhancedData = { ...data };

    if (enhancedData.datasets) {
      enhancedData.datasets = enhancedData.datasets.map((dataset: any, index: number) => {
        const enhancedDataset = { ...dataset };

        if (this.type === 'line') {
          // Gradiente para líneas
          const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
          const color = dataset.borderColor || '#4A90E2';
          
          gradient.addColorStop(0, this.hexToRgba(color, 0.3));
          gradient.addColorStop(1, this.hexToRgba(color, 0.01));
          
          enhancedDataset.backgroundColor = gradient;
          enhancedDataset.borderWidth = 3;
          enhancedDataset.pointRadius = 5;
          enhancedDataset.pointHoverRadius = 7;
          enhancedDataset.pointBackgroundColor = color;
          enhancedDataset.pointBorderColor = '#ffffff';
          enhancedDataset.pointBorderWidth = 2;
          enhancedDataset.pointHoverBorderWidth = 3;
          enhancedDataset.tension = 0.4;
          enhancedDataset.fill = true;
          
          // Sombra para la línea
          enhancedDataset.shadowOffsetX = 0;
          enhancedDataset.shadowOffsetY = 4;
          enhancedDataset.shadowBlur = 10;
          enhancedDataset.shadowColor = this.hexToRgba(color, 0.3);
          
        } else if (this.type === 'bar') {
          // Gradiente para barras
          const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
          const color = Array.isArray(dataset.backgroundColor) 
            ? dataset.backgroundColor[0] 
            : dataset.backgroundColor || '#4A90E2';
          
          if (typeof color === 'string' && color.startsWith('#')) {
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, this.adjustColor(color, -20));
            
            enhancedDataset.backgroundColor = gradient;
            enhancedDataset.borderRadius = 8;
            enhancedDataset.borderSkipped = false;
            enhancedDataset.borderWidth = 0;
          }
          
        } else if (this.type === 'doughnut' || this.type === 'pie') {
          // Mejorar colores para gráficos circulares
          if (Array.isArray(dataset.backgroundColor)) {
            enhancedDataset.backgroundColor = dataset.backgroundColor.map((color: string) => {
              return color;
            });
            enhancedDataset.borderWidth = 3;
            enhancedDataset.borderColor = '#ffffff';
            enhancedDataset.hoverBorderWidth = 4;
            enhancedDataset.hoverBorderColor = '#ffffff';
            enhancedDataset.hoverOffset = 8;
          }
        }

        return enhancedDataset;
      });
    }

    return enhancedData;
  }

  private hexToRgba(hex: string, alpha: number): string {
    if (!hex || !hex.startsWith('#')) return `rgba(74, 144, 226, ${alpha})`;
    
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private adjustColor(hex: string, amount: number): string {
    if (!hex || !hex.startsWith('#')) return hex;
    
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  updateChart(newData: any) {
    if (this.chart) {
      this.chart.data = newData;
      this.chart.update();
    }
  }
}
