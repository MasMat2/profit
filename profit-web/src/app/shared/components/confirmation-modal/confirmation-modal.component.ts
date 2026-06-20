import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationService, ConfirmationOptions } from '../../../services/confirmation.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss']
})
export class ConfirmationModalComponent implements OnInit, OnDestroy {
  isVisible = false;
  currentConfirmation: ConfirmationOptions & { id: string } | null = null;
  private subscription: Subscription;

  constructor(private confirmationService: ConfirmationService) {
    this.subscription = this.confirmationService.confirmation$.subscribe(confirmation => {
      this.currentConfirmation = confirmation;
      this.isVisible = true;
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onConfirm(): void {
    if (this.currentConfirmation) {
      this.confirmationService.respondToConfirmation(this.currentConfirmation.id, true);
      this.closeModal();
    }
  }

  onCancel(): void {
    if (this.currentConfirmation) {
      this.confirmationService.respondToConfirmation(this.currentConfirmation.id, false);
      this.closeModal();
    }
  }

  private closeModal(): void {
    this.isVisible = false;
    this.currentConfirmation = null;
  }

  getIconClass(): string {
    switch (this.currentConfirmation?.type) {
      case 'success':
        return 'fas fa-check-circle';
      case 'error':
        return 'fas fa-exclamation-circle';
      case 'warning':
        return 'fas fa-exclamation-triangle';
      case 'info':
      default:
        return 'fas fa-info-circle';
    }
  }

  getModalClass(): string {
    const baseClass = 'confirmation-modal';
    const typeClass = this.currentConfirmation?.type || 'info';
    return `${baseClass} ${baseClass}--${typeClass}`;
  }
}
