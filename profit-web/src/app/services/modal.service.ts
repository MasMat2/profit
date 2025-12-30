import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ModalService {
  private saveTriggered = new Subject<void>();
  private closeTriggered = new Subject<void>();
  
  public onSave$ = this.saveTriggered.asObservable();
  public onClose$ = this.closeTriggered.asObservable();
  
  public triggerSave(): void {
    this.saveTriggered.next();
  }

  public triggerClose(): void {
    this.closeTriggered.next();
  }
}

