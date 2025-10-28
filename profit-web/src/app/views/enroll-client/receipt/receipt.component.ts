import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ReceiptData {
  clientName: string;
  date: Date;
  items: ReceiptItem[];
  total: number;
  paymentMethod: string;
  paymentReference?: string;
}

export interface ReceiptItem {
  quantity: number;
  description: string;
  price: number;
}

@Component({
  selector: 'app-receipt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './receipt.component.html',
  styleUrls: ['./receipt.component.css']
})
export class ReceiptComponent {
  @Input() data!: ReceiptData;
  @Input() showPrintButton: boolean = true;

  printReceipt(): void {
    window.print();
  }
}
