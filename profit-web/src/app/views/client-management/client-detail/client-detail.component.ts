import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../../services/client.service';
import { SharedModalComponent } from '../../shared/shared-modal/shared-modal.component';
import { MembershipService } from '../../../services/membership.service';
import { ModalService } from '@services/shared/modal.service';
import { Client } from '../../../services/client.service';
import { EditClientFormComponent } from './edit-client-form/edit-client-form.component';
import { firstValueFrom, Subscription } from 'rxjs';
import { PaymentService, Payment } from '../../../services/payment.service';
import { CustomSwitchComponent } from '../../shared/custom-switch/custom-switch.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModalComponent, EditClientFormComponent, CustomSwitchComponent],
  selector: 'app-client-detail',
  templateUrl: './client-detail.component.html',
  styleUrls: ['./client-detail.component.css']
})
export class ClientDetailComponent implements OnInit
{
  @Input() email!: string;
  
  activeSubTab: 'memberships' | 'payments' = 'memberships';
  isEditModalOpen: boolean = false;


  client: Client = {};

  payments: Payment[] = [];
  
  memberships: any[] = [];

  saveSubscription: Subscription;

  constructor(
    private membershipService: MembershipService,
    private paymentService: PaymentService,
    private clientService: ClientService,
    private modalService: ModalService
  ) { 
      this.saveSubscription = this.modalService.onSave$.subscribe(() => {
        this.handleSave();
      });
  }

  async ngOnInit(): Promise<void> {
    await this.consultarCliente();
    await this.consultarPagos();
    this.consultarMemberesias();
  }

  async consultarCliente() {
    this.client = await firstValueFrom(this.clientService.consultarCliente(this.email));
  }

  async consultarPagos() {
    if (this.client.id) {
      this.payments = await firstValueFrom(this.paymentService.consultarPorCliente(this.client.id));
    }
  }

  consultarMemberesias() {
    if (this.client.id) {
      this.membershipService.consultarPorCliente(this.client.id).subscribe((memberships) => {
        this.memberships = memberships;

        this.memberships.forEach((membership) => {

          // Calcular fecha fin
          const endDate = new Date(membership.fecha_inicio);
          membership.fecha_fin = new Date(endDate.setDate(endDate.getDate() + membership.plans.duration)).toISOString();


          // Calcular el estado de la membresía
          // tomar ultimo pago para este plan específico
          const planPayments = this.payments.filter(payment => payment.planes_clientes_id === membership.id);
          const lastPayment = planPayments.sort((a, b) => {
            if(b.periodo_inicio && a.periodo_inicio)
              return new Date(b.periodo_inicio).getTime() - new Date(a.periodo_inicio).getTime()
            else
              return 0;
          }
          )[0];
          if (lastPayment.pago_fecha) {
            membership.status = 'Activo';
          } else {
            membership.status = 'Expirado';
          }
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

  


} 