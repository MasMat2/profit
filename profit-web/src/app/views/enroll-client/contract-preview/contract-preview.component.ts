import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import html2pdf from 'html2pdf.js';
import { Client } from '../../../services/client.service';

interface PlanData {
  planName: string;
  categoryName: string;
  fecha_inicio: string;
  fecha_fin: string;
  price: number;
}

@Component({
  selector: 'app-contract-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contract-preview.component.html',
  styleUrls: ['./contract-preview.component.css']
})
export class ContractPreviewComponent {
  @Input() clientData: Client = { payment_details: { method: '', reference: '' } };
  @Input() plansData: PlanData[] = [];
  @Input() totalPrice: number = 0;
  @Input() paymentMethod: string = '';
  @Input() paymentReference: string = '';
  
  @ViewChild('contractContent') contractContent!: ElementRef;

  contractNumber: string = '';
  contractDate: Date = new Date();

  ngOnInit() {
    this.generateContractNumber();
  }

  generateContractNumber(): void {
    // Generate a unique contract number based on timestamp
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    this.contractNumber = `GYM-${timestamp}-${random}`;
  }

  getPDFoptions(): any {
    return {
      margin: 0,
      filename: `contrato-${this.clientData.first_name}-${this.clientData.last_name}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
    };
  }

    printContract(): void {
        const element = this.contractContent.nativeElement;
        const opt = this.getPDFoptions();
        
        // Generate PDF and open in new window for printing
        html2pdf().from(element).set(opt).output('bloburl').then((blobUrl: string) => {
            const printWindow = window.open(blobUrl, '_blank');
            if (printWindow) {
            printWindow.onload = () => {
                printWindow.print();
            };
            }
        });
    }

    saveToPDF(): void {
        const element = this.contractContent.nativeElement;
        const opt = this.getPDFoptions();
        
        html2pdf().from(element).set(opt).save();
        
    }
}
