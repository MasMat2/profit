import { Component, OnInit } from '@angular/core';
import { Category } from '../../services/category.service';
import { Plan } from '../../services/plans.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Client } from '../../services/client.service';
import { ClientService } from '../../services/client.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-enroll-client',
  templateUrl: './enroll-client.component.html',
  styleUrls: ['./enroll-client.component.css']
})
export class EnrollClientComponent implements OnInit {

    newClient: Client = {
        payment_details: { method: '', reference: '' }
    };
    wizardStep = 1;
    enrollmentComplete = false;
    showTicketModal = false;
    lastEnrolledClientData: any = null;

    steps = [
        { label: 'Datos Personales' },
        { label: 'Selección de Plan' },
        { label: 'Info Adicional' },
        { label: 'Procesar Pago' },
        { label: 'Confirmación' }
    ];

    // --- Datos para la selección de planes ---
    allCategories: Category[] = [
        { id: 1, name: 'Acceso General', description: 'Acceso a todas las áreas comunes.' },
        { id: 2, name: 'Clases de Yoga', description: 'Acceso exclusivo a clases de yoga.' },
        { id: 3, name: 'Entrenamiento Personalizado', description: 'Incluye sesiones con entrenador.' }
    ];
    allPlans: Plan[] = [
        { id: 101, category_id: 1, name: 'Acceso Básico Mensual', description: 'Acceso de 8am a 5pm.', price: 29.99, duration: 30 },
        { id: 102, category_id: 1, name: 'Acceso VIP Mensual', description: 'Acceso ilimitado 24/7.', price: 49.99, duration: 30 },
        { id: 103, category_id: 2, name: 'Paquete 10 Clases de Yoga', description: 'Válido por 3 meses.', price: 89.99, duration: 90 },
        { id: 104, category_id: 3, name: 'Entrenamiento Personal 12 Sesiones', description: '12 sesiones con un entrenador certificado.', price: 250, duration: 60 }
    ];
    filteredPlans: Plan[] = [];
    selectedCategoryId: number | null = null;
    contractPreviewText: string = '';


    private storageKey = 'enrollClientFormState';

    
    

    constructor(
        private clientDataService: ClientService
    ) {}
    

    public ngOnInit(): void {
        // this.cargarEstadoFormulario();
    }

    startNewEnrollment(){}

    generateTicket(){}

    public submitWizard(): void {

        console.log(this.newClient);
        this.clientDataService.agregar(this.newClient).subscribe();




    
        this.lastEnrolledClientData = {
          clientName: this.newClient.first_name + ' ' + this.newClient.last_name
      }


    }


    public nextStep(): void {
        if (this.wizardStep < this.steps.length) { 
            this.wizardStep++;
            if (this.wizardStep === this.steps.length) { 
                // this.generateContractPreview();
            }
            this.guardarEstadoFormulario();
        }
    }

    public previousStep(): void {
        if (this.wizardStep > 1) {
          this.wizardStep--;
          this.guardarEstadoFormulario();
        }
      }
    


    public guardarEstadoFormulario(): void {
        const state = {
        newClient: this.newClient,
        wizardStep: this.wizardStep,
        selectedCategoryId: this.selectedCategoryId
        };
        localStorage.setItem(this.storageKey, JSON.stringify(state));
    }

    public cargarEstadoFormulario(): void {
        const savedState = localStorage.getItem(this.storageKey);
        console.log(savedState);
        if (savedState) {
        const state = JSON.parse(savedState);
        this.newClient = state.newClient;
        this.wizardStep = state.wizardStep;
        this.selectedCategoryId = state.selectedCategoryId;

        if (this.selectedCategoryId) {
            this.filteredPlans = this.allPlans.filter(p => p.category_id === this.selectedCategoryId);
        }
        }
    }

    public get selectedPlan(): Plan | undefined {
        return this.allPlans.find(p => p.id === this.newClient.plan_id);
    }


    public get selectedPlanName(): string {
        return this.selectedPlan ? this.selectedPlan.name : 'No seleccionado';
    }

} 