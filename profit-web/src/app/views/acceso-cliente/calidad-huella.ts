/**
 * Traduce los códigos de calidad del Web SDK de DigitalPersona a instrucciones accionables.
 *
 * Los valores vienen del enum `QualityCode` de `fingerprint.sdk.min.js`. Son 25, pero al socio
 * no le sirve saber si fue `TooLeft` o `RotatedTooMuch`: lo que necesita es qué hacer distinto,
 * así que se agrupan en unos pocos mensajes.
 */

// enum normal y no `const enum`: bajo isolatedModules el segundo no se puede inlinear
// entre módulos y el comportamiento cambia según la versión de TypeScript.
export enum QualityCode {
  Good = 0,
  NoImage = 1,
  TooLight = 2,
  TooDark = 3,
  TooNoisy = 4,
  LowContrast = 5,
  NotEnoughFeatures = 6,
  NotCentered = 7,
  NotAFinger = 8,
  TooHigh = 9,
  TooLow = 10,
  TooLeft = 11,
  TooRight = 12,
  TooStrange = 13,
  TooFast = 14,
  TooSkewed = 15,
  TooShort = 16,
  TooSlow = 17,
  ReverseMotion = 18,
  PressureTooHard = 19,
  PressureTooLight = 20,
  WetFinger = 21,
  FakeFinger = 22,
  TooSmall = 23,
  RotatedTooMuch = 24
}

const MENSAJE_GENERICO = 'No se pudo leer la huella. Intenta de nuevo.';

const MENSAJES: Partial<Record<QualityCode, string>> = {
  [QualityCode.NoImage]: 'No se detectó el dedo. Apóyalo sobre el lector.',
  [QualityCode.NotAFinger]: 'No se detectó el dedo. Apóyalo sobre el lector.',

  [QualityCode.TooLight]: 'Limpia el lector y tu dedo e intenta de nuevo.',
  [QualityCode.TooDark]: 'Limpia el lector y tu dedo e intenta de nuevo.',
  [QualityCode.TooNoisy]: 'Limpia el lector y tu dedo e intenta de nuevo.',
  [QualityCode.LowContrast]: 'Limpia el lector y tu dedo e intenta de nuevo.',

  [QualityCode.NotEnoughFeatures]: 'Apoya el dedo con más firmeza, cubriendo el sensor.',
  [QualityCode.TooSmall]: 'Apoya el dedo con más firmeza, cubriendo el sensor.',

  [QualityCode.NotCentered]: 'Centra el dedo en el lector.',
  [QualityCode.TooHigh]: 'Centra el dedo en el lector.',
  [QualityCode.TooLow]: 'Centra el dedo en el lector.',
  [QualityCode.TooLeft]: 'Centra el dedo en el lector.',
  [QualityCode.TooRight]: 'Centra el dedo en el lector.',
  [QualityCode.TooSkewed]: 'Centra el dedo en el lector.',
  [QualityCode.RotatedTooMuch]: 'Centra el dedo en el lector.',

  // Lectores de barrido (swipe); con los de área no deberían aparecer.
  [QualityCode.TooFast]: 'Mantén el dedo quieto un momento.',
  [QualityCode.TooSlow]: 'Mantén el dedo quieto un momento.',
  [QualityCode.TooShort]: 'Mantén el dedo quieto un momento.',
  [QualityCode.ReverseMotion]: 'Mantén el dedo quieto un momento.',

  [QualityCode.PressureTooHard]: 'No presiones tan fuerte.',
  [QualityCode.PressureTooLight]: 'Presiona un poco más.',

  [QualityCode.WetFinger]: 'Seca tu dedo e intenta de nuevo.'
};

/** Devuelve null cuando la captura fue buena (no hay nada que decirle al socio). */
export function mensajeCalidad(codigo: number): string | null {
  if (codigo === QualityCode.Good) {
    return null;
  }
  return MENSAJES[codigo as QualityCode] ?? MENSAJE_GENERICO;
}
