import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '@services/shared/toast.service';
import { LogSocio, SociosService } from '@services/socios.service';

const ICONOS: Record<string, string> = {
  precio: 'fa-dollar-sign',
  clase: 'fa-dumbbell',
  pago: 'fa-cash-register',
  alta: 'fa-user-plus',
  baja: 'fa-user-minus',
  datos: 'fa-user-pen',
  general: 'fa-circle-info',
};

@Component({
  selector: 'app-socio-log-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './log-tab.component.html',
  styleUrls: ['./log-tab.component.scss'],
})
export class LogTabComponent implements OnChanges {
  @Input() socioId?: number;

  logs: LogSocio[] = [];
  isLoading = false;

  constructor(
    private sociosService: SociosService,
    private toast: ToastService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['socioId'] && this.socioId) {
      this.loadLogs();
    }
  }

  loadLogs(): void {
    if (!this.socioId) return;
    this.isLoading = true;
    this.sociosService.getLogs(this.socioId).subscribe({
      next: (data) => {
        this.logs = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.show('Error al cargar el log de modificaciones del socio.', 'error');
      },
    });
  }

  iconoDe(tipo: string): string {
    return ICONOS[tipo] ?? ICONOS['general'];
  }
}
