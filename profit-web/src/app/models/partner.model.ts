export interface Partner {
  id: number;
  nombre: string;
  telefono: string;
  correo: string;
  sexo: 'M' | 'F';
  fechaNacimiento: Date;
  foto?: string;
  comentarios?: string;
  estatus: PartnerStatus;
  saldo: number;
  becado: boolean;
  fechaRegistro: Date;
  periodicidad: PaymentPeriod;
  clases: PartnerClass[];
  suscripciones: Subscription[];
  ventas: Sale[];
}

export enum PartnerStatus {
  ACTIVO = 'Activo',
  INACTIVO = 'Inactivo',
  SUSPENDIDO = 'Suspendido',
  BECADO = 'Becado'
}

export enum PaymentPeriod {
  SEMANAL = 'Semanal',
  QUINCENAL = 'Quincenal',
  MENSUAL = 'Mensual',
  TRIMESTRAL = 'Trimestral',
  SEMESTRAL = 'Semestral',
  ANUAL = 'Anual'
}

export interface PartnerClass {
  id: number;
  nombre: string;
  categoria: string;
  horario: string;
  instructor: string;
  dias: string[];
  precio: number;
  descuento: number;
  periodicidad: PaymentPeriod;
  cobrarInscripcion: boolean;
  montoInscripcion: number;
  subtotal: number;
  total: number;
}

export interface Subscription {
  id: number;
  fecha: Date;
  descripcion: string;
  importe: number;
  descuento: number;
  total: number;
  pagado: boolean;
  saldo: number;
  fechaPago?: Date;
  cancelado: boolean;
  motivo?: string;
  factura?: string;
  esInscripcion: boolean;
}

export interface Sale {
  id: number;
  fecha: Date;
  concepto: string;
  cantidad: number;
  precio: number;
  total: number;
  formaPago: string;
}

export interface ClassCategory {
  id: number;
  nombre: string;
  clases: AvailableClass[];
}

export interface AvailableClass {
  id: number;
  nombre: string;
  categoria: string;
  precios: ClassPrice[];
}

export interface ClassPrice {
  periodicidad: PaymentPeriod;
  precio: number;
  descuento: number;
}

export interface PartnerFilter {
  busqueda?: string;
  estatus?: PartnerStatus[];
  becado?: boolean;
}

// Interfaz para mapear datos directos de la API/SQL
export interface SocioAPI {
  id: number;
  socio: number;
  nomsocio: string;
  direccion: string;
  tel1: string;
  tel2: string;
  correo: string;
  obs: string | null;
  activo: number;
  foto: string;
  modopago: number;
  importepago: number;
  descpo: number;
  becado: number;
  diapago: string;
  visitasdisp: number;
  fecvencevis: string;
  cumpleaños: string;
  sexo: number;
  clases: string;
  usunvo: number;
  fecnvo: string;
  usumod: number;
  fecmod: string;
  envia: number;
  campo1: string;
  campo2: string;
  campo3: string;
  campo4: string;
  campo5: string;
  campo6: string;
  campo7: string;
  campo8: string;
  campo9: string;
  campo10: string;
  fotostr: string | null;
  visvig: string | null;
  vissucacc: number | null;
  razonsocial: string;
  fcalle: string;
  fnumero: string;
  finterior: string;
  fcolonia: string;
  fciudad: string;
  festado: string;
  fcp: string;
  rfc: string;
  nivel: number;
}

export interface MensualidadAPI {
  id: number;
  idmens: number;
  socio: number;
  fecha: string;
  modopago: number;
  importe: number;
  descuento: number;
  total: number;
  pagado: number;
  saldo: number;
  descrip: string;
  inscrip: number;
  fecpago: string;
  cancelado: number;
  autcan: number;
  motivo: string;
  notas: string | null;
  usunvo: number;
  fecnvo: string;
  usumod: number;
  fecmod: string;
  envia: number;
  factura: string;
}

export interface DescuentoAPI {
  id: number;
  iddesc: number;
  fecha: string;
  ticket: number;
  idmens: number;
  socio: number;
  usuario: number;
  importe: number;
  descuento: number;
  total: number;
  autdes: number;
  motivo: string;
  corte: number;
  cancelado: number;
  usunvo: number;
  fecnvo: string;
  usumod: number;
  fecmod: string;
  envia: number;
}

export interface Discount {
  id: number;
  fecha: Date;
  ticket?: number;
  idMensualidad?: number;
  importe: number;
  descuento: number;
  total: number;
  motivo: string;
  cancelado: boolean;
}
