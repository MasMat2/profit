import { Component, OnInit } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { Partner } from '../../models/partner.model';
import { PartnersService } from '../../services/partners.service';
import { PartnerModalComponent } from './partner-modal/partner-modal.component';
import { AppGridComponent } from '../../shared/app-grid/app-grid.component';

@Component({
  selector: 'app-partners-catalog',
  standalone: true,
  imports: [PartnerModalComponent, AppGridComponent],
  templateUrl: './partners-catalog.component.html',
  styleUrls: ['./partners-catalog.component.scss']
})
export class PartnersCatalogComponent implements OnInit {
  partners: Partner[] = [];
  showModal = false;
  selectedPartner: Partner | undefined;

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
    {
      field: 'sexo',
      headerName: 'Sexo',
      width: 120,
      valueFormatter: (p: any) => p.value === 'M' ? 'Masculino' : 'Femenino',
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
      headerName: 'Saldo',
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
      headerName: 'Acciones',
      width: 100,
      sortable: false,
      filter: false,
      floatingFilter: false,
      cellRenderer: () =>
        `<button style="background:none;border:none;cursor:pointer;color:#6B7280;font-size:16px;padding:4px 8px;border-radius:6px" title="Ver detalles"><i class="fas fa-eye"></i></button>`,
    },
  ];

  constructor(private partnersService: PartnersService) {}

  ngOnInit(): void {
    this.loadPartners();
  }

  loadPartners(): void {
    this.partnersService.getPartners({}).subscribe(partners => {
      this.partners = partners;
    });
  }

  openNewPartnerModal(): void {
    this.selectedPartner = undefined;
    this.showModal = true;
  }

  openPartnerModal(partner: Partner): void {
    this.selectedPartner = partner;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedPartner = undefined;
    this.loadPartners();
  }
}
