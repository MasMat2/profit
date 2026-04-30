import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toast, ToastService } from '@services/shared/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
})
export class ToastComponent {
  private toastService = inject(ToastService);
  toasts$ = this.toastService.toasts$;

  dismiss(toast: Toast): void {
    this.toastService.dismiss(toast.id);
  }

  trackById(_: number, toast: Toast): number {
    return toast.id;
  }
}
