import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../services/client.service';
import { firstValueFrom } from 'rxjs';
import { SharedModalComponent } from '../shared/shared-modal/shared-modal.component';
import { ClientDetailComponent } from '../client-detail/client-detail.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModalComponent, ClientDetailComponent],
  selector: 'app-client-management',
  templateUrl: './client-management.component.html',
  styleUrls: ['./client-management.component.css']
})
export class ClientManagementComponent implements OnInit {

  isModalOpen = false;

  activeTab: 'details' | 'documents' | 'history' = 'details';
  clients: any[] = [];
  filteredClients: any[] = [];
  searchTerm: string = '';
  
  constructor(private clientService: ClientService) { }

  async ngOnInit(): Promise<void> {
    this.clients = await firstValueFrom(this.clientService.obtenerClientes());
    this.filterClients();
  }

  filterClients(): void {
    this.filteredClients = this.clients;
  }

  viewClientContract(): void {
    this.activeTab = 'documents';
  }

  // --- Lógica del Modal de Usuario ---
  public openModal() {
    this.isModalOpen = true;
  }

  public closeModal() {
    this.isModalOpen = false;
  }


} 