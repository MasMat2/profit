import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '@services/shared/toast.service';
import { Mensualidad, Socio, SociosService } from '@services/socios.service';
import { CobrarMensualidadModalComponent } from './cobrar-mensualidad-modal/cobrar-mensualidad-modal.component';
import {
  TicketCobroData,
  TicketCobroModalComponent,
} from '@components/ticket-cobro-modal/ticket-cobro-modal.component';

@Component({
  selector: 'app-socio-suscripciones-tab',
  standalone: true,
  imports: [CommonModule, CobrarMensualidadModalComponent, TicketCobroModalComponent],
  templateUrl: './suscripciones-tab.component.html',
  styleUrls: ['./suscripciones-tab.component.scss'],
})
export class SuscripcionesTabComponent implements OnChanges {
  @Input() socioId?: number;

  isLoading = false;
  socio: Partial<Socio> = {};

  mensualidades: Mensualidad[] = [];
  isLoadingMensualidades = false;

  showCobrarModal = false;
  showTicketModal = false;
  ticketData?: TicketCobroData;

  constructor(
    private sociosService: SociosService,
    private toast: ToastService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['socioId'] && this.socioId) {
      this.loadSocio(this.socioId);
      this.loadMensualidades();
    }
  }

  loadSocio(id: number): void {
    this.isLoading = true;
    this.sociosService.getSocioById(id).subscribe({
      next: (data) => {
        this.socio = { ...data };
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.show('Error al cargar la información del socio.', 'error');
      },
    });
  }

  loadMensualidades(): void {
    if (!this.socioId) return;
    this.isLoadingMensualidades = true;
    this.sociosService.getMensualidades(this.socioId).subscribe({
      next: (data) => {
        this.mensualidades = data;
        this.isLoadingMensualidades = false;
      },
      error: () => {
        this.isLoadingMensualidades = false;
        this.toast.show('Error al cargar las mensualidades del socio.', 'error');
      },
    });
  }

  abrirCobro(): void {
    if (!this.socioId) return;
    this.showCobrarModal = true;
  }

  onPagada(res: { socio: Socio; ticket: TicketCobroData }): void {
    this.socio = { ...res.socio };
    this.ticketData = res.ticket;
    this.showCobrarModal = false;
    this.showTicketModal = true; // encadena: abre el ticket
    this.loadMensualidades();
  }
}
