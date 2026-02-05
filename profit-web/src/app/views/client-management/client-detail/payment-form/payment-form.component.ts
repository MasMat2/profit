import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '@services/payment.service';
import { PaymentInfo } from '@services/payment.service';
import { MetodoPago } from '@services/payment.service';
import { ModalService } from '@services/shared/modal.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-payment-form',
  templateUrl: './payment-form.component.html',
  styleUrls: ['./payment-form.component.css']
})
export class PaymentFormComponent implements OnInit {

  payment_method: number | null = null;

  payment_methods: MetodoPago[] = [];

  @Input() membershipId: number = 0;

  @Output() paymentSaved = new EventEmitter<void>();

  constructor(
    private paymentService: PaymentService,
    private modalService: ModalService
  ) { }

  ngOnInit(): void {

    this.modalService.onSave$.subscribe(() => {
      this.onSave();
    });

    this.paymentService.consultarMetodosPago().subscribe((payment_methods) => {
      this.payment_methods = payment_methods;
    });
    
  }

  guardarEstadoFormulario() { 
    
  }

  onSave() {

    const paymentInfo: PaymentInfo = {
      membership_id: this.membershipId,
      method: this.payment_method!
    };


    this.paymentService.guardarPago(paymentInfo).subscribe({
      next: () => {
        this.paymentSaved.emit();
      },
      error: (error) => {
        // You might want to show an error message to the user here
      }
    });
  }

}