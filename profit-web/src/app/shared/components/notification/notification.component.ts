import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notifications-container">
      <div 
        *ngFor="let notification of notifications"
        class="notification"
        [class.success]="notification.type === 'success'"
        [class.error]="notification.type === 'error'"
        [class.warning]="notification.type === 'warning'"
        [class.info]="notification.type === 'info'"
        [@slideIn]>
        <div class="notification-icon">
          <i class="fas" 
             [class.fa-check-circle]="notification.type === 'success'"
             [class.fa-exclamation-circle]="notification.type === 'error'"
             [class.fa-exclamation-triangle]="notification.type === 'warning'"
             [class.fa-info-circle]="notification.type === 'info'"></i>
        </div>
        <p class="notification-message">{{ notification.message }}</p>
        <button class="notification-close" (click)="close(notification.id)">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .notifications-container {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 400px;
    }

    .notification {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 1rem 1.25rem;
      background-color: var(--surface-a);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-left: 4px solid;
      animation: slideInRight 0.3s ease-out;

      &.success {
        border-left-color: #10B981;
        .notification-icon {
          color: #10B981;
        }
      }

      &.error {
        border-left-color: #EF4444;
        .notification-icon {
          color: #EF4444;
        }
      }

      &.warning {
        border-left-color: #F59E0B;
        .notification-icon {
          color: #F59E0B;
        }
      }

      &.info {
        border-left-color: var(--primary-color);
        .notification-icon {
          color: var(--primary-color);
        }
      }
    }

    .notification-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .notification-message {
      flex: 1;
      margin: 0;
      color: var(--text-color);
      font-size: 0.9375rem;
      line-height: 1.4;
    }

    .notification-close {
      background: none;
      border: none;
      color: var(--text-color-secondary);
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;

      &:hover {
        background-color: var(--surface-hover);
        color: var(--text-color);
      }

      i {
        font-size: 0.875rem;
      }
    }

    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @media (max-width: 768px) {
      .notifications-container {
        right: 1rem;
        left: 1rem;
        max-width: none;
      }
    }
  `]
})
export class NotificationComponent implements OnInit {
  notifications: Notification[] = [];

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.notificationService.notifications$.subscribe(notifications => {
      this.notifications = notifications;
    });
  }

  close(id: string) {
    this.notificationService.remove(id);
  }
}
