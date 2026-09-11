import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { mensajeCalidad } from './calidad-huella';

declare var Fingerprint: any;

/**
 * Respiro entre cerrar la captura y volver a abrirla. Ver `reArmarCaptura()`.
 *
 * `stopAcquisition` es asincrono: con 300 ms el `startAcquisition` siguiente llegaba pisando el
 * cierre y fallaba con "Communication failure.", que el SDK convierte en `onCommunicationFailed`
 * — el aviso de Lite Client caido, en un lector que estaba leyendo bien.
 */
const RESPIRO_REARMADO_MS = 800;

/** Espera del segundo intento de re-armado, si el primero llega demasiado pronto igual. */
const REINTENTO_REARMADO_MS = 2000;

/**
 * Dueño del `Fingerprint.WebApi`: enumera el lector, mantiene la captura armada y reintenta sola
 * ante fallos transitorios. No sabe nada de identificación ni de la pantalla — sólo entrega
 * muestras crudas y estado del hardware; la política de qué hacer con cada una vive en quien la
 * consuma.
 *
 * Con ámbito de componente (se declara en `providers` de `AccesoClienteComponent`, no
 * `providedIn: 'root'`): mantiene el `sdk` y el UID del lector propios de esta pantalla, y
 * Angular la destruye —llamando a `ngOnDestroy` de aquí, que cierra la captura— junto con el
 * componente.
 */
@Injectable()
export class FingerprintReaderService implements OnDestroy {
  private sdk: any = null;
  /** UID del lector en uso, de `enumerateDevices()`. Ver `iniciarCaptura()`. */
  private lectorUid: string | null = null;
  /** Captura activa. Sin esto `onDeviceConnected` se realimenta: ver `onDeviceConnected`. */
  private capturando = false;
  /** Hay un reintento de re-armado en curso: ver `iniciarCaptura()`. */
  private reintentandoRearmado = false;

  /** Muestra ya parseada (el `Data` del SDK), lista para mandar a identificar. */
  private _muestra$ = new Subject<string>();
  readonly muestra$ = this._muestra$.asObservable();

  /** Mensaje de calidad de una captura mala, ya traducido por `mensajeCalidad`. */
  private _calidad$ = new Subject<string>();
  readonly calidad$ = this._calidad$.asObservable();

  /** El SDK reportó un error de captura puntual (no persistente: ver `errorLector$`). */
  private _errorCaptura$ = new Subject<void>();
  readonly errorCaptura$ = this._errorCaptura$.asObservable();

  /** Estado de error persistente del lector/canal; `null` cuando está sano. */
  private _errorLector$ = new Subject<string | null>();
  readonly errorLector$ = this._errorLector$.asObservable();

  iniciar(): void {
    if (typeof Fingerprint === 'undefined') {
      this._errorLector$.next('Fingerprint SDK no disponible.');
      return;
    }

    this.sdk = new Fingerprint.WebApi();

    this.sdk.onSamplesAcquired = (s: any) => {
      // El lector acaba de entregar una muestra: cualquier aviso de canal caido que siga en
      // pantalla es viejo. Sin esto un fallo transitorio del re-armado deja el bloque de error
      // puesto para siempre sobre un lector que funciona.
      this._errorLector$.next(null);
      try {
        const samples = JSON.parse(s.samples);
        const data: string = samples[0]?.Data;
        if (data) {
          this._muestra$.next(data);
        }
      } catch (err) {
        console.error('Error al procesar la muestra de huella:', err);
      } finally {
        // Sin esto solo llega la primera muestra: el lector sigue reportando calidad buena y no
        // vuelve a emitir `onSamplesAcquired` nunca mas. Lo que re-arma el canal es el
        // `stopAcquisition` de aqui dentro, no el `startAcquisition` que va detras — medido en el
        // kiosco: las muestras siguen llegando incluso cuando ese start falla.
        //
        // Va en el `finally` para que una muestra que no se pudo parsear no deje el lector mudo.
        this.reArmarCaptura();
      }
    };

    // Sin estos manejadores, una captura mala no producía ninguna señal: el socio se quedaba
    // esperando frente al lector sin saber que tenía que volver a intentar.
    this.sdk.onQualityReported = (e: any) => {
      this._errorLector$.next(null);
      const mensaje = mensajeCalidad(Number(e?.quality));
      if (mensaje) {
        this._calidad$.next(mensaje);
      }
    };

    this.sdk.onErrorOccurred = (e: any) => {
      console.error('Error del lector de huellas:', e?.error);
      this._errorCaptura$.next();
    };

    // Desconexión y caída del Lite Client son condiciones persistentes, no eventos puntuales:
    // van al estado fijo del lector, no a un aviso puntual.
    this.sdk.onDeviceDisconnected = () => {
      this.capturando = false;
      this._errorLector$.next('Lector de huellas desconectado.');
    };

    // Vuelve a enumerar en vez de reusar el UID viejo: si reconectan otro lector, el anterior
    // ya no existe y capturar contra el UID guardado fallaria en silencio.
    //
    // Pero solo cuando NO hay captura activa. El SDK emite `onDeviceConnected` como respuesta a
    // `startAcquisition`, asi que re-capturar aqui es un bucle que se realimenta solo: se midieron
    // 4010 vueltas en 7 minutos, y entre vuelta y vuelta la captura se reiniciaba antes de que
    // llegara la muestra. El sintoma era un lector que reportaba calidad y no entregaba nada.
    this.sdk.onDeviceConnected = () => {
      this._errorLector$.next(null);
      if (!this.capturando) {
        this.detectarYCapturar();
      }
    };

    this.sdk.onCommunicationFailed = () => {
      this.capturando = false;
      this._errorLector$.next(
        'Se perdió la conexión con el lector. Verifica que el DigitalPersona Lite Client esté corriendo.'
      );
    };

    this.detectarYCapturar();
  }

