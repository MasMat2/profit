import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-custom-switch',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-switch.component.html',
  styleUrls: ['./custom-switch.component.css']
})
export class CustomSwitchComponent {
  @Input() id: string = '';
  @Input() name: string = '';
  @Input() value: boolean = false;
  @Output() valueChange = new EventEmitter<boolean>();
  @Input() disabled: boolean = false;

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.checked;
    this.valueChange.emit(this.value);
  }
}