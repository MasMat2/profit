import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-ticket-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-modal.component.html',
  styleUrls: ['./ticket-modal.component.scss']
})
export class TicketModalComponent implements OnInit {
  @Input() ticketData: any = null;
  @Output() cerrar = new EventEmitter<void>();
  
  empresa = {
    nombre: 'PROFIT',
    direccion: '',
    telefono: '',
    sucursal: ''
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarParametros();
  }

  cargarParametros(): void {
    this.http.get<any>('/administracion/parametros').subscribe({
      next: (data) => {
        if (data) {
          this.empresa = {
            nombre: data.empresa || 'PROFIT',
            direccion: [data.dir1, data.dir2, data.dir3].filter(d => d).join(', '),
            telefono: data.tels || '',
            sucursal: data.sucursal || ''
          };
        }
      },
      error: () => {
        // Error silencioso - se usan valores por defecto
      }
    });
  }

  cerrarModal(): void {
    this.cerrar.emit();
  }

  imprimir(): void {
    window.print();
  }

  formatFecha(fecha: Date): string {
    const f = new Date(fecha);
    const dia = String(f.getDate()).padStart(2, '0');
    const mes = String(f.getMonth() + 1).padStart(2, '0');
    const anio = f.getFullYear();
    const horas = String(f.getHours()).padStart(2, '0');
    const minutos = String(f.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
  }
}
