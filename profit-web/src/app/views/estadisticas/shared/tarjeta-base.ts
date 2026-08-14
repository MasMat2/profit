import { Directive, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Observable } from 'rxjs';
import { OpcionEstadistica } from '../estadisticas.config';

// Estado común de las tarjetas: cada una decide qué consulta y cómo se pinta, pero todas
// comparten el ciclo de carga y la reacción al rango de fechas del contenedor.
@Directive()
export abstract class TarjetaBase<T> implements OnChanges {
  @Input({ required: true }) opcion!: OpcionEstadistica;
  @Input() expandida = true;
  @Input() desde = '';
  @Input() hasta = '';

  @Output() alternar = new EventEmitter<void>();
  @Output() quitar = new EventEmitter<void>();

  datos: T | null = null;
  cargando = false;
  error: string | null = null;

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['opcion']?.isFirstChange()) {
      this.cargar();
      return;
    }
    // Colapsar o expandir no debe re-consultar; el rango solo aplica a las que lo usan.
    if ((cambios['desde'] || cambios['hasta']) && this.opcion.usaRango) {
      this.cargar();
    }
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;

    this.consultar().subscribe({
      next: (datos) => {
        this.datos = datos;
        this.alRecibirDatos(datos);
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los datos.';
        this.cargando = false;
      },
    });
  }

  abstract get vacia(): boolean;

  // El contenido solo existe cuando hay algo que pintar. Incluye `expandida` a propósito:
  // al colapsar se destruye la gráfica en vez de dejarla en un DOM desconectado.
  get mostrarContenido(): boolean {
    return this.expandida && !this.cargando && !this.error && !!this.datos && !this.vacia;
  }

  protected abstract consultar(): Observable<T>;

  // Gancho para armar las opciones de la gráfica una sola vez por respuesta.
  protected alRecibirDatos(_datos: T): void {}
}
