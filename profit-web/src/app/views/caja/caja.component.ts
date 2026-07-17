import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CajaService, Corte, EstadoCaja } from '@services/caja.service';
import { MenuService } from '@services/shared/menu.service';
import { ToastService } from '@services/shared/toast.service';

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './caja.component.html',
  styleUrls: ['./caja.component.scss'],
})
export class CajaComponent implements OnInit {
  pageIcon: string;

  estado: EstadoCaja = { abierta: false, apertura: null };
  cortes: Corte[] = [];

  isLoadingEstado = false;
  isLoadingCortes = false;
  isProcessing = false;

  showCerrarForm = false;
  obsCierre = '';

  constructor(
    private cajaService: CajaService,
    private menuService: MenuService,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {
    const segment = this.route.snapshot.url[0]?.path;
    this.pageIcon = this.menuService.getIconByRoute(segment);
  }

  ngOnInit(): void {
    this.loadEstado();
    this.loadCortes();
  }

  loadEstado(): void {
    this.isLoadingEstado = true;
    this.cajaService.getEstado().subscribe({
      next: (data) => {
        this.estado = data;
        this.isLoadingEstado = false;
      },
      error: () => {
        this.isLoadingEstado = false;
        this.toast.show('Error al cargar el estado de la caja.', 'error');
      },
    });
  }

  loadCortes(): void {
    this.isLoadingCortes = true;
    this.cajaService.getCortes().subscribe({
      next: (data) => {
        this.cortes = data;
        this.isLoadingCortes = false;
      },
      error: () => {
        this.isLoadingCortes = false;
        this.toast.show('Error al cargar el historial de cortes.', 'error');
      },
    });
  }

  abrirCaja(): void {
    this.isProcessing = true;
    this.cajaService.abrirCaja().subscribe({
      next: (data) => {
        this.estado = data;
        this.isProcessing = false;
        this.toast.show('Caja abierta correctamente', 'success');
      },
      error: (err) => {
        this.isProcessing = false;
        const message = err?.error?.message ?? 'Error al abrir la caja';
        this.toast.show(message, 'error');
      },
    });
  }

  openCerrarForm(): void {
    this.obsCierre = '';
    this.showCerrarForm = true;
  }

  closeCerrarForm(): void {
    this.showCerrarForm = false;
  }

  confirmarCierre(): void {
    this.isProcessing = true;
    this.cajaService.cerrarCaja(this.obsCierre || undefined).subscribe({
      next: () => {
        this.isProcessing = false;
        this.showCerrarForm = false;
        this.toast.show('Corte de caja realizado correctamente', 'success');
        this.loadEstado();
        this.loadCortes();
      },
      error: (err) => {
        this.isProcessing = false;
        const message = err?.error?.message ?? 'Error al cerrar la caja';
        this.toast.show(message, 'error');
      },
    });
  }
}
