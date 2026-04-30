import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
  dismissing: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts$ = new BehaviorSubject<Toast[]>([]);
  readonly toasts$ = this._toasts$.asObservable();

  private nextId = 0;
  private MESSAGE_TIMEOUT = 5000; // ms

  show(message: string, type: 'success' | 'error'): void {
    const id = this.nextId++;
    const toast: Toast = { id, message, type, dismissing: false };
    this._toasts$.next([...this._toasts$.value, toast]);

    setTimeout(() => this.dismiss(id), this.MESSAGE_TIMEOUT);
  }

  dismiss(id: number): void {
    this._toasts$.next(
      this._toasts$.value.map(t => t.id === id ? { ...t, dismissing: true } : t)
    );
    setTimeout(() => {
      this._toasts$.next(this._toasts$.value.filter(t => t.id !== id));
    }, 300);
  }
}
