import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModalComponent } from '@components/shared-modal/shared-modal.component';
import { GeneralTabComponent } from './general-tab/general-tab.component';
import { SuscripcionesTabComponent } from './suscripciones-tab/suscripciones-tab.component';

type SocioTab = 'general' | 'suscripciones' | 'ventas' | 'log';

@Component({
  selector: 'app-socio-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModalComponent, GeneralTabComponent, SuscripcionesTabComponent],
  templateUrl: './socio-modal.component.html',
  styleUrls: ['./socio-modal.component.scss'],
})
export class SocioModalComponent implements OnChanges {
  @Input() socioId?: number;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  activeTab: SocioTab = 'general';

  get isEditMode(): boolean {
    return !!this.socioId;
  }

  get modalTitle(): string {
    return this.isEditMode ? 'Editar Socio' : 'Agregar Socio';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['socioId']) {
      this.activeTab = 'general';
    }
  }

  selectTab(tab: SocioTab): void {
    this.activeTab = tab;
  }

  onGeneralSaved(): void {
    this.saved.emit();
  }

  onClose(): void {
    this.closed.emit();
  }
}
