import { Component, Input, OnInit, OnDestroy } from '@angular/core';
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
    payment_details: {
      method: null,
      reference: ''
    }
  };


  // todo: homologate payment options
  paymentMethods = ['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia'];
  genders = ['Masculino', 'Femenino', 'Otro'];

  private saveSubscription!: Subscription;

  constructor(
    private clientService: ClientService,
    private modalService: ModalService
  ) { }

  ngOnInit(): void {
    // Create a deep copy of the client data to edit
    this.editedClient = JSON.parse(JSON.stringify(this.client));
    
    // Subscribe to save events from the modal
    this.saveSubscription = this.modalService.onSave$.subscribe(() => {
      this.onSave();
    });
  }

  ngOnDestroy(): void {
    if (this.saveSubscription) {
      this.saveSubscription.unsubscribe();
    }
  }

  onSave(): void {
    // Update the client on the server
    this.clientService.updateCliente(this.editedClient).subscribe({
      next: (updatedClient) => {
        this.editedClient = updatedClient;
      },
      error: (error) => {
        // You might want to show an error message to the user here
      }
    });
  }
}