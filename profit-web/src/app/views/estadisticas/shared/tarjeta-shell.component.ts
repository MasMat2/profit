import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { OpcionEstadistica } from '../estadisticas.config';

// Marco compartido de las tarjetas: encabezado, acciones y estados. El contenido lo pone
// cada estadística por <ng-content>, para que ninguna quede atada a una gráfica genérica.
@Component({
  selector: 'app-tarjeta-shell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tarjeta-shell.component.html',
  styleUrls: ['./tarjeta-shell.component.scss'],
})
export class TarjetaShellComponent {
  @Input({ required: true }) opcion!: OpcionEstadistica;
  @Input() expandida = true;
  @Input() cargando = false;
  @Input() error: string | null = null;
  @Input() vacia = false;
  @Input() mensajeVacio = 'Sin movimientos en el periodo';

  @Output() alternar = new EventEmitter<void>();
  @Output() recargar = new EventEmitter<void>();
  @Output() quitar = new EventEmitter<void>();
}
