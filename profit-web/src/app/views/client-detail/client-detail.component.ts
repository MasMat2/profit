import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../services/client.service';
import { firstValueFrom, Subscription } from 'rxjs';
import { SharedModalComponent } from '../shared/shared-modal/shared-modal.component';
import { PlansService } from '../../services/plans.service';
import { ModalService } from '../../services/modal.service';
import { Client } from '../../services/client.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModalComponent],
  selector: 'app-client-detail',
  templateUrl: './client-detail.component.html',
  styleUrls: ['./client-detail.component.css']
})
export class ClientDetailComponent
{
  activeSubTab: 'memberships' | 'payments' = 'memberships';


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

  // saveSubscription: Subscription;

  constructor(
    private plansService: PlansService,
    private clientService: ClientService,
    private modalService: ModalService
  ) { 
      this.consultarCliente();
      // this.saveSubscription = this.modalService.onSave$.subscribe(() => {
      //   this.handleSave();
      // });
  }

  consultarCliente() {
    this.clientService.consultarCliente('amaxmunoz98@gmail.com').subscribe((client) => {
      this.client = client;
      this.consultarPlanes();
    });
  }

  consultarPlanes() {
    if (this.client.id) {
      this.plansService.consultarPorCliente(this.client.id).subscribe((memberships) => {
        this.memberships = memberships;
      });
    }
  }

  handleSave() {
    console.log('save');
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