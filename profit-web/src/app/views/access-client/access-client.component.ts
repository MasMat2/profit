import { Component, OnInit } from '@angular/core';
import { Category } from '../../services/category.service';
import { Plan } from '../../services/plans.service';
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
    allCategories: Category[] = [];
    allPlans: Plan[] = [];
    filteredPlans: Plan[] = [];
    selectedCategoryId: number | null = null;
    contractPreviewText: string = '';


    private storageKey = 'enrollClientFormState';

    
    

    constructor(
        private clientDataService: ClientService,
        private categoryService: CategoryService,
        private plansService: PlansService
    ) {
        this.consultarCategorias();
        this.consultarPlanes();
    }

    public consultarCategorias() {
        this.categoryService.consultar().subscribe((categorias) => {
            this.allCategories = categorias;
        });
    }

    public consultarPlanes() {
        this.plansService.consultar().subscribe((planes) => {
            this.allPlans = planes;
        });
    }
    
    public ngOnInit(): void {
        // this.cargarEstadoFormulario();
    }

    startNewEnrollment(){}

    generateTicket(){}

    public submitWizard(): void {

        if(this.newClient.dob){
            const dobDate = new Date(this.newClient.dob);
            this.newClient.dob = dobDate.toISOString();
        }

        this.clientDataService.validarAcceso(this.newClient.email || '', this.newClient.dob || '').subscribe((client) => {
        
        });
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

    public onCategoryChange(categoryId: number): void {

        this.selectedCategoryId = categoryId;
        
        if (this.selectedCategoryId) {
          this.filteredPlans = this.allPlans.filter(p => p.category_id == this.selectedCategoryId);
        } else {
          this.filteredPlans = [];
        }
        this.newClient.plan_id = null; // Reseteamos la selección de plan
        this.guardarEstadoFormulario();
      }
    

    public get selectedPlan(): Plan | undefined {
        return this.allPlans.find(p => p.id === this.newClient.plan_id);
    }


    public get selectedPlanName(): string {
        return this.selectedPlan ? this.selectedPlan.name : 'No seleccionado';
    }

} 