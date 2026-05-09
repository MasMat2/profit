import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadisticasService, Estadistica } from '../../services/estadisticas.service';
import { ChartComponent } from '../../shared/components/chart/chart.component';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, ChartComponent],
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.scss'],
})
export class EstadisticasComponent implements OnInit {
  estadisticasAgregadas: Estadistica[] = [];
  estadisticasDisponibles: Estadistica[] = [];
  mostrarMenu = false;
  isLoading = false;
  
  chartColors = {
    primary: '#F97316',
    secondary: '#FB923C',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    purple: '#8B5CF6',
    pink: '#EC4899',
    teal: '#14B8A6',
    cyan: '#06B6D4'
  };

  constructor(private estadisticasService: EstadisticasService) {}

  ngOnInit(): void {
    this.cargarEstadisticasDisponibles();
  }

  cargarEstadisticasDisponibles(): void {
    this.estadisticasService.getEstadisticas().subscribe({
      next: (data) => {
        this.estadisticasDisponibles = data;
      },
      error: () => {},
    });
  }

  toggleCard(estadistica: Estadistica): void {
    estadistica.expanded = !estadistica.expanded;
  }

  agregarEstadistica(): void {
    this.mostrarMenu = true;
  }

  cerrarMenu(): void {
    this.mostrarMenu = false;
  }

  seleccionarEstadistica(estadistica: Estadistica): void {
    if (!this.estadisticasAgregadas.find(e => e.id === estadistica.id)) {
      const nuevaEstadistica = { ...estadistica, expanded: true };
      this.estadisticasAgregadas.push(nuevaEstadistica);
      this.cargarDatosEstadistica(nuevaEstadistica);
    }
    this.mostrarMenu = false;
  }

  removerEstadistica(estadistica: Estadistica): void {
    this.estadisticasAgregadas = this.estadisticasAgregadas.filter(e => e.id !== estadistica.id);
  }

  estaAgregada(estadistica: Estadistica): boolean {
    return this.estadisticasAgregadas.some(e => e.id === estadistica.id);
  }

  cargarDatosEstadistica(estadistica: Estadistica): void {
    console.log('Cargando datos para:', estadistica.tipo);
    
    switch (estadistica.tipo) {
      case 'genero':
        this.estadisticasService.getEstadisticaGenero().subscribe({
          next: (data: any) => {
            console.log('Datos genero recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando genero:', err)
        });
        break;
      case 'edades':
        this.estadisticasService.getEstadisticaEdades().subscribe({
          next: (data: any) => {
            console.log('Datos edades recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando edades:', err)
        });
        break;
      case 'paquetes':
        this.estadisticasService.getEstadisticaPaquetes().subscribe({
          next: (data: any) => {
            console.log('Datos paquetes recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando paquetes:', err)
        });
        break;
      case 'inscripciones':
        this.estadisticasService.getEstadisticaInscripciones().subscribe({
          next: (data: any) => {
            console.log('Datos inscripciones recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando inscripciones:', err)
        });
        break;
      case 'saldo':
        this.estadisticasService.getEstadisticaSaldo().subscribe({
          next: (data: any) => {
            console.log('Datos saldo recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando saldo:', err)
        });
        break;
      case 'deudas':
        this.estadisticasService.getEstadisticaDeudas().subscribe({
          next: (data: any) => {
            console.log('Datos deudas recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando deudas:', err)
        });
        break;
      case 'pagos':
        this.estadisticasService.getEstadisticaPagos().subscribe({
          next: (data: any) => {
            console.log('Datos pagos recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando pagos:', err)
        });
        break;
      case 'membresias':
        this.estadisticasService.getEstadisticaMembresias().subscribe({
          next: (data: any) => {
            console.log('Datos membresias recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando membresias:', err)
        });
        break;
      case 'ingresos':
        this.estadisticasService.getEstadisticaIngresos().subscribe({
          next: (data: any) => {
            console.log('Datos ingresos recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando ingresos:', err)
        });
        break;
      case 'clientes':
        this.estadisticasService.getEstadisticaTiposClientes().subscribe({
          next: (data: any) => {
            console.log('Datos tipos clientes recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando tipos clientes:', err)
        });
        break;
      case 'accesos':
        this.estadisticasService.getEstadisticaAccesos().subscribe({
          next: (data: any) => {
            console.log('Datos accesos recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando accesos:', err)
        });
        break;
    }
  }

  // Métodos para preparar datos de gráficos
  getGeneroChartData(data: any) {
    return {
      labels: ['Masculino', 'Femenino'],
      datasets: [{
        data: [data.masculino || 0, data.femenino || 0],
        backgroundColor: [this.chartColors.info, this.chartColors.pink],
        borderWidth: 0
      }]
    };
  }

  getEdadesChartData(data: any[]) {
    return {
      labels: data.map(d => d.rango),
      datasets: [{
        label: 'Clientes',
        data: data.map(d => d.cantidad),
        backgroundColor: this.chartColors.primary,
        borderRadius: 6
      }]
    };
  }

  getPaquetesChartData(data: any[]) {
    return {
      labels: data.map(d => d.paquete),
      datasets: [{
        label: 'Usuarios',
        data: data.map(d => d.usuarios),
        backgroundColor: this.chartColors.success,
        borderRadius: 6
      }]
    };
  }

  getPagosChartData(data: any[]) {
    const colors = [
      this.chartColors.primary,
      this.chartColors.success,
      this.chartColors.info,
      this.chartColors.warning,
      this.chartColors.purple
    ];
    
    return {
      labels: data.map(d => d.tipoPago),
      datasets: [{
        data: data.map(d => d.monto),
        backgroundColor: colors.slice(0, data.length),
        borderWidth: 0
      }]
    };
  }

  getClientesChartData(data: any[]) {
    return {
      labels: data.map(d => d.tipo),
      datasets: [{
        label: 'Clientes',
        data: data.map(d => d.cantidad),
        backgroundColor: this.chartColors.secondary,
        borderRadius: 6
      }]
    };
  }

  getAccesosChartData(data: any[]) {
    return {
      labels: data.map(d => new Date(d.fecha).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Accesos',
        data: data.map(d => d.cantidad),
        borderColor: this.chartColors.primary,
        backgroundColor: this.chartColors.primary + '20',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: this.chartColors.primary,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    };
  }

  getIngresosMensualesChartData(data: any[]) {
    return {
      labels: data.map(d => {
        const [year, month] = d.mes.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
      }),
      datasets: [{
        label: 'Ingresos',
        data: data.map(d => d.monto),
        borderColor: this.chartColors.success,
        backgroundColor: this.chartColors.success + '20',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: this.chartColors.success,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    };
  }
}
