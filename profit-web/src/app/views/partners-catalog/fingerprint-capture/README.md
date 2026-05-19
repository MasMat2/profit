# Componente de Captura de Huella Digital

## Descripción
Componente standalone de Angular para capturar huellas digitales usando el SDK de DigitalPersona. Se integra en el módulo de catálogo de socios para registrar la huella digital de nuevos socios.

## Características

### 🎨 Diseño
- Paleta de colores naranja (#F97316, #EA580C) siguiendo el estándar del módulo de socios
- Diseño minimalista y responsivo
- Animaciones suaves de captura
- Indicadores visuales de calidad de huella
- Estados de conexión del lector

### 🔧 Funcionalidad
- Detección automática del lector de huellas
- Captura de huella con indicador de progreso
- Validación de calidad de captura (0-100%)
- Vista previa de la huella capturada
- Opción para recapturar
- Modo simulación para desarrollo/pruebas

## Estructura de Datos

### FingerprintData Interface
```typescript
interface FingerprintData {
  fmd: string;           // Feature Minutiae Data (formato DigitalPersona)
  image?: string;        // Imagen en base64 (opcional)
  quality: number;       // Calidad de captura (0-100)
  captured: boolean;     // Indica si se capturó exitosamente
  fechaRegistro?: Date;  // Fecha de registro
}
```

## Integración con el Modal de Socios

### En partner-modal.component.html
```html
<div class="section-card fingerprint-card" *ngIf="!partner || partner.id === 0">
  <app-fingerprint-capture
    [existingFingerprint]="fingerprintData?.fmd"
    (fingerprintCaptured)="onFingerprintCaptured($event)"
    (fingerprintCleared)="onFingerprintCleared()"
  ></app-fingerprint-capture>
</div>
```

### En partner-modal.component.ts
```typescript
fingerprintData: FingerprintData | null = null;

onFingerprintCaptured(fingerprintData: FingerprintData): void {
  this.fingerprintData = {
    ...fingerprintData,
    fechaRegistro: new Date()
  };
}

onFingerprintCleared(): void {
  this.fingerprintData = null;
}
```

## Integración con Backend Java

### 1. SDK de DigitalPersona
El componente espera que el SDK de DigitalPersona esté disponible en `window.DPWebSDK`.

Para integrarlo, necesitas:
1. Instalar el SDK de DigitalPersona en el servidor
2. Exponer las funciones del SDK al navegador mediante una API REST

### 2. Estructura de datos a enviar
Cuando se crea un nuevo socio, el objeto enviado incluye:

```javascript
{
  nombre: "Juan Pérez",
  telefono: "1234567890",
  correo: "juan@example.com",
  // ... otros campos
  huella: {
    fmd: "STRING_FMD_DATA",
    image: "data:image/png;base64,...",
    quality: 85,
    captured: true,
    fechaRegistro: "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. Backend Java - Ejemplo de Endpoint

```java
@PostMapping("/socios")
public ResponseEntity<?> crearSocio(@RequestBody SocioDTO socioDTO) {
    // Guardar datos básicos del socio
    Socio socio = socioService.crearSocio(socioDTO);
    
    // Guardar huella digital si existe
    if (socioDTO.getHuella() != null && socioDTO.getHuella().getCaptured()) {
        HuellaDigital huella = new HuellaDigital();
        huella.setSocioId(socio.getId());
        huella.setFmd(socioDTO.getHuella().getFmd());
        huella.setCalidad(socioDTO.getHuella().getQuality());
        huella.setFechaRegistro(new Date());
        
        // Opcional: guardar imagen
        if (socioDTO.getHuella().getImage() != null) {
            huella.setImagen(socioDTO.getHuella().getImage());
        }
        
        huellaService.guardarHuella(huella);
    }
    
    return ResponseEntity.ok(socio);
}
```

### 4. Modelo Java - HuellaDigital

```java
@Entity
@Table(name = "huellas_digitales")
public class HuellaDigital {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "socio_id", nullable = false)
    private Long socioId;
    
    @Column(name = "fmd", columnDefinition = "TEXT", nullable = false)
    private String fmd;
    
    @Column(name = "imagen", columnDefinition = "LONGTEXT")
    private String imagen;
    
    @Column(name = "calidad")
    private Integer calidad;
    
    @Column(name = "fecha_registro")
    @Temporal(TemporalType.TIMESTAMP)
    private Date fechaRegistro;
    
    // Getters y Setters
}
```

### 5. Script SQL para crear tabla

```sql
CREATE TABLE huellas_digitales (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    socio_id BIGINT NOT NULL,
    fmd TEXT NOT NULL,
    imagen LONGTEXT,
    calidad INT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (socio_id) REFERENCES socios(id) ON DELETE CASCADE,
    INDEX idx_socio_id (socio_id)
);
```

## Verificación de Huellas

### Ejemplo de verificación Java
```java
public boolean verificarHuella(Long socioId, String fmdCapturado) {
    HuellaDigital huellaRegistrada = huellaService.obtenerPorSocioId(socioId);
    
    if (huellaRegistrada == null) {
        return false;
    }
    
    // Usar SDK de DigitalPersona para comparar
    DPFPVerification verificador = new DPFPVerification();
    DPFPTemplate templateRegistrado = DPFPTemplate.create(huellaRegistrada.getFmd());
    DPFPTemplate templateCapturado = DPFPTemplate.create(fmdCapturado);
    
    DPFPVerificationResult resultado = verificador.verify(
        templateCapturado, 
        templateRegistrado
    );
    
    return resultado.isVerified();
}
```

## Modo Simulación

Durante el desarrollo, si el SDK de DigitalPersona no está disponible, el componente entra automáticamente en **modo simulación**:

- Genera un FMD simulado: `"SIMULATED_FMD_" + timestamp`
- Crea una imagen SVG de placeholder
- Asigna una calidad del 85%
- Muestra mensaje: "Modo simulación activado"

Esto permite desarrollar y probar sin hardware de lector de huellas.

## Notas Importantes

1. **SDK de DigitalPersona**: Debe estar instalado en el servidor y expuesto al navegador
2. **Seguridad**: Los datos FMD deben transmitirse por HTTPS
3. **Almacenamiento**: El campo FMD debe ser TEXT o mayor en la base de datos
4. **Privacidad**: Cumplir con regulaciones de datos biométricos
5. **Calidad mínima**: Se recomienda aceptar solo huellas con calidad >= 60%

## Dependencias

- Angular 17+
- RxJS
- SDK de DigitalPersona U.are.U
- Font Awesome (para iconos)

## Autor
Sistema Profit - Módulo de Catálogo de Socios
