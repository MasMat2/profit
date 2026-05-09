import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../../shared/services/notification.service';

interface Cliente {
  id: number;
  nombre: string;
  foto?: string;
  telefono?: string;
  correo?: string;
  fechaVencimiento?: Date;
  tipoMembresia?: string;
  montoPago?: number;
  visitasDisponibles?: number;
  vigenciaVisitas?: Date;
}

interface ResultadoAcceso {
  success: boolean;
  message: string;
  cliente?: Cliente;
  asistencia?: {
    success: boolean;
    fecha: Date;
  };
}

@Component({
  selector: 'app-access-client',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './access-client.component.html',
  styleUrls: ['./access-client.component.scss']
})
export class AccessClientComponent {
  huellaInput: string = '';
  verificando: boolean = false;
  resultadoAcceso: ResultadoAcceso | null = null;
  mostrarResultado: boolean = false;
  
  private apiUrl = '/acceso-clientes';

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) {}

  verificarHuella() {
    if (!this.huellaInput.trim()) {
      this.notificationService.warning('Por favor ingresa un código de huella');
      return;
    }

    this.verificando = true;
    this.mostrarResultado = false;

    this.http.post<ResultadoAcceso>(`${this.apiUrl}/verificar-huella`, {
      huella: this.huellaInput
    }).subscribe({
      next: (response) => {
        this.resultadoAcceso = response;
        this.mostrarResultado = true;
        this.verificando = false;
        
        if (response.success) {
          this.notificationService.success('Acceso registrado exitosamente');
          setTimeout(() => this.limpiarResultado(), 10000);
        }
      },
      error: (err) => {
        console.error('Error al verificar huella:', err);
        this.resultadoAcceso = {
          success: false,
          message: 'Socio no encontrado'
        };
        this.mostrarResultado = true;
        this.verificando = false;
        setTimeout(() => this.limpiarResultado(), 3000);
      }
    });
  }

  limpiarResultado() {
    this.mostrarResultado = false;
    this.resultadoAcceso = null;
    this.huellaInput = '';
  }

  simularAccesoPermitido() {
    this.verificando = true;
    this.mostrarResultado = false;
    
    setTimeout(() => {
      this.resultadoAcceso = {
        success: true,
        message: 'Acceso permitido',
        cliente: {
          id: 1001,
          nombre: 'Juan Pérez García',
          foto: '',
          telefono: '123-456-7890',
          correo: 'juan.perez@email.com',
          tipoMembresia: 'Mensual',
          montoPago: 500,
          fechaVencimiento: new Date(new Date().setDate(new Date().getDate() + 15)),
          visitasDisponibles: 12,
          vigenciaVisitas: new Date(new Date().setDate(new Date().getDate() + 30))
        },
        asistencia: {
          success: true,
          fecha: new Date()
        }
      };
      this.mostrarResultado = true;
      this.verificando = false;
      this.notificationService.success('Acceso registrado exitosamente');
      setTimeout(() => this.limpiarResultado(), 10000);
    }, 1500);
  }

  simularAccesoDenegado() {
    this.verificando = true;
    this.mostrarResultado = false;
    
    setTimeout(() => {
      this.resultadoAcceso = {
        success: false,
        message: 'Socio no encontrado'
      };
      this.mostrarResultado = true;
      this.verificando = false;
      setTimeout(() => this.limpiarResultado(), 3000);
    }, 1500);
  }

  obtenerEstadoMembresia(fechaVencimiento?: Date): { clase: string; texto: string } {
    if (!fechaVencimiento) {
      return { clase: '', texto: '' };
    }

    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0) {
      return { clase: 'vencida', texto: 'Vencida' };
    } else if (diasRestantes <= 7) {
      return { clase: 'proxima-vencer', texto: `Vence en ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}` };
    } else {
      return { clase: 'vigente', texto: 'Vigente' };
    }
  }
}
