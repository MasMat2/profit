import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, ConfirmDialog } from '../../services/notification.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="confirm-overlay" *ngIf="dialog" (click)="cancel()">
      <div class="confirm-dialog" (click)="$event.stopPropagation()">
        <div class="confirm-header">
          <div class="confirm-icon">
            <i class="fas fa-question-circle"></i>
          </div>
          <h3>{{ dialog.title }}</h3>
        </div>
        <div class="confirm-body">
          <p>{{ dialog.message }}</p>
        </div>
        <div class="confirm-footer">
          <button class="btn-cancel" (click)="cancel()">
            {{ dialog.cancelText || 'Cancelar' }}
          </button>
          <button class="btn-confirm" (click)="confirm()">
            {{ dialog.confirmText || 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .confirm-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(4px);
      animation: fadeIn 0.2s ease-out;
    }

    .confirm-dialog {
      background-color: var(--surface-a);
      border-radius: 12px;
      width: 90%;
      max-width: 440px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: scaleIn 0.3s ease-out;
      overflow: hidden;
    }

    .confirm-header {
      padding: 1.75rem 2rem 1rem 2rem;
      text-align: center;

      .confirm-icon {
        width: 60px;
        height: 60px;
        margin: 0 auto 1rem auto;
        background: linear-gradient(135deg, var(--primary-color), #ea580c);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);

        i {
          font-size: 1.75rem;
          color: white;
        }
      }

      h3 {
        margin: 0;
        font-size: 1.375rem;
        font-weight: 700;
        color: var(--text-color);
      }
    }

    .confirm-body {
      padding: 1rem 2rem 1.5rem 2rem;
      text-align: center;

      p {
        margin: 0;
        color: var(--text-color-secondary);
        font-size: 1rem;
        line-height: 1.5;
      }
    }

    .confirm-footer {
      display: flex;
      gap: 0.75rem;
      padding: 1.5rem 2rem;
      border-top: 1px solid var(--surface-border);

      button {
        flex: 1;
        padding: 0.875rem 1.5rem;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.9375rem;
        cursor: pointer;
        transition: all 0.2s;

        &:active {
          transform: scale(0.98);
        }
      }

      .btn-cancel {
        background-color: var(--surface-c);
        color: var(--text-color);

        &:hover {
          background-color: var(--surface-d);
        }
      }

      .btn-confirm {
        background-color: var(--primary-color);
        color: white;

        &:hover {
          background-color: #ea580c;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(249, 115, 22, 0.3);
        }
      }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes scaleIn {
      from {
        transform: scale(0.9);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }
  `]
})
export class ConfirmDialogComponent implements OnInit {
  dialog: ConfirmDialog | null = null;

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.notificationService.confirmDialog$.subscribe(dialog => {
      this.dialog = dialog;
    });
  }

  confirm() {
    if (this.dialog) {
      this.dialog.onConfirm();
      this.notificationService.closeConfirm();
    }
  }

  cancel() {
    if (this.dialog) {
      this.dialog.onCancel?.();
      this.notificationService.closeConfirm();
    }
  }
}
