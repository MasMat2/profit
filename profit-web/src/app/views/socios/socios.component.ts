import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MenuService } from '../../services/shared/menu.service';
import { SharedModalComponent } from '../../components/shared-modal/shared-modal.component';
import { ToastService } from '../../services/shared/toast.service';
import { AppGridComponent } from '../../components/app-grid/app-grid.component';
import { ColDef } from 'ag-grid-community';
import { SociosService } from '../../services/socios.service';

@Component({
  selector: 'app-socios',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModalComponent, AppGridComponent],
  templateUrl: './socios.component.html',
  styleUrls: ['./socios.component.scss'],
})
export class SociosComponent implements OnInit {

  pageIcon: string;

  socios: any[] = [];

  columnDefs: ColDef[] = [
    {
      field: 'id',
      headerName: 'ID',
      width: 80,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'nombre',
      headerName: 'Nombre',
      flex: 2,
      cellRenderer: (params: any) => `
        <div style="display:flex;align-items:center;gap:10px;height:100%">
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#F97316,#EA580C);display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0">
            <i class="fas fa-user" style="font-size:14px"></i>
          </div>
          <div>
            <div style="font-weight:600;color:#111827">${params.value}</div>
          </div>
        </div>`,
    },
    { field: 'telefono', headerName: 'Teléfono', width: 140 },
    { field: 'correo', headerName: 'Correo Electrónico', flex: 2 },
    {
      field: 'estatus',
      headerName: 'Estatus',
      width: 140,
      cellRenderer: (params: any) => {
        const styles: Record<string, string> = {
          Activo: 'background:#D1FAE5;color:#065F46',
          Inactivo: 'background:#FEE2E2;color:#991B1B',
          Suspendido: 'background:#FEF3C7;color:#92400E',
          Becado: 'background:#DBEAFE;color:#1E40AF',
        };
        const s = styles[params.value] ?? '';
        return `<span style="${s};padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;text-transform:uppercase">${params.value}</span>`;
      },
    },
    {
      field: 'saldo',
      headerName: 'Mensualidad',
      width: 130,
      filter: 'agNumberColumnFilter',
      valueFormatter: (p: any) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(p.value),
      cellStyle: (p: any) => ({ color: p.value >= 0 ? '#10B981' : '#EF4444', fontWeight: '600' }),
    },
    {
      field: 'fechaRegistro',
      headerName: 'F. Registro',
      width: 130,
      filter: 'agDateColumnFilter',
      valueFormatter: (p: any) => new Date(p.value).toLocaleDateString('es-MX'),
    },
    {
      field: 'tieneHuella',
      headerName: 'Huella',
      width: 90,
      sortable: false,
      filter: false,
      floatingFilter: false,
      cellRenderer: (params: any) => {
        const tieneHuella = params.value;
        const color = tieneHuella ? '#F97316' : '#D1D5DB';
        const title = tieneHuella ? 'Huella registrada' : 'Sin huella';
        return `<div style="display:flex;align-items:center;justify-content:center;height:100%">
          <i class="fas fa-fingerprint" style="font-size:18px;color:${color}" title="${title}"></i>
        </div>`;
      },
    },
    {
      headerName: 'Acciones',
      width: 180,
      sortable: false,
      filter: false,
      floatingFilter: false,
      cellRenderer: (params: any) => {
        const partner = params.data;
        const esActivo = partner.estatus === 'Activo' || partner.estatus === 'Becado';
        
        return `
          <div style="display:flex;align-items:center;justify-content:center;gap:4px;height:100%">
            <button 
              onclick="window['viewPartner'](${partner.id})" 
              style="background:none;border:none;cursor:pointer;color:#6B7280;font-size:16px;padding:4px 8px;border-radius:6px" 
              title="Ver detalles">
              <i class="fas fa-eye"></i>
            </button>
            ${esActivo ? 
              `<button 
                onclick="window['darDeBajaSocio'](${partner.socio}, ${partner.id})" 
                style="background:none;border:none;cursor:pointer;color:#EF4444;font-size:16px;padding:4px 8px;border-radius:6px" 
                title="Dar de baja">
                <i class="fas fa-user-slash"></i>
              </button>` :
              `<button 
                onclick="window['reactivarSocio'](${partner.socio}, ${partner.id})" 
                style="background:none;border:none;cursor:pointer;color:#10B981;font-size:16px;padding:4px 8px;border-radius:6px" 
                title="Reactivar socio">
                <i class="fas fa-user-check"></i>
              </button>`
            }
          </div>
        `;
      },
    },
  ];

  constructor(
    private menuService: MenuService,
    private route: ActivatedRoute,
    private toast: ToastService,
    private sociosService: SociosService
  ) {
    const segment = this.route.snapshot.url[0]?.path;
    this.pageIcon = this.menuService.getIconByRoute(segment);
  }

  ngOnInit(): void {
    this.loadPartners();
  }

  loadPartners(): void {
    this.sociosService.getAllSocios().subscribe(socios => {
      this.socios = socios;
    });
  }

  abrirModalSocio(event: any): void {
    console.log('Abrir modal socio', event);
  }



}
