import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MenuService } from '@services/shared/menu.service';
import {
  CATALOGO_ESTADISTICAS,
  EstadisticaTipo,
  OpcionEstadistica,
  buscarOpcion,
} from './estadisticas.config';
import { TarjetaAdeudosComponent } from './tarjetas/adeudos.component';
import { TarjetaAltasBajasComponent } from './tarjetas/altas-bajas.component';
import { TarjetaAsistenciasComponent } from './tarjetas/asistencias.component';
import { TarjetaFormasPagoComponent } from './tarjetas/formas-pago.component';
import { TarjetaGeneroComponent } from './tarjetas/genero.component';
import { TarjetaIngresosComponent } from './tarjetas/ingresos.component';
import { TarjetaSociosPorClaseComponent } from './tarjetas/socios-por-clase.component';

const ALMACEN_ACTIVAS = 'estadisticas.activas';

export interface TarjetaActiva {
  id: string;
  opcion: OpcionEstadistica;
  expandida: boolean;
}

// El <input type="date"> trabaja en hora local; toISOString() adelantaría un día.
function toInputDate(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TarjetaGeneroComponent,
    TarjetaIngresosComponent,
    TarjetaAltasBajasComponent,
    TarjetaSociosPorClaseComponent,
    TarjetaFormasPagoComponent,
    TarjetaAdeudosComponent,
    TarjetaAsistenciasComponent,
  ],
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.scss'],
})
export class EstadisticasComponent implements OnInit {
  pageIcon: string;

  catalogo = CATALOGO_ESTADISTICAS;
  tarjetas: TarjetaActiva[] = [];
  mostrarSelector = false;

  // Lo que edita el usuario y lo que ya se aplicó: las tarjetas solo reaccionan al
  // rango aplicado para no re-consultar en cada tecla.
  desde = '';
  hasta = '';
  rangoDesde = '';
  rangoHasta = '';

  constructor(
    private menuService: MenuService,
    private route: ActivatedRoute,
    private elementRef: ElementRef<HTMLElement>,
  ) {
    const segment = this.route.snapshot.url[0]?.path;
    this.pageIcon = this.menuService.getIconByRoute(segment);
  }

  ngOnInit(): void {
    this.aplicarRangoPorDefecto();
    this.restaurarTarjetas();
  }

  get opcionesDisponibles(): OpcionEstadistica[] {
    const activas = new Set(this.tarjetas.map((tarjeta) => tarjeta.opcion.tipo));
    return this.catalogo.filter((opcion) => !activas.has(opcion.tipo));
  }

  // Cerrar el selector al hacer clic fuera de la página.
  @HostListener('document:click', ['$event'])
  onDocumentClick(evento: MouseEvent): void {
    if (!this.mostrarSelector) return;
    if (!this.elementRef.nativeElement.contains(evento.target as Node)) {
      this.mostrarSelector = false;
    }
  }

  alternarSelector(): void {
    this.mostrarSelector = !this.mostrarSelector;
  }

  agregar(tipo: EstadisticaTipo): void {
    const opcion = buscarOpcion(tipo);
    if (!opcion || this.tarjetas.some((tarjeta) => tarjeta.opcion.tipo === tipo)) return;

    this.tarjetas.push({ id: `${tipo}-${Date.now()}`, opcion, expandida: true });
    this.mostrarSelector = false;
    this.persistir();
  }

  quitar(id: string): void {
    this.tarjetas = this.tarjetas.filter((tarjeta) => tarjeta.id !== id);
    this.persistir();
  }

  alternar(tarjeta: TarjetaActiva): void {
    tarjeta.expandida = !tarjeta.expandida;
  }

  aplicarRango(): void {
    this.rangoDesde = this.desde;
    this.rangoHasta = this.hasta;
  }

  trackPorId(_indice: number, tarjeta: TarjetaActiva): string {
    return tarjeta.id;
  }

  private aplicarRangoPorDefecto(): void {
    const hoy = new Date();
    this.desde = toInputDate(new Date(hoy.getFullYear(), 1, 1));
    this.hasta = toInputDate(hoy);
    this.aplicarRango();
  }

  private restaurarTarjetas(): void {
    const guardado = localStorage.getItem(ALMACEN_ACTIVAS);

    // Sin nada guardado se arranca con las tres de cabecera para que la página no
    // aparezca vacía la primera vez.
    const tipos: EstadisticaTipo[] = guardado
      ? this.leerTiposGuardados(guardado)
      : ['ingresos', 'asistencias', 'genero'];

    this.tarjetas = tipos
      .map((tipo) => buscarOpcion(tipo))
      .filter((opcion): opcion is OpcionEstadistica => !!opcion)
      .map((opcion, indice) => ({
        id: `${opcion.tipo}-${indice}`,
        opcion,
        expandida: true,
      }));
  }

  private leerTiposGuardados(guardado: string): EstadisticaTipo[] {
    try {
      const tipos = JSON.parse(guardado);
      return Array.isArray(tipos) ? tipos : [];
    } catch {
      return [];
    }
  }

  private persistir(): void {
    const tipos = this.tarjetas.map((tarjeta) => tarjeta.opcion.tipo);
    localStorage.setItem(ALMACEN_ACTIVAS, JSON.stringify(tipos));
  }
}
