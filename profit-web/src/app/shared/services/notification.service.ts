import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface ConfirmDialog {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  private confirmDialogSubject = new BehaviorSubject<ConfirmDialog | null>(null);
  confirmDialog$ = this.confirmDialogSubject.asObservable();

  success(message: string, duration: number = 3000) {
    this.show('success', message, duration);
  }

  error(message: string, duration: number = 4000) {
    this.show('error', message, duration);
  }

  warning(message: string, duration: number = 3500) {
    this.show('warning', message, duration);
  }

  info(message: string, duration: number = 3000) {
    this.show('info', message, duration);
  }

  confirm(title: string, message: string, onConfirm: () => void, onCancel?: () => void) {
    this.confirmDialogSubject.next({
      title,
      message,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      onConfirm,
      onCancel
    });
  }

  closeConfirm() {
    this.confirmDialogSubject.next(null);
  }

  private show(type: Notification['type'], message: string, duration: number) {
    const notification: Notification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      message,
      duration
    };

    const current = this.notificationsSubject.value;
    this.notificationsSubject.next([...current, notification]);

    setTimeout(() => {
      this.remove(notification.id);
    }, duration);
  }

  remove(id: string) {
    const current = this.notificationsSubject.value;
    this.notificationsSubject.next(current.filter(n => n.id !== id));
  }
}
