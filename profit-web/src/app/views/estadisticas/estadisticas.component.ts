import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EstadisticasService, Estadistica } from '../../services/estadisticas.service';

interface EstadisticaConFiltros extends Estadistica {
  fechaInicio?: string;
  fechaFin?: string;
  mostrarFiltros?: boolean;
  periodoActivo?: 'semana' | 'mes' | 'anio' | 'todo' | 'personalizado' | null;
}

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.scss'],
})
export class EstadisticasComponent implements OnInit {
  estadisticasAgregadas: EstadisticaConFiltros[] = [];
  estadisticasDisponibles: Estadistica[] = [];
  mostrarMenu = false;
  
  estadisticasConFiltro = ['pagos', 'accesos', 'edades', 'paquetes', 'inscripciones', 'saldo'];

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
    
    switch (estadistica.tipo) {
      case 'genero':
        this.estadisticasService.getEstadisticaGenero(fechaInicio, fechaFin).subscribe({
          next: (data: any) => {
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando genero:', err)
        });
        break;
      case 'edades':
        this.estadisticasService.getEstadisticaEdades(fechaInicio, fechaFin).subscribe({
          next: (data: any) => {
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando edades:', err)
        });
        break;
      case 'paquetes':
        this.estadisticasService.getEstadisticaPaquetes(fechaInicio, fechaFin).subscribe({
          next: (data: any) => {
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando paquetes:', err)
        });
        break;
      case 'inscripciones':
        this.estadisticasService.getEstadisticaInscripciones(fechaInicio, fechaFin).subscribe({
          next: (data: any) => {
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando inscripciones:', err)
        });
        break;
      case 'saldo':
        this.estadisticasService.getEstadisticaSaldo(fechaInicio, fechaFin).subscribe({
          next: (data: any) => {
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando saldo:', err)
        });
        break;
      case 'deudas':
        this.estadisticasService.getEstadisticaDeudas().subscribe({
          next: (data: any) => {
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando deudas:', err)
        });
        break;
      case 'pagos':
        this.estadisticasService.getEstadisticaPagos(fechaInicio, fechaFin).subscribe({
          next: (data: any) => {
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando pagos:', err)
        });
        break;
      case 'membresias':
        this.estadisticasService.getEstadisticaMembresias().subscribe({
          next: (data: any) => {
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando membresias:', err)
        });
        break;
      case 'clientes':
        this.estadisticasService.getEstadisticaTiposClientes().subscribe({
          next: (data: any) => {
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando tipos clientes:', err)
        });
        break;
      case 'accesos':
        this.estadisticasService.getEstadisticaAccesos(fechaInicio, fechaFin).subscribe({
          next: (data: any) => {
            estadistica.data = data;
          },
          error: (err) => console.error('Error cargando accesos:', err)
        });
        break;
    }
  }

  getBarPercentage(value: number, total: number): number {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  getTotalClientes(data: any[]): number {
    if (!data || data.length === 0) return 0;
    return data.reduce((sum, item) => sum + (item.cantidad || 0), 0);
  }

  getTotalCantidad(data: any[]): number {
    if (!data || data.length === 0) return 0;
    return data.reduce((sum, item) => sum + (item.cantidad || 0), 0);
  }

  getTotalUsuarios(data: any[]): number {
    if (!data || data.length === 0) return 0;
    return data.reduce((sum, item) => sum + (item.usuarios || 0), 0);
  }

  getBarColorClass(index: number): string {
    const colors = ['primary', 'pink', 'success', 'warning', 'purple'];
    return colors[index % colors.length];
  }

  formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  requiereFiltro(tipo: string): boolean {
    return this.estadisticasConFiltro.includes(tipo);
  }

  toggleFiltros(estadistica: EstadisticaConFiltros): void {
    estadistica.mostrarFiltros = !estadistica.mostrarFiltros;
  }

  aplicarFiltroEstadistica(estadistica: EstadisticaConFiltros): void {
    estadistica.periodoActivo = 'personalizado';
    this.cargarDatosEstadistica(estadistica);
  }

  establecerPeriodoRapido(estadistica: EstadisticaConFiltros, periodo: 'semana' | 'mes' | 'anio' | 'todo'): void {
    const hoy = new Date();
    estadistica.periodoActivo = periodo;

    if (periodo === 'todo') {
      estadistica.fechaInicio = '2000-01-01';
      estadistica.fechaFin = this.formatearFecha(hoy);
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
