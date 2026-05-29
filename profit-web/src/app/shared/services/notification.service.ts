import { Injectable } from '@angular/core';

export interface Notification {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications: Notification[] = [];
  private timeouts: Map<number, any> = new Map();

  success(message: string, duration: number = 3000) {
    this.show({ type: 'success', message, duration });
  }

  error(message: string, duration: number = 4000) {
    this.show({ type: 'error', message, duration });
  }

  warning(message: string, duration: number = 3500) {
    this.show({ type: 'warning', message, duration });
  }

  info(message: string, duration: number = 3000) {
    this.show({ type: 'info', message, duration });
  }

  private show(notification: Notification) {
    console.log(`[${notification.type.toUpperCase()}] ${notification.message}`);
    
    const index = this.notifications.length;
    this.notifications.push(notification);

    if (notification.duration && notification.duration > 0) {
      const timeout = setTimeout(() => {
        this.remove(index);
      }, notification.duration);
      this.timeouts.set(index, timeout);
    }
  }

  private remove(index: number) {
    const timeout = this.timeouts.get(index);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(index);
    }
    this.notifications.splice(index, 1);
  }

  getNotifications() {
    return this.notifications;
  }
}
