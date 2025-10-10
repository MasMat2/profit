import { Component, OnInit } from '@angular/core';
import { Category } from '../../services/category.service';
import { Plan } from '../../services/plans.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../services/client.service';
import { CategoryService } from '../../services/category.service';
import { PlansService } from '../../services/plans.service';
import { Client, EnrollmentRequest, ClientPlan } from '../../services/client.service';
import { SharedModalComponent } from '../shared/shared-modal/shared-modal.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModalComponent],
  providers: [CategoryService, PlansService],
  selector: 'app-enroll-client',
  templateUrl: './enroll-client.component.html',
  styleUrls: ['./enroll-client.component.css']
})
export class EnrollClientComponent implements OnInit {

    newClient: Client = {
        payment_details: { method: '', reference: '' }
    };

    plans: ClientPlan[] = [];

    enrollmentRequest: EnrollmentRequest = {
        client: this.newClient,
        plans: []
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
    selectedPlanId: number | null = null;
    planFechaInicio: string = '';
    planFechaFin: string = '';
    planEnEdicion: number | null = null;
    contractPreviewText: string = '';
    warningMessage: string | null = null;

    // Fecha mínima para el formulario
    today: string = new Date().toISOString().split('T')[0];

    private storageKey = 'enrollClientFormState';

    constructor(
        private clientDataService: ClientService,
        private categoryService: CategoryService,
        private plansService: PlansService
    ) {
        this.consultarCategorias();
        this.consultarPlanes();
        this.setDefaultStartDate();
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

    private setDefaultStartDate(): void {
        const today = new Date();
        this.planFechaInicio = today.toISOString().split('T')[0];
    }

    public ngOnInit(): void {
        // this.cargarEstadoFormulario();
    }

    startNewEnrollment(){}

    generateTicket(){}

    public submitWizard(): void {

        console.log(this.newClient);


        if(this.newClient.dob){
            const dobDate = new Date(this.newClient.dob);
            this.newClient.dob = dobDate.toISOString();
        }
        

        this.enrollmentRequest.client = this.newClient;
        this.enrollmentRequest.plans = this.plans;
        
        this.clientDataService.agregar(this.enrollmentRequest).subscribe();

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

    public addPlanToClient(): void {
        if (!this.selectedPlanId || !this.planFechaInicio) {
            console.warn('Plan ID y fecha de inicio son requeridos');
            return;
        }

        // Verificar si el plan ya está agregado
        const planExists = this.plans.some(p => p.plan_id === this.selectedPlanId);
        if (planExists && !this.planEnEdicion) {
            this.warningMessage = 'Este plan ya está agregado.';
            // this.showTicketModal = true;
            return;
        }

        const newPlan: ClientPlan = {
            plan_id: this.selectedPlanId,
            fecha_inicio: this.planFechaInicio,
            fecha_fin: this.planFechaFin || undefined
        };

        if(this.planEnEdicion){

            if (planExists && this.planEnEdicion != this.selectedPlanId) {
                this.warningMessage = 'Este plan ya está agregado.';
                return;
            }

            //  borrar plan de la lista y guardar indice
            const planIndex = this.plans.findIndex(p => p.plan_id === this.planEnEdicion);
            this.plans.splice(planIndex, 1);
            this.planEnEdicion = null;

            // insertar plan en el mismo indice
            this.plans.splice(planIndex, 0, newPlan);
        }else{
            this.plans.push(newPlan);
        }
        
        // Limpiar selección
        this.selectedPlanId = null;
        this.planFechaInicio = new Date().toISOString().split('T')[0];
        this.planFechaFin = '';
        
        this.guardarEstadoFormulario();
    }

    dismissWarning() {
        this.warningMessage = null;
    }

    public deletePlan(plan: ClientPlan) {
      this.plans.splice(this.plans.indexOf(plan), 1);
      this.guardarEstadoFormulario();
    }

    public getPlanName(planId: number): string {
        const plan = this.allPlans.find(p => p.id === planId);
        return plan ? plan.name : 'Plan no encontrado';
    }

    public guardarEstadoFormulario(): void {
        console.log(this.newClient);
        const state = {
            newClient: this.newClient,
            plans: this.plans,
            wizardStep: this.wizardStep,
            selectedCategoryId: this.selectedCategoryId,
            selectedPlanId: this.selectedPlanId,
            planFechaInicio: this.planFechaInicio,
            planFechaFin: this.planFechaFin
        };
        localStorage.setItem(this.storageKey, JSON.stringify(state));
    }

    public cargarEstadoFormulario(): void {
        const savedState = localStorage.getItem(this.storageKey);
        console.log(savedState);
        if (savedState) {
            const state = JSON.parse(savedState);
            this.newClient = state.newClient || this.newClient;
            this.plans = state.plans || [];
            this.wizardStep = state.wizardStep || this.wizardStep;
            this.selectedCategoryId = state.selectedCategoryId;
            this.selectedPlanId = state.selectedPlanId;
            this.planFechaInicio = state.planFechaInicio || this.planFechaInicio;
            this.planFechaFin = state.planFechaFin || '';

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

        console.log(this.filteredPlans);
        this.selectedPlanId = null; // Reset plan selection when category changes
        this.guardarEstadoFormulario();
    }

    public calculateEndDate(): void {
        const selectedPlan = this.allPlans.find(p => p.id === this.selectedPlanId);
        if (selectedPlan) {
            const endDate = new Date(this.planFechaInicio);
            endDate.setDate(endDate.getDate() + selectedPlan.duration);
            this.planFechaFin = endDate.toISOString().split('T')[0];
        }
    }

    public get selectedPlan(): Plan | undefined {
        return this.allPlans.find(p => p.id === this.selectedPlanId);
    }

    public get selectedPlanName(): string {
        return this.selectedPlan ? this.selectedPlan.name : 'No seleccionado';
    }

    public getPlanPrice(planId: number): number {
        const plan = this.allPlans.find(p => p.id === planId);
        return plan ? plan.price : 0;
    }

    editPlan(clientPlan: ClientPlan) {
        const plan = this.allPlans.find(p => p.id === clientPlan.plan_id);
        if (plan?.category_id) {
            this.onCategoryChange(plan.category_id);
        }
        this.planEnEdicion = clientPlan.plan_id;
        this.selectedPlanId = clientPlan.plan_id;
        this.planFechaInicio = clientPlan.fecha_inicio;
        this.calculateEndDate();
      }
} 