  detener(): void {
    if (this.sdk) {
      this.capturando = false;
      try {
        this.sdk.stopAcquisition();
      } catch {
        // reader already stopped / unavailable
      }
    }
  }

  ngOnDestroy(): void {
    this.detener();
  }

  private detectarYCapturar(): void {
    this.sdk
      .enumerateDevices()
      .then((devices: string[]) => {
        if (devices && devices.length > 0) {
          this._errorLector$.next(null);
          this.lectorUid = devices[0];
          this.iniciarCaptura();
        } else {
          this.lectorUid = null;
          this._errorLector$.next('No se detectó ningún lector de huellas.');
        }
      })
      .catch((error: any) => {
        this._errorLector$.next('Error al enumerar lectores: ' + (error?.message ?? error));
      });
  }

  /**
   * Cierra la captura agotada y abre una nueva.
   *
   * El `stopAcquisition` no es decorativo: sin el, el `startAcquisition` siguiente cae sobre una
   * captura que el SDK todavia cree viva y no re-arma nada. El respiro antes de reabrir evita
   * pisar el cierre, que tambien es asincrono.
   */
  private reArmarCaptura(): void {
    if (!this.sdk) {
      return;
    }
    try {
      this.sdk.stopAcquisition();
    } catch {
      // ya estaba detenida
    }
    this.capturando = false;
    setTimeout(() => this.iniciarCaptura(), RESPIRO_REARMADO_MS);
  }

  /**
   * Hay que nombrar el lector explicitamente.
   *
   * `startAcquisition(formato)` sin UID manda `DeviceID: "00000000-0000-0000-0000-000000000000"`
   * — el GUID nulo, que el SDK documenta como "cualquier lector". Con el Lite Client esa variante
   * resuelve la promesa **sin llegar a tomar el lector**: no hay excepcion, no hay mensaje de
   * error, y el dedo apoyado no produce ninguna muestra.
   *
   * El UID sale de `enumerateDevices()`.
   */
  private iniciarCaptura(): void {
    if (!this.sdk || !this.lectorUid) {
      return;
    }
    if (this.capturando) {
      return;
    }
    this.capturando = true;
    this.sdk
      .startAcquisition(Fingerprint.SampleFormat.Intermediate, this.lectorUid)
      .then(() => {
        this.reintentandoRearmado = false;
      })
      .catch((error: any) => {
        this.capturando = false;

        // Un fallo al reabrir no es un lector caido: la captura anterior sigue entregando
        // muestras. Se reintenta una vez, mas lejos del cierre, y solo si ese segundo intento
        // tambien falla se le dice algo al socio.
        if (!this.reintentandoRearmado) {
          this.reintentandoRearmado = true;
          setTimeout(() => this.iniciarCaptura(), REINTENTO_REARMADO_MS);
          return;
        }

        this.reintentandoRearmado = false;
        this._errorLector$.next('Error al iniciar la captura: ' + (error?.message ?? error));
      });
  }
}
