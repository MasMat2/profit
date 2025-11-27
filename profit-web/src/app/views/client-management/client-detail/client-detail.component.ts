import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../../services/client.service';
import { SharedModalComponent } from '../../shared/shared-modal/shared-modal.component';
import { PlansService } from '../../../services/plans.service';
import { ModalService } from '../../../services/modal.service';
import { Client } from '../../../services/client.service';
import { EditClientFormComponent } from './edit-client-form/edit-client-form.component';
import { Subscription } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModalComponent, EditClientFormComponent],
  selector: 'app-client-detail',
  templateUrl: './client-detail.component.html',
  styleUrls: ['./client-detail.component.css']
})
export class ClientDetailComponent implements OnInit
{
  @Input() email!: string;
  
  activeSubTab: 'memberships' | 'payments' = 'memberships';
  isEditModalOpen: boolean = false;


  client: Client = {
    payment_details: {
      method: null,
      reference: ''
    }
  };

  payments: any[] = [
    {
      id: 'TXN-001234',
      date: '2024-01-15',
      concept: 'Mensualidad Enero 2024 - Plan Premium',
      amount: 800,
      method: 'Tarjeta de Crédito',
      methodIcon: 'fas fa-credit-card'
    },
    {
      id: 'TXN-001567',
      date: '2024-02-15',
      concept: 'Mensualidad Febrero 2024 - Plan Premium',
      amount: 800,
      method: 'Transferencia',
      methodIcon: 'fas fa-university'
    },
    {
      id: 'TXN-001890',
      date: '2024-03-15',
      concept: 'Mensualidad Marzo 2024 - Plan Premium',
      amount: 800,
      method: 'Efectivo',
      methodIcon: 'fas fa-money-bill'
    }
  ];
  
  memberships: any[] = [];

  saveSubscription: Subscription;

  constructor(
    private plansService: PlansService,
    private clientService: ClientService,
    private modalService: ModalService
  ) { 
      this.saveSubscription = this.modalService.onSave$.subscribe(() => {
        this.handleSave();
      });
  }

  ngOnInit(): void {
    this.consultarCliente();
  }

  consultarCliente() {
    this.clientService.consultarCliente(this.email).subscribe((client) => {
      this.client = client;
      this.consultarPlanes();
    });
  }

  consultarPlanes() {
    if (this.client.id) {
      this.plansService.consultarPorCliente(this.client.id).subscribe((memberships) => {
        this.memberships = memberships;

      this.memberships.forEach((membership) => {
        const endDate = new Date(membership.fecha_inicio);
        membership.fecha_fin = new Date(endDate.setDate(endDate.getDate() + membership.plans.duration)).toISOString();
      });
      });
    }
  }

  openEditModal() {
    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
  }

  handleSave() {
  }

  ngOnDestroy() {
    // this.saveSubscription.unsubscribe();
  }


   getMembershipStatus(fechaInicio: string | Date, fechaFin: string | Date): string {
    const today = new Date();
    const startDate = new Date(fechaInicio);
    const endDate = new Date(fechaFin);


    if (today >= startDate && today <= endDate) {
      return 'Activo';
    } else {
      return 'Expirado';
    }
  }

  


} 