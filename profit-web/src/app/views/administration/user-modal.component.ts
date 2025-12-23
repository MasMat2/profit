import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="modal-dialog" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ user?.id === 0 ? 'Crear Usuario' : 'Editar Usuario' }}</h3>
          <button class="close-btn" (click)="onClose()">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-field">
              <label for="usuario">Usuario</label>
              <input 
                id="usuario" 
                type="text" 
                [(ngModel)]="user.usuario" 
                placeholder="Nombre de usuario">
            </div>
            
            <div class="form-field">
              <label for="nombre">Nombre Completo</label>
              <input 
                id="nombre" 
                type="text" 
                [(ngModel)]="user.nombre" 
                placeholder="Nombre completo">
            </div>
            
            <div class="form-field">
              <label for="puesto">Puesto</label>
              <input 
                id="puesto" 
                type="text" 
                [(ngModel)]="user.puesto" 
                placeholder="Puesto de trabajo">
            </div>
            
            <div class="form-field">
              <label for="email">Email</label>
              <input 
                id="email" 
                type="email" 
                [(ngModel)]="user.email" 
                placeholder="correo@ejemplo.com">
            </div>
            
            <div class="form-field">
              <label for="telefono">Teléfono</label>
              <input 
                id="telefono" 
                type="tel" 
                [(ngModel)]="user.telefono" 
                placeholder="555-1234">
            </div>
            
            <div class="form-field">
              <label for="pc">PC Asignada</label>
              <input 
                id="pc" 
                type="text" 
                [(ngModel)]="user.pc" 
                placeholder="Nombre de PC">
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" (click)="onClose()">Cancelar</button>
          <button class="btn-primary" (click)="onSave()">
            {{ user?.id === 0 ? 'Crear' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      opacity: 0;
      animation: fadeIn 0.3s forwards;
    }

    .modal-dialog {
      background-color: var(--surface-a);
      border-radius: var(--border-radius);
      width: 100%;
      max-width: 600px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.2);
      opacity: 0;
      transform: translateY(-20px);
      animation: slideInUp 0.4s forwards;
    }

    @keyframes fadeIn {
      to { opacity: 1; }
    }

    @keyframes slideInUp {
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 2rem;
      border-bottom: 1px solid var(--surface-border);
    }

    .modal-header h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-color);
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--text-color-secondary);
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.2s;
    }

    .close-btn:hover {
      background-color: var(--surface-hover);
      color: var(--text-color);
    }

    .modal-body {
      padding: 2rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
    }

    .form-field {
      display: flex;
      flex-direction: column;
    }

    .form-field label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-color-secondary);
      margin-bottom: 0.5rem;
    }

    .form-field input {
      padding: 0.75rem 1rem;
      border-radius: var(--border-radius);
      border: 1px solid var(--surface-border);
      background-color: var(--surface-b);
      color: var(--text-color);
      font-size: 1rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-field input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 20%, transparent);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem 2rem;
      border-top: 1px solid var(--surface-border);
    }

    .btn-secondary {
      padding: 0.75rem 1.5rem;
      border: 1px solid var(--surface-border);
      background-color: var(--surface-a);
      color: var(--text-color-secondary);
      border-radius: var(--border-radius);
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background-color: var(--surface-hover);
      color: var(--text-color);
    }

    .btn-primary {
      padding: 0.75rem 1.5rem;
      border: none;
      background-color: var(--primary-color);
      color: var(--primary-color-text);
      border-radius: var(--border-radius);
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      opacity: 0.9;
    }
  `]
})
export class UserModalComponent {
  @Input() user: any = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();

  onClose() {
    this.close.emit();
  }

  onSave() {
    if (this.user) {
      this.save.emit(this.user);
    }
  }

  onOverlayClick(event: Event) {
    this.onClose();
  }
}
