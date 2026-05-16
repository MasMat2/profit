import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EstadisticasService, Estadistica } from '../../services/estadisticas.service';
import { ChartComponent } from '../../shared/components/chart/chart.component';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartComponent],
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.scss'],
})
export class EstadisticasComponent implements OnInit {
  estadisticasAgregadas: Estadistica[] = [];
  estadisticasDisponibles: Estadistica[] = [];
  mostrarMenu = false;
  isLoading = false;
  
  // Filtros de fecha
  fechaInicio: string = '';
  fechaFin: string = '';
  periodoSeleccionado: 'hoy' | 'semana' | 'mes' | 'trimestre' | 'anio' | 'personalizado' = 'mes';
  mostrarFiltros = false;
  
  chartColors = {
    primary: '#4A90E2',      // Azul principal
    secondary: '#5BA3F5',    // Azul claro
    success: '#10B981',      // Verde
    danger: '#EF4444',       // Rojo
    warning: '#F59E0B',      // Ámbar
    info: '#3B82F6',         // Azul info
    purple: '#8B5CF6',       // Púrpura
    pink: '#EC4899',         // Rosa
    teal: '#14B8A6',         // Teal
    cyan: '#06B6D4',         // Cyan
    indigo: '#6366F1',       // Índigo
    orange: '#F97316'        // Naranja
  };

  constructor(private estadisticasService: EstadisticasService) {}

