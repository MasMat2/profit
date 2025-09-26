import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Client } from '../../services/client.service';
import { ClientService } from '../../services/client.service';
import { CategoryService } from '../../services/category.service';
import { PlansService } from '../../services/plans.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [CategoryService, PlansService],
  selector: 'app-access-client',
  templateUrl: './access-client.component.html',
  styleUrls: ['./access-client.component.css']
})
export class AccessClientComponent implements OnInit {

    newClient: Client = {
        payment_details: { method: '', reference: '' }
    };
    wizardStep = 1;
    accessComplete = false;
    invalidAccess = false;

    private storageKey = 'enrollClientFormState';
    

    constructor(
        private clientDataService: ClientService
    ) {
    }

    
    public ngOnInit(): void {
        // this.cargarEstadoFormulario();
    }


    public submitWizard(): void {

        if(this.newClient.dob){
            const dobDate = new Date(this.newClient.dob);
            this.newClient.dob = dobDate.toISOString();
        }

        this.clientDataService.validarAcceso(this.newClient.email || '', this.newClient.dob || '').subscribe((client) => {
            if(client){
                this.accessComplete = true;
            }else{
                this.newClient.email = '';
                this.newClient.dob = '';
                this.invalidAccess = true;
            }
        });
        }
        
   
    public newAccess(): void {
        this.accessComplete = false;
        this.newClient = {
            payment_details: { method: '', reference: '' }
        };
    }
} 