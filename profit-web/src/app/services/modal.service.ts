import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable() // NO providedIn: 'root' - allows component-level scoping
export class ModalService {
  private saveTriggered = new Subject<void>();
  
  public onSave$ = this.saveTriggered.asObservable();
  
  public triggerSave(): void {
    this.saveTriggered.next();
  }
}