  ngOnInit(): void {
    this.cargarEstadisticasDisponibles();
    this.establecerPeriodoMes();
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
    console.log('Cargando datos para:', estadistica.tipo, 'Fecha inicio:', this.fechaInicio, 'Fecha fin:', this.fechaFin);
    
    switch (estadistica.tipo) {
      case 'genero':
        this.estadisticasService.getEstadisticaGenero(this.fechaInicio, this.fechaFin).subscribe({
          next: (data: any) => {
            console.log('Datos genero recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando genero:', err)
        });
        break;
      case 'edades':
        this.estadisticasService.getEstadisticaEdades(this.fechaInicio, this.fechaFin).subscribe({
          next: (data: any) => {
            console.log('Datos edades recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando edades:', err)
        });
        break;
      case 'paquetes':
        this.estadisticasService.getEstadisticaPaquetes(this.fechaInicio, this.fechaFin).subscribe({
          next: (data: any) => {
            console.log('Datos paquetes recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando paquetes:', err)
        });
        break;
      case 'inscripciones':
        this.estadisticasService.getEstadisticaInscripciones(this.fechaInicio, this.fechaFin).subscribe({
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
        this.estadisticasService.getEstadisticaPagos(this.fechaInicio, this.fechaFin).subscribe({
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
        this.estadisticasService.getEstadisticaIngresos(this.fechaInicio, this.fechaFin).subscribe({
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
        this.estadisticasService.getEstadisticaAccesos(this.fechaInicio, this.fechaFin).subscribe({
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
    const masculino = data?.masculino || 0;
    const femenino = data?.femenino || 0;
    
    // Si no hay datos, mostrar valores placeholder para que se vea la gráfica
    const chartData = (masculino === 0 && femenino === 0) 
      ? [1, 1]  // Valores iguales para mostrar la estructura
      : [masculino, femenino];
    
    return {
      labels: ['Masculino', 'Femenino'],
      datasets: [{
        data: chartData,
        backgroundColor: [this.chartColors.primary, this.chartColors.pink],
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverOffset: 10,
        spacing: 3
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
        borderRadius: 10,
        borderSkipped: false,
        barThickness: 'flex',
        maxBarThickness: 60
      }]
    };
  }

  getPaquetesChartData(data: any[]) {
    return {
      labels: data.map(d => d.paquete),
      datasets: [{
        label: 'Usuarios',
        data: data.map(d => d.usuarios),
        backgroundColor: this.chartColors.teal,
        borderRadius: 10,
        borderSkipped: false,
        barThickness: 'flex',
        maxBarThickness: 60
      }]
    };
  }

  getPagosChartData(data: any[]) {
    const colors = [
      this.chartColors.primary,
      this.chartColors.success,
      this.chartColors.purple,
      this.chartColors.orange,
      this.chartColors.teal,
      this.chartColors.indigo
    ];
    
    return {
      labels: data.map(d => d.tipoPago),
      datasets: [{
        data: data.map(d => d.monto),
        backgroundColor: colors.slice(0, data.length),
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverOffset: 10,
        spacing: 3
      }]
    };
  }

  getClientesChartData(data: any[]) {
    return {
      labels: data.map(d => d.tipo),
      datasets: [{
        label: 'Clientes',
        data: data.map(d => d.cantidad),
        backgroundColor: this.chartColors.indigo,
        borderRadius: 10,
        borderSkipped: false,
        barThickness: 'flex',
        maxBarThickness: 60
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
        backgroundColor: this.chartColors.primary + '30',
        tension: 0.4,
        fill: true,
        borderWidth: 3,
        pointBackgroundColor: this.chartColors.primary,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 3
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
        backgroundColor: this.chartColors.success + '30',
        tension: 0.4,
        fill: true,
        borderWidth: 3,
        pointBackgroundColor: this.chartColors.success,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 3
      }]
    };
  }

  // Métodos para filtros de fecha
  toggleFiltros(): void {
    this.mostrarFiltros = !this.mostrarFiltros;
  }

  seleccionarPeriodo(periodo: 'hoy' | 'semana' | 'mes' | 'trimestre' | 'anio' | 'personalizado'): void {
    this.periodoSeleccionado = periodo;
    
    switch(periodo) {
      case 'hoy':
        this.establecerPeriodoHoy();
        break;
      case 'semana':
        this.establecerPeriodoSemana();
        break;
      case 'mes':
        this.establecerPeriodoMes();
        break;
      case 'trimestre':
        this.establecerPeriodoTrimestre();
        break;
      case 'anio':
        this.establecerPeriodoAnio();
        break;
      case 'personalizado':
        // No hacer nada, el usuario seleccionará las fechas manualmente
        break;
    }

    if (periodo !== 'personalizado') {
      this.aplicarFiltros();
    }
  }

  establecerPeriodoHoy(): void {
    const hoy = new Date();
    this.fechaInicio = this.formatearFecha(hoy);
    this.fechaFin = this.formatearFecha(hoy);
  }

  establecerPeriodoSemana(): void {
    const hoy = new Date();
    const hace7Dias = new Date(hoy);
    hace7Dias.setDate(hace7Dias.getDate() - 7);
    this.fechaInicio = this.formatearFecha(hace7Dias);
    this.fechaFin = this.formatearFecha(hoy);
  }

  establecerPeriodoMes(): void {
    const hoy = new Date();
    const hace30Dias = new Date(hoy);
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    this.fechaInicio = this.formatearFecha(hace30Dias);
    this.fechaFin = this.formatearFecha(hoy);
  }

  establecerPeriodoTrimestre(): void {
    const hoy = new Date();
    const hace90Dias = new Date(hoy);
    hace90Dias.setDate(hace90Dias.getDate() - 90);
    this.fechaInicio = this.formatearFecha(hace90Dias);
    this.fechaFin = this.formatearFecha(hoy);
  }

  establecerPeriodoAnio(): void {
    const hoy = new Date();
    const hace365Dias = new Date(hoy);
    hace365Dias.setDate(hace365Dias.getDate() - 365);
    this.fechaInicio = this.formatearFecha(hace365Dias);
    this.fechaFin = this.formatearFecha(hoy);
  }

  formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  aplicarFiltros(): void {
    // Recargar todas las estadísticas agregadas con los nuevos filtros
    this.estadisticasAgregadas.forEach(estadistica => {
      this.cargarDatosEstadistica(estadistica);
    });
  }

  limpiarFiltros(): void {
    this.establecerPeriodoMes();
    this.periodoSeleccionado = 'mes';
    this.aplicarFiltros();
  }
}
