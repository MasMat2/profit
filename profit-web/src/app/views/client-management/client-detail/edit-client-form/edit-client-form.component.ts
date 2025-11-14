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



  // todo: homologate payment options
  paymentMethods = ['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia'];
  genders = ['Masculino', 'Femenino', 'Otro'];

  private saveSubscription!: Subscription;

  constructor(
    private clientService: ClientService,
    private modalService: ModalService
  ) { }

  ngOnInit(): void {
    this.normalizeClientDates();

    // Subscribe to save events from the modal
    this.saveSubscription = this.modalService.onSave$.subscribe(() => {
      this.onSave();
    });
  }

  private normalizeClientDates(): void {
    if (this.client.dob && typeof this.client.dob === 'string') {
      this.client.dob = this.client.dob.split('T')[0] as any;
    }
  }

  ngOnDestroy(): void {
    if (this.saveSubscription) {
      this.saveSubscription.unsubscribe();
    }
  }

  onSave(): void {
    // Update the client on the server
    this.clientService.updateCliente(this.client).subscribe({
      next: (updatedClient) => {
        this.client = updatedClient;
        this.normalizeClientDates();
      },
      error: (error) => {
        // You might want to show an error message to the user here
      }
    });
  }
}