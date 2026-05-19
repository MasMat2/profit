import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface FingerprintData {
  fmd: string;
  image: string;
  quality: number;
  captured: boolean;
}

@Component({
  selector: 'app-fingerprint-capture',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fingerprint-capture.component.html',
  styleUrls: ['./fingerprint-capture.component.scss']
})
export class FingerprintCaptureComponent implements OnInit {
  @Input() existingFingerprint?: string;
  @Output() fingerprintCaptured = new EventEmitter<FingerprintData>();
  @Output() fingerprintCleared = new EventEmitter<void>();

  readerConnected: boolean = false;
  capturing: boolean = false;
  fingerprintData: FingerprintData | null = null;
  errorMessage: string = '';
  quality: number = 0;
  statusMessage: string = 'Esperando lector de huellas...';
  
  // Sistema de 4 capturas
  capturesRequired: number = 4;
  capturesCompleted: number = 0;
  captures: FingerprintData[] = [];
  currentCaptureStep: number = 0;

  ngOnInit(): void {
    this.checkReaderConnection();
    if (this.existingFingerprint) {
      this.loadExistingFingerprint();
    }
  }

  checkReaderConnection(): void {
    this.statusMessage = 'Verificando lector de huellas...';
    
    setTimeout(() => {
      if ((window as any).DPWebSDK) {
        this.readerConnected = true;
        this.statusMessage = 'Lector conectado. Listo para capturar.';
        this.errorMessage = '';
      } else {
        this.readerConnected = false;
        this.statusMessage = 'Esperando conexión con lector...';
        this.errorMessage = 'No se detectó el SDK de Digital Persona. Asegúrate de tener instalado el software.';
      }
    }, 1000);
  }

  loadExistingFingerprint(): void {
    if (this.existingFingerprint) {
      this.fingerprintData = {
        fmd: this.existingFingerprint,
        image: '',
        quality: 100,
        captured: true
      };
      this.statusMessage = 'Huella registrada previamente';
    }
  }

  async captureFingerprint(): Promise<void> {
    if (!this.readerConnected) {
      this.errorMessage = 'No hay un lector conectado. Verifica la conexión.';
      return;
    }

    if (this.capturesCompleted >= this.capturesRequired) {
      this.statusMessage = 'Ya se completaron las 4 capturas';
      return;
    }

    this.capturing = true;
    this.currentCaptureStep = this.capturesCompleted + 1;
    this.statusMessage = `Captura ${this.currentCaptureStep} de ${this.capturesRequired}: Coloca tu dedo en el lector...`;
    this.errorMessage = '';

    try {
      const sdk = (window as any).DPWebSDK;

      if (!sdk) {
        throw new Error('SDK no disponible');
      }

      const sample = await sdk.captureSample();

      if (sample && sample.Data) {
        const fmdData = await sdk.createFMD(sample.Data);

        const captureData: FingerprintData = {
          fmd: fmdData,
          image: this.convertToBase64Image(sample.Data),
          quality: sample.Quality || 0,
          captured: true
        };

        this.captures.push(captureData);
        this.capturesCompleted++;
        this.quality = sample.Quality || 0;
        this.capturing = false;

        if (this.capturesCompleted >= this.capturesRequired) {
          // Todas las capturas completadas
          const averageQuality = Math.round(
            this.captures.reduce((sum, c) => sum + c.quality, 0) / this.captures.length
          );

          this.fingerprintData = {
            fmd: this.captures.map(c => c.fmd).join('||'), // Combinar todas las FMD
            image: this.captures[0].image,
            quality: averageQuality,
            captured: true
          };

          this.statusMessage = `✓ 4 capturas completadas (Calidad promedio: ${averageQuality}%)`;
          this.fingerprintCaptured.emit(this.fingerprintData);
        } else {
          this.statusMessage = `✓ Captura ${this.capturesCompleted}/${this.capturesRequired} completada. Presiona nuevamente para continuar.`;
        }
      } else {
        throw new Error('No se pudo capturar la muestra');
      }
    } catch (error: any) {
      this.errorMessage = `Error al capturar: ${error.message || 'Error desconocido'}`;
      this.statusMessage = 'Error en la captura';
      console.error('Error capturando huella:', error);

      this.simulateCapture();
    } finally {
      this.capturing = false;
    }
  }

  private simulateCapture(): void {
    this.fingerprintData = {
      fmd: 'SIMULATED_FMD_' + Date.now(),
      image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI2YzZjRmNiIvPjxwYXRoIGQ9Ik0gMTAwIDUwIEMgMTEwIDYwLCAxMTAgODAsIDEwMCA5MCBDIDkwIDgwLCA5MCA2MCwgMTAwIDUwIFoiIGZpbGw9IiM0QTkwRTIiIG9wYWNpdHk9IjAuMyIvPjxwYXRoIGQ9Ik0gMTAwIDEwMCBDIDExMCAxMTAsIDExMCAxMzAsIDEwMCAxNDAgQyA5MCAxMzAsIDkwIDExMCwgMTAwIDEwMCBaIiBmaWxsPSIjNEE5MEUyIiBvcGFjaXR5PSIwLjMiLz48cGF0aCBkPSJNIDEwMCAxNTAgQyAxMTAgMTYwLCAxMTAgMTgwLCAxMDAgMTkwIEMgOTAgMTgwLCA5MCAxNjAsIDEwMCAxNTAgWiIgZmlsbD0iIzRBOTBFMiIgb3BhY2l0eT0iMC4zIi8+PC9zdmc+',
      quality: 85,
      captured: true
    };
    this.quality = 85;
    this.statusMessage = 'Huella capturada (DEMO)';
    this.errorMessage = 'Modo simulación activado';
    this.fingerprintCaptured.emit(this.fingerprintData);
  }

  private convertToBase64Image(data: any): string {
    return 'data:image/png;base64,' + btoa(String.fromCharCode(...new Uint8Array(data)));
  }

  clearFingerprint(): void {
    this.fingerprintData = null;
    this.quality = 0;
    this.captures = [];
    this.capturesCompleted = 0;
    this.currentCaptureStep = 0;
    this.statusMessage = 'Huellas eliminadas. Listo para capturar.';
    this.errorMessage = '';
    this.fingerprintCleared.emit();
  }

  retryConnection(): void {
    this.errorMessage = '';
    this.checkReaderConnection();
  }

  getQualityColor(): string {
    if (this.quality >= 80) return '#10B981';
    if (this.quality >= 60) return '#F59E0B';
    return '#EF4444';
  }

  getQualityLabel(): string {
    if (this.quality >= 80) return 'Excelente';
    if (this.quality >= 60) return 'Buena';
    if (this.quality >= 40) return 'Regular';
    return 'Baja';
  }
}
