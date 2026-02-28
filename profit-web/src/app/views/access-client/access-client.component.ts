import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class AccessClientComponent implements OnInit, OnDestroy {

    newClient: Client = {};
    wizardStep = 1;
    accessComplete = false;
    invalidAccess = false;

    private loadedScripts: HTMLScriptElement[] = [];
 
    constructor(
        private clientDataService: ClientService
    ) {
    }

    public async ngOnInit(): Promise<void> {
        try {
            await this.loadScript('assets/scripts/es6-shim.js');
            await this.loadScript('assets/scripts/websdk.client.bundle.min.js');
            await this.loadScript('assets/scripts/fingerprint.sdk.min.js');
            // Now scripts are loaded, you can use their APIs
        } catch (error) {
            console.error('Script loading failed:', error);
        }
    }


    loadScript(src: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.body.appendChild(script);
            this.loadedScripts.push(script);
        });
    }
    
    ngOnDestroy() {
        this.loadedScripts.forEach(script => script.remove());
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
        this.newClient = {};
    }
} 