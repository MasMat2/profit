import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../../services/modal.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [ModalService], // Each modal gets its own instance
  selector: 'app-shared-modal',
  templateUrl: './shared-modal.component.html',
  styleUrls: ['./shared-modal.component.css']
})
export class SharedModalComponent {
  @Input() modalTitle: string = "";
  @Input() showSaveButton: boolean = true;
  @Input() size: 'small' | 'medium' | 'large' = 'medium'; // Default size

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  constructor(private modalService: ModalService) { }

  ngOnInit() {
    this.modalService.onClose$.subscribe(() => {
      this.close.emit();
    });
  }

  onSave() {
    this.save.emit();
    this.modalService.triggerSave();
  }

  onClose() {
    this.close.emit();
  }
} 