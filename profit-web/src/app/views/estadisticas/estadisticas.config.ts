export type EstadisticaTipo =
  | 'genero'
  | 'ingresos'
  | 'altas-bajas'
  | 'socios-por-clase'
  | 'formas-pago'
  | 'adeudos'
  | 'asistencias';

export interface OpcionEstadistica {
  tipo: EstadisticaTipo;
  titulo: string;
  descripcion: string;
  icono: string;
  // Si es false la tarjeta ignora el rango de fechas: es una foto del padrón actual.
  usaRango: boolean;
  ancho: 'medio' | 'completo';
}

export const CATALOGO_ESTADISTICAS: OpcionEstadistica[] = [
  {
    tipo: 'ingresos',
    titulo: 'Ingresos por Periodo',
    descripcion: 'Cobros de mensualidades y ventas',
    icono: 'fas fa-chart-line',
    usaRango: true,
    ancho: 'completo',
  },
  {
    tipo: 'asistencias',
    titulo: 'Horas Pico',
    descripcion: 'Accesos por día y hora',
    icono: 'fas fa-door-open',
    usaRango: true,
    ancho: 'completo',
  },
  {
    tipo: 'altas-bajas',
    titulo: 'Altas y Bajas',
    descripcion: 'Movimiento del padrón de socios',
    icono: 'fas fa-user-plus',
    usaRango: true,
    ancho: 'completo',
  },
  {
    tipo: 'genero',
    titulo: 'Distribución por Género',
    descripcion: 'Socios por sexo',
    icono: 'fas fa-venus-mars',
    usaRango: false,
    ancho: 'medio',
  },
  {
    tipo: 'formas-pago',
    titulo: 'Formas de Pago',
    descripcion: 'Importe cobrado por método',
    icono: 'fas fa-credit-card',
    usaRango: true,
    ancho: 'medio',
  },
  {
    tipo: 'socios-por-clase',
    titulo: 'Socios por Clase',
    descripcion: 'Distribución por membresía',
    icono: 'fas fa-layer-group',
    usaRango: false,
    ancho: 'medio',
  },
  {
    tipo: 'adeudos',
    titulo: 'Adeudos',
    descripcion: 'Saldo pendiente por antigüedad',
    icono: 'fas fa-exclamation-triangle',
    usaRango: false,
    ancho: 'medio',
  },
];

export function buscarOpcion(tipo: EstadisticaTipo): OpcionEstadistica | undefined {
  return CATALOGO_ESTADISTICAS.find((opcion) => opcion.tipo === tipo);
}
