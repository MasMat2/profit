import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../services/shared/toast.service';
import { MenuService } from '../../services/shared/menu.service';
import { AccesoService, AccesoDto } from '../../services/acceso.service';

/**
 * Los dos modos de fallo, que antes se veían todos como "Acceso Denegado":
 *  - `denegado` : se identificó pero no puede pasar, o el número de socio no existe.
 *  - `servicio` : algo está roto. El socio no tiene la culpa y recepción necesita enterarse.
 */
export type TipoAviso = 'denegado' | 'servicio';

export interface Aviso {
  tipo: TipoAviso;
  titulo: string;
  mensaje: string;
  icono: string;
}

/**
 * Lo que permanece en pantalla el resultado de un intento de acceso — el suyo y el del que sigue.
 *
 * "Si no es interrumpido": cualquier intento nuevo pasa por `limpiarResultado()`, que cancela
 * este temporizador antes de armar el suyo, asi que en una fila el modal de cada socio lo cierra
 * el siguiente sin esperar los 15 s.
 */
const DURACION_RESULTADO_MS = 15000;

const DURACION_AVISO: Record<TipoAviso, number> = {
  denegado: DURACION_RESULTADO_MS,
  servicio: DURACION_RESULTADO_MS
};

@Component({
  selector: 'app-acceso-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './acceso-cliente.component.html',
  styleUrls: ['./acceso-cliente.component.scss']
})
export class AccesoClienteComponent implements OnDestroy {
  pageIcon: string;

  verificando: boolean = false;
  resultadoAcceso: AccesoDto | null = null;
  aviso: Aviso | null = null;

  private temporizadorAviso: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private accesoService: AccesoService,
    private toastService: ToastService,
    private menuService: MenuService,
    private route: ActivatedRoute
  ) {
    const segment = this.route.snapshot.url[0]?.path;
    this.pageIcon = this.menuService.getIconByRoute(segment);
  }

  ngOnDestroy(): void {
    if (this.temporizadorAviso) {
      clearTimeout(this.temporizadorAviso);
    }
  }

  /**
   * Único punto de entrada de una identificación por número de socio: la guarda de "ya hay una
   * verificación en curso" es una sola. Comparten el torniquete, así que dos identificaciones
   * encimadas registrarían doble asistencia al mismo socio.
   */
  private identificarSocio(socioId: number): void {
    if (this.verificando) {
      return;
    }
    this.verificando = true;
    this.limpiarResultado();
    this.cargarSocio(socioId);
  }

  private cargarSocio(socioId: number): void {
    this.accesoService.registrarAcceso(socioId).subscribe({
      next: (res: AccesoDto) => {
        if (res.acceso && res.socio) {
          this.resultadoAcceso = res;
          this.verificando = false;
          this.programarCierreDelResultado();
          this.toastService.show('Acceso registrado exitosamente', 'success');
        } else {
          this.mostrarAviso('denegado', res.motivo ?? 'Acceso denegado');
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error al registrar acceso:', err);
        this.mostrarAvisoDeError(err, 'No se pudo registrar el acceso. Intenta de nuevo.');
      }
    });
  }

  /**
   * Un servicio caído no es culpa del socio: distinguirlo evita que recepción mande a
   * re-enrolarse a gente cuya huella está perfectamente bien.
   */
  private mostrarAvisoDeError(err: HttpErrorResponse, mensajeGenerico: string): void {
    const inalcanzable = err.status === 0 || err.status >= 500;
    if (inalcanzable) {
      this.mostrarAviso('servicio', 'El sistema de acceso no está disponible. Pasa a recepción.');
    } else {
      this.mostrarAviso('denegado', mensajeGenerico);
    }
  }

  private static readonly TITULOS: Record<TipoAviso, string> = {
    denegado: 'Acceso Denegado',
    servicio: 'Servicio no disponible'
  };

  private static readonly ICONOS: Record<TipoAviso, string> = {
    denegado: 'fa-times-circle',
    servicio: 'fa-plug-circle-xmark'
  };

  private mostrarAviso(tipo: TipoAviso, mensaje: string, titulo?: string, icono?: string): void {
    this.verificando = false;
    this.resultadoAcceso = null;
    this.aviso = {
      tipo,
      titulo: titulo ?? AccesoClienteComponent.TITULOS[tipo],
      mensaje,
      icono: icono ?? AccesoClienteComponent.ICONOS[tipo]
    };

    if (this.temporizadorAviso) {
      clearTimeout(this.temporizadorAviso);
    }
    this.temporizadorAviso = setTimeout(() => this.limpiarResultado(), DURACION_AVISO[tipo]);
  }

  /** Captura manual: la forma en que recepción registra el acceso. */
  socioInput: string = '';

  verificarSocio(): void {
    const texto = this.socioInput.trim();
    // Estricto a propósito: aquí escribe una persona, y aceptar "12a3" como 123 registraría la
    // asistencia de otro socio sin que nadie lo note.
    const socioId = /^\d+$/.test(texto) ? Number(texto) : NaN;
    if (!Number.isSafeInteger(socioId) || socioId <= 0) {
      this.toastService.show('Ingresa un número de socio válido', 'error');
      return;
    }

    this.identificarSocio(socioId);
  }

  /**
   * Cierra solo el modal de acceso concedido. Los avisos ya lo hacen dentro de `mostrarAviso()`;
   * el exito no tenia temporizador y se quedaba en pantalla hasta el intento siguiente.
   */
  private programarCierreDelResultado(): void {
    if (this.temporizadorAviso) {
      clearTimeout(this.temporizadorAviso);
    }
    this.temporizadorAviso = setTimeout(() => this.limpiarResultado(), DURACION_RESULTADO_MS);
  }

  limpiarResultado() {
    this.resultadoAcceso = null;
    this.aviso = null;
    if (this.temporizadorAviso) {
      clearTimeout(this.temporizadorAviso);
      this.temporizadorAviso = null;
    }
    this.socioInput = '';
  }

  obtenerEstadoMembresia(fechaVencimiento?: string, becado?: boolean): { clase: string; texto: string } {
    if (becado) {
      return { clase: 'becado', texto: 'Beca activa' };
    }

    if (!fechaVencimiento) {
      return { clase: '', texto: '' };
    }

    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diasRestantes < 0) {
      return { clase: 'vencida', texto: 'Membresía vencida' }; // Cubierto por la revision de adeudos en el backend
    } else if (diasRestantes <= 7) {
      return { clase: 'proxima-vencer', texto: `Membresía vence en ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}` };
    } else {
      return { clase: 'vigente', texto: 'Membresía vigente' };
    }
  }
}
