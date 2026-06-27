import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AdministracionService, Parametros } from '../../services/administracion.service';
import { MenuService } from '../../services/shared/menu.service';
import { SharedModalComponent } from '../../components/shared-modal/shared-modal.component';
import { FormasPagoComponent } from './formas-pago/formas-pago.component';
import { ToastService } from '../../services/shared/toast.service';

@Component({
  selector: 'app-administracion',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModalComponent, FormasPagoComponent],
  templateUrl: './administracion.component.html',
  styleUrls: ['./administracion.component.scss'],
})
export class AdministracionComponent implements OnInit {
  parametros: Partial<Parametros> = {};

  isLoadingParametros = false;
  isSavingParametros = false;

  get paqvisvenceChecked(): boolean {
    return this.parametros.paqvisvence === 1;
  }

  set paqvisvenceChecked(val: boolean) {
    this.parametros.paqvisvence = val ? 1 : 0;
  }

  pageIcon: string;
  isFormasPagoModalOpen = false;

  constructor(
    private administracionService: AdministracionService,
    private menuService: MenuService,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {
    const segment = this.route.snapshot.url[0]?.path;
    this.pageIcon = this.menuService.getIconByRoute(segment);
  }

  ngOnInit(): void {
    this.loadParametros();
  }

  loadParametros(): void {
    this.isLoadingParametros = true;
    this.administracionService.getParametros().subscribe({
      next: (data) => {
        if (data) this.parametros = data;
        this.isLoadingParametros = false;
      },
      error: () => {
        this.isLoadingParametros = false;
      },
    });
  }

  guardarInformacion(): void {
    this.isSavingParametros = true;

    this.administracionService.updateParametros(this.parametros).subscribe({
      next: () => {
        this.isSavingParametros = false;
        this.toast.show('Información guardada correctamente', 'success');
      },
      error: () => {
        this.isSavingParametros = false;
        this.toast.show('Error al guardar. Intente de nuevo.', 'error');
      },
    });
  }

  openFormasPagoModal(): void {
    this.isFormasPagoModalOpen = true;
  }

  closeFormasPagoModal(): void {
    this.isFormasPagoModalOpen = false;
  }
}
