import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FingerprintCaptureComponent } from '../fingerprint-capture/fingerprint-capture.component';
import { ConfirmationModalComponent } from '../../../shared/confirmation-modal/confirmation-modal.component';
import { FingerprintData } from '../../../models/partner.model';

@Component({
  selector: 'app-fingerprint-modal',
  standalone: true,
  imports: [CommonModule, FingerprintCaptureComponent, ConfirmationModalComponent],
  templateUrl: './fingerprint-modal.component.html',
  styleUrls: ['./fingerprint-modal.component.scss']
})
export class FingerprintModalComponent implements OnInit {
  @Input() partnerName: string = '';
  @Input() partnerId: number = 0;
  @Input() existingFingerprint?: FingerprintData | null;
  @Output() close = new EventEmitter<void>();
  @Output() fingerprintSaved = new EventEmitter<FingerprintData>();
  @Output() fingerprintDeleted = new EventEmitter<void>();

  currentFingerprintData: FingerprintData | null = null;
  showConfirmDelete: boolean = false;

  ngOnInit(): void {
    if (this.existingFingerprint) {
      this.currentFingerprintData = this.existingFingerprint;
    }
  }

  onFingerprintCaptured(fingerprintData: FingerprintData): void {
    this.currentFingerprintData = fingerprintData;
    this.fingerprintSaved.emit(fingerprintData);
  }

  onFingerprintCleared(): void {
    this.showConfirmDelete = true;
  }

  confirmDelete(): void {
    this.currentFingerprintData = null;
    this.showConfirmDelete = false;
    this.fingerprintDeleted.emit();
  }

  cancelDelete(): void {
    this.showConfirmDelete = false;
  }

  onClose(): void {
    this.close.emit();
  }
}
