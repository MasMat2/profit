import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdministracionService, Parametros } from '../../services/administracion.service';

@Component({
  selector: 'app-administracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './administracion.component.html',
  styleUrls: ['./administracion.component.scss'],
})
export class AdministracionComponent implements OnInit {
  parametros: Partial<Parametros> = {};

  isLoadingParametros = false;
  isSavingParametros = false;

  saveSuccess = false;
  saveError = false;

  get paqvisvenceChecked(): boolean {
    return this.parametros.paqvisvence === 1;
  }

  set paqvisvenceChecked(val: boolean) {
    this.parametros.paqvisvence = val ? 1 : 0;
  }

  constructor(private administracionService: AdministracionService) {}

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
    this.saveSuccess = false;
    this.saveError = false;

    this.administracionService.updateParametros(this.parametros).subscribe({
      next: () => {
        this.isSavingParametros = false;
        this.saveSuccess = true;
        setTimeout(() => (this.saveSuccess = false), 3000);
      },
      error: () => {
        this.isSavingParametros = false;
        this.saveError = true;
        setTimeout(() => (this.saveError = false), 3000);
      },
    });
  }

  openFormasPagoModal(): void {
    // TODO: Implementar lógica para abrir el modal de formas de pago
    console.log('Abrir modal de formas de pago');
  }
}
