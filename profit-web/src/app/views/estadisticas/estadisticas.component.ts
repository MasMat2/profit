import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EstadisticasService, Estadistica } from '../../services/estadisticas.service';
import { ChartComponent } from '../../shared/components/chart/chart.component';

interface EstadisticaConFiltros extends Estadistica {
  fechaInicio?: string;
  fechaFin?: string;
  mostrarFiltros?: boolean;
  periodoActivo?: 'semana' | 'mes' | 'anio' | 'todo' | 'personalizado' | null;
}

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartComponent],
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.scss'],
})
export class EstadisticasComponent implements OnInit {
  estadisticasAgregadas: EstadisticaConFiltros[] = [];
  estadisticasDisponibles: Estadistica[] = [];
  mostrarMenu = false;
  isLoading = false;
  
  // Estadísticas que requieren filtros de fecha
  estadisticasConFiltro = ['pagos', 'accesos', 'edades', 'paquetes', 'inscripciones', 'saldo', 'ingresos', 'tickets-global'];
  
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

  cargarDatosEstadistica(estadistica: EstadisticaConFiltros): void {
    const fechaInicio = estadistica.fechaInicio || undefined;
    const fechaFin = estadistica.fechaFin || undefined;
    console.log('Cargando datos para:', estadistica.tipo, 'Fecha inicio:', fechaInicio, 'Fecha fin:', fechaFin);
    
    switch (estadistica.tipo) {
      case 'genero':
        this.estadisticasService.getEstadisticaGenero(fechaInicio, fechaFin).subscribe({
          next: (data: any) => {
            console.log('Datos genero recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando genero:', err)
        });
        break;
      case 'edades':
        this.estadisticasService.getEstadisticaEdades(fechaInicio, fechaFin).subscribe({
          next: (data: any) => {
            console.log('Datos edades recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando edades:', err)
        });
        break;
      case 'paquetes':
        this.estadisticasService.getEstadisticaPaquetes(fechaInicio, fechaFin).subscribe({
          next: (data: any) => {
            console.log('Datos paquetes recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando paquetes:', err)
        });
        break;
      case 'inscripciones':
        this.estadisticasService.getEstadisticaInscripciones(fechaInicio, fechaFin).subscribe({
          next: (data: any) => {
            console.log('Datos inscripciones recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando inscripciones:', err)
        });
        break;
      case 'saldo':
        this.estadisticasService.getEstadisticaSaldo(fechaInicio, fechaFin).subscribe({
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
        this.estadisticasService.getEstadisticaPagos(fechaInicio, fechaFin).subscribe({
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
        this.estadisticasService.getEstadisticaAccesos(fechaInicio, fechaFin).subscribe({
          next: (data: any) => {
            console.log('Datos accesos recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando accesos:', err)
        });
        break;
      case 'ingresos':
        this.estadisticasService.getEstadisticaIngresos(fechaInicio, fechaFin).subscribe({
          next: (data: any) => {
            console.log('Datos ingresos recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando ingresos:', err)
        });
        break;
      case 'tickets-global':
        this.estadisticasService.getTicketsGlobal(fechaInicio, fechaFin).subscribe({
          next: (data: any) => {
            console.log('Datos tickets global recibidos:', data);
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando tickets global:', err)
        });
        break;
    }
  }

  // Métodos para preparar datos de gráficos
  getGeneroChartData(data: any) {
    const masculino = data?.masculino || 0;
    const femenino = data?.femenino || 0;

    return {
      labels: ['Masculino', 'Femenino'],
      datasets: [{
        data: [masculino, femenino],
        backgroundColor: [this.chartColors.primary, this.chartColors.pink],
        borderRadius: 6,
        borderSkipped: false,
        barThickness: 40
      }]
    };
  }

  // Método para calcular el porcentaje para las barras horizontales
  getBarPercentage(value: number, total: number): number {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  // Método para obtener el total de clientes
  getTotalClientes(data: any[]): number {
    if (!data || data.length === 0) return 0;
    return data.reduce((sum, item) => sum + (item.cantidad || 0), 0);
  }

  // Método para obtener total de cantidad (para edades)
  getTotalCantidad(data: any[]): number {
    if (!data || data.length === 0) return 0;
    return data.reduce((sum, item) => sum + (item.cantidad || 0), 0);
  }

  // Método para obtener total de usuarios (para paquetes)
  getTotalUsuarios(data: any[]): number {
    if (!data || data.length === 0) return 0;
    return data.reduce((sum, item) => sum + (item.usuarios || 0), 0);
  }

  // Método para asignar colores a las barras según el índice
  getBarColorClass(index: number): string {
    const colors = ['primary', 'pink', 'success', 'warning', 'purple'];
    return colors[index % colors.length];
  }

  // Método para asignar colores a métodos de pago (estilo imagen)
  getMetodoColorClass(index: number): string {
    const colors = ['gray', 'purple', 'success'];
    return colors[index % colors.length];
  }

  // Formatear mes (2024-01 -> Ene 2024)
  formatMes(mesStr: string): string {
    if (!mesStr) return '';
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const [anio, mes] = mesStr.split('-');
    return `${meses[parseInt(mes) - 1]} ${anio}`;
  }

  // Obtener monto máximo para calcular porcentaje
  getMaxMonto(data: any[]): number {
    if (!data || data.length === 0) return 0;
    return Math.max(...data.map(d => d.monto || 0));
  }

  // Obtener monto máximo para métodos de pago
  getMaxMontoMetodo(data: any[]): number {
    if (!data || data.length === 0) return 0;
    return Math.max(...data.map(d => d.monto || 0));
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

  formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Exportar tickets a Excel
  exportarTicketsAExcel(estadistica: EstadisticaConFiltros): void {
    if (!estadistica.data?.tickets || estadistica.data.tickets.length === 0) {
      alert('No hay tickets para exportar');
      return;
    }

    const tickets = estadistica.data.tickets;
    const totales = estadistica.data.totales;

    // Crear contenido CSV con método de pago
    const headers = ['Folio', 'Fecha', 'Cliente', 'Total', 'Método de Pago', 'Tipo'];
    const rows = tickets.map((t: any) => [
      t.ticket,
      new Date(t.fecha).toLocaleString('es-MX'),
      t.cliente,
      t.total.toFixed(2),
      t.metodoPago || 'Sin especificar',
      t.credito ? 'Crédito' : 'Contado'
    ]);

    // Resumen general
    rows.push([]);
    rows.push(['RESUMEN']);
    rows.push(['Total Día:', '', '', totales.dia.toFixed(2), '', '']);
    rows.push(['Total Mes:', '', '', totales.mes.toFixed(2), '', '']);
    rows.push(['Total Año:', '', '', totales.anio.toFixed(2), '', '']);
    rows.push(['Cantidad Tickets:', '', '', totales.cantidadTickets.toString(), '', '']);

    // Desglose por método de pago
    if (totales.porMetodo?.length > 0) {
      rows.push([]);
      rows.push(['DESGLOSE POR MÉTODO DE PAGO']);
      rows.push(['Método', 'Total', '', '', '', '']);
      totales.porMetodo.forEach((m: any) => {
        rows.push([m.metodo, m.monto.toFixed(2), '', '', '', '']);
      });
    }

    // Convertir a CSV
    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Crear blob y descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tickets_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Métodos para verificar si requiere filtro
  requiereFiltro(tipo: string): boolean {
    return this.estadisticasConFiltro.includes(tipo);
  }

  toggleFiltros(estadistica: EstadisticaConFiltros): void {
    estadistica.mostrarFiltros = !estadistica.mostrarFiltros;
  }

  aplicarFiltroEstadistica(estadistica: EstadisticaConFiltros): void {
    // Marcar como personalizado cuando se aplican filtros manuales
    estadistica.periodoActivo = 'personalizado';
    this.cargarDatosEstadistica(estadistica);
  }

  establecerPeriodoRapido(estadistica: EstadisticaConFiltros, periodo: 'semana' | 'mes' | 'anio' | 'todo'): void {
    const hoy = new Date();

    // Marcar el periodo como activo
    estadistica.periodoActivo = periodo;

    if (periodo === 'todo') {
      // Limpiar fechas para obtener todos los datos históricos
      estadistica.fechaInicio = undefined;
      estadistica.fechaFin = undefined;
    } else {
      let fechaInicio = new Date(hoy);

      switch(periodo) {
        case 'semana':
          fechaInicio.setDate(fechaInicio.getDate() - 7);
          break;
        case 'mes':
          fechaInicio.setDate(fechaInicio.getDate() - 30);
          break;
        case 'anio':
          fechaInicio.setDate(fechaInicio.getDate() - 365);
          break;
      }

      estadistica.fechaInicio = this.formatearFecha(fechaInicio);
      estadistica.fechaFin = this.formatearFecha(hoy);
    }

    this.cargarDatosEstadistica(estadistica);
  }

}
