import { ApexOptions } from 'apexcharts';

// El naranja de marca va primero para que la serie principal de cada gráfica lo tome.
export const PALETA = [
  '#F97316',
  '#3B82F6',
  '#10B981',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#06B6D4',
  '#EF4444',
];

export const NARANJA = '#F97316';
export const GRIS_TEXTO = '#6B7280';
export const GRIS_LINEA = '#E5E7EB';

export const CURRENCY = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

export const CURRENCY_EXACTA = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

const LOCALE_ES = {
  name: 'es',
  options: {
    months: [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ],
    shortMonths: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    days: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    shortDays: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    toolbar: {
      exportToSVG: 'Descargar SVG',
      exportToPNG: 'Descargar PNG',
      exportToCSV: 'Descargar CSV',
      menu: 'Menú',
      selection: 'Selección',
      selectionZoom: 'Zoom de selección',
      zoomIn: 'Acercar',
      zoomOut: 'Alejar',
      pan: 'Desplazar',
      reset: 'Restablecer',
    },
  },
};

// Base común de todas las gráficas: sin toolbar (las tarjetas ya son densas), rejilla
// discreta y tipografía heredada de la app.
export const OPCIONES_BASE: ApexOptions = {
  chart: {
    fontFamily: 'inherit',
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { enabled: true, speed: 400 },
    locales: [LOCALE_ES],
    defaultLocale: 'es',
  },
  colors: PALETA,
  grid: {
    borderColor: GRIS_LINEA,
    strokeDashArray: 4,
    padding: { left: 4, right: 4, top: 0 },
  },
  dataLabels: { enabled: false },
  legend: {
    position: 'bottom',
    horizontalAlign: 'center',
    fontSize: '13px',
    itemMargin: { horizontal: 10, vertical: 4 },
  },
  tooltip: { theme: 'light' },
};

// ApexOptions es un tipo profundamente anidado; un merge superficial por sección basta
// para lo que necesitan las tarjetas y evita perder claves de OPCIONES_BASE.
export function combinarOpciones(extra: ApexOptions): ApexOptions {
  return {
    ...OPCIONES_BASE,
    ...extra,
    chart: { ...OPCIONES_BASE.chart, ...extra.chart } as ApexOptions['chart'],
    grid: { ...OPCIONES_BASE.grid, ...extra.grid },
    legend: { ...OPCIONES_BASE.legend, ...extra.legend },
    tooltip: { ...OPCIONES_BASE.tooltip, ...extra.tooltip },
  };
}

export const EJE_ETIQUETAS = {
  style: { colors: GRIS_TEXTO, fontSize: '12px' },
};
