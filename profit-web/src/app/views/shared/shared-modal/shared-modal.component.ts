import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-shared-modal',
  templateUrl: './shared-modal.component.html',
  styleUrls: ['./shared-modal.component.css']
})
export class SharedModalComponent {
  @Input() user: any;
  @Input() modalTitle: string = "";
  @Input() showSaveButton: boolean = true;
  @Input() size: 'small' | 'medium' | 'large' = 'medium'; // Default size

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  editedUser: any;

  ngOnInit() {
    // Clonar el usuario para no modificar el original directamente
    this.editedUser = this.user ? { ...this.user } : {};
  }

  onSave() {
    this.save.emit(this.editedUser);
  }

  onClose() {
    this.close.emit();
  }
} 