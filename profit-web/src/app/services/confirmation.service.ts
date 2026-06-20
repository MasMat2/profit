import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationService {
  private confirmationSubject = new Subject<ConfirmationOptions & { id: string }>();
  private confirmationResultSubject = new Subject<{ id: string; confirmed: boolean }>();

  confirmation$ = this.confirmationSubject.asObservable();
  confirmationResult$ = this.confirmationResultSubject.asObservable();

  confirm(options: ConfirmationOptions): Observable<boolean> {
    const id = Math.random().toString(36).substr(2, 9);
    
    this.confirmationSubject.next({
      ...options,
      id,
      confirmText: options.confirmText || 'Confirmar',
      cancelText: options.cancelText || 'Cancelar',
      type: options.type || 'info'
    });

    return new Observable<boolean>(observer => {
      const subscription = this.confirmationResult$.subscribe(result => {
        if (result.id === id) {
          observer.next(result.confirmed);
          observer.complete();
          subscription.unsubscribe();
        }
      });
    });
  }

  respondToConfirmation(id: string, confirmed: boolean) {
    this.confirmationResultSubject.next({ id, confirmed });
  }
}
