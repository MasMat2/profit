import { Component, Input, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Client } from '../../../../services/client.service';
import { ModalService } from '../../../../services/modal.service';
import { Subscription } from 'rxjs';
import { ClientService } from '../../../../services/client.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-edit-client-form',
  templateUrl: './edit-client-form.component.html',
  styleUrls: ['./edit-client-form.component.css']
})
export class EditClientFormComponent implements OnInit, OnDestroy {
  @Input() client!: Client;


  editedClient: Client = {
      payment_details: { method: '', reference: '' }
  };

  // todo: homologate payment options
  paymentMethods = ['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia'];
  genders = ['Masculino', 'Femenino', 'Otro'];

  private saveSubscription!: Subscription;

  validateForm = false;

  constructor(
    private clientService: ClientService,
    private modalService: ModalService
  ) { }

  ngOnInit(): void {
    this.editedClient = JSON.parse(JSON.stringify(this.client));

    this.normalizeClientDates();

    // Subscribe to save events from the modal
    this.saveSubscription = this.modalService.onSave$.subscribe(() => {
      this.onSave();
    });
  }

  private normalizeClientDates(): void {
    if (this.editedClient.dob && typeof this.editedClient.dob === 'string') {
      this.editedClient.dob = this.editedClient.dob.split('T')[0] as any;
    }
  }

  ngOnDestroy(): void {
    if (this.saveSubscription) {
      this.saveSubscription.unsubscribe();
    }
  }

  onSave(): void {
    this.validateForm = true;

    if (!this.isValidForm()) {
      return;
    }

    // Update the client on the server
    this.clientService.updateCliente(this.editedClient).subscribe({
      next: (updatedClient) => {
        this.client = updatedClient;
        this.normalizeClientDates();
      },
      error: (error) => {
        // You might want to show an error message to the user here
      }
    });
  }

    public isValidForm(): boolean {
        return !!(this.editedClient.first_name && 
                 this.editedClient.last_name && 
                 this.editedClient.email && 
                 this.editedClient.phone && 
                 this.editedClient.dob);
    }
}