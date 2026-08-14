import { Injectable } from '@nestjs/common';
import { RawBuilder, sql, SqlBool } from 'kysely';
import { DatabaseService } from '../../database/database.service';
import { FormasPagoService } from '../formas-pago/formas-pago.service';

export type Agrupacion = 'dia' | 'semana' | 'mes';

export interface RangoQuery {
  desde?: string; // 'yyyy-MM-dd'
  hasta?: string; // 'yyyy-MM-dd' (inclusivo)
}

export interface PeriodoQuery extends RangoQuery {
  agrupacion?: string;
}

export interface SociosQuery {
  soloActivos?: string; // no hay ValidationPipe global: llega como texto
}

export interface GeneroEstadistica {
  totalSocios: number;
  items: { etiqueta: string; cantidad: number; porcentaje: number }[];
}

export interface IngresosEstadistica {
  agrupacion: Agrupacion;
  totalCobrado: number;
  totalMensualidades: number;
  totalVentas: number;
  periodos: {
    clave: string;
    etiqueta: string;
    mensualidades: number;
    ventas: number;
    total: number;
  }[];
}

export interface AltasBajasEstadistica {
  agrupacion: Agrupacion;
  totalAltas: number;
  totalBajas: number;
  neto: number;
  periodos: { clave: string; etiqueta: string; altas: number; bajas: number }[];
}

export interface SociosPorClaseEstadistica {
  // Un socio puede pertenecer a varias clases (tbsocios.clases es un CSV), así que la
  // suma de `socios` puede superar a `totalSocios` y los porcentajes pasar de 100%.
  totalSocios: number;
  clases: { clase: number; nombre: string; socios: number; porcentaje: number }[];
}

export interface FormasPagoEstadistica {
  totalCobrado: number;
  formas: { nombre: string; importe: number; movimientos: number; porcentaje: number }[];
}

export interface AdeudosEstadistica {
  totalImporte: number;
  totalSocios: number;
  buckets: { etiqueta: string; importe: number; socios: number }[];
}

export interface AsistenciasEstadistica {
  totalAccesos: number;
  promedioDiario: number;
  diaPico: string | null;
  horaPico: string | null;
  // Matriz completa de 7 x 24 (día de la semana x hora), con ceros incluidos.
  celdas: { dia: number; hora: number; accesos: number }[];
}

// weekday() de MySQL: 0 = lunes.
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const BUCKETS_ADEUDO = ['1-30 días', '31-60 días', '61-90 días', 'Más de 90 días'];

const AGRUPACIONES: Agrupacion[] = ['dia', 'semana', 'mes'];

// mysql2 devuelve los DECIMAL como string y los count() como number: se normaliza todo.
function num(valor: unknown): number {
  return Number(valor ?? 0);
}

function round2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function porcentaje(parte: number, total: number): number {
  return total > 0 ? round2((parte / total) * 100) : 0;
}

function parseFecha(valor: string | undefined, finDelDia = false): Date | undefined {
  if (!valor) return undefined;
  const fecha = new Date(`${valor}T00:00:00`);
  if (isNaN(fecha.getTime())) return undefined;
  // 'hasta' es inclusivo: se compara contra el inicio del día siguiente.
  if (finDelDia) fecha.setDate(fecha.getDate() + 1);
  return fecha;
}

// Sin rango explícito se usa el mes en curso, el mismo default que aplica la vista.
function resolverRango(query: RangoQuery): { desde: Date; hastaExcl: Date } {
  const hoy = new Date();
  return {
    desde: parseFecha(query.desde) ?? new Date(hoy.getFullYear(), hoy.getMonth(), 1),
    hastaExcl:
      parseFecha(query.hasta, true) ??
      new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1),
  };
}

function resolverAgrupacion(valor: string | undefined): Agrupacion {
  return AGRUPACIONES.includes(valor as Agrupacion) ? (valor as Agrupacion) : 'mes';
}

function resolverBooleano(valor: string | undefined, porDefecto: boolean): boolean {
  if (valor === undefined || valor === '') return porDefecto;
  return valor !== 'false' && valor !== '0';
}

// La agrupación se resuelve contra fragmentos literales: nunca se interpola texto del
// query string dentro del SQL.
function periodoSql(columna: string, agrupacion: Agrupacion): RawBuilder<string> {
  const col = sql.ref(columna);
  switch (agrupacion) {
    case 'dia':
      return sql<string>`date_format(${col}, '%Y-%m-%d')`;
    // weekday() = 0 el lunes, así que la semana queda anclada al lunes.
    case 'semana':
      return sql<string>`date_format(date_sub(${col}, interval weekday(${col}) day), '%Y-%m-%d')`;
    case 'mes':
      return sql<string>`date_format(${col}, '%Y-%m-01')`;
  }
}

function claveFecha(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function inicioDePeriodo(fecha: Date, agrupacion: Agrupacion): Date {
  const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  if (agrupacion === 'mes') inicio.setDate(1);
  // getDay() cuenta el domingo como 0; weekday() de MySQL cuenta el lunes como 0.
  if (agrupacion === 'semana') inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7));
  return inicio;
}

// El eje se genera completo para que los periodos sin movimiento salgan en cero y las
// series queden alineadas entre sí.
function periodosDelRango(desde: Date, hastaExcl: Date, agrupacion: Agrupacion): string[] {
  const claves: string[] = [];
  const cursor = inicioDePeriodo(desde, agrupacion);

  while (cursor < hastaExcl) {
    claves.push(claveFecha(cursor));
    if (agrupacion === 'dia') cursor.setDate(cursor.getDate() + 1);
    else if (agrupacion === 'semana') cursor.setDate(cursor.getDate() + 7);
    else cursor.setMonth(cursor.getMonth() + 1);
  }

  return claves;
}

function etiquetaPeriodo(clave: string, agrupacion: Agrupacion): string {
  const [anio, mes, dia] = clave.split('-').map(Number);
  if (agrupacion === 'mes') return `${MESES[mes - 1]} ${anio}`;
  if (agrupacion === 'semana') return `Sem ${dia} ${MESES_CORTOS[mes - 1]}`;
  return `${dia} ${MESES_CORTOS[mes - 1]}`;
}

function diasDelRango(desde: Date, hastaExcl: Date): number {
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((hastaExcl.getTime() - desde.getTime()) / MS_POR_DIA));
}

@Injectable()
export class EstadisticasService {
  constructor(
    private readonly db: DatabaseService,
    private readonly formasPagoService: FormasPagoService,
  ) {}

  async getGenero(query: SociosQuery): Promise<GeneroEstadistica> {
    const db = this.db.getKysely();
    const soloActivos = resolverBooleano(query.soloActivos, true);

    // tbsocios.sexo: 1 = Masculino, 2 = Femenino. El alta deja 0 por defecto y las filas
    // históricas de BDK pueden traer cualquier otra cosa, así que todo lo demás se agrupa.
    const SEXO = sql<string>`case s.sexo
      when 1 then 'Masculino'
      when 2 then 'Femenino'
      else 'No especificado' end`;

    let consulta = db
      .selectFrom('tbsocios as s')
      .select([SEXO.as('etiqueta'), sql<number>`count(*)`.as('cantidad')])
      .groupBy(SEXO);

    if (soloActivos) consulta = consulta.where('s.activo', '=', 1);

    const filas = await consulta.execute();
    const totalSocios = filas.reduce((acc, fila) => acc + num(fila.cantidad), 0);

    return {
      totalSocios,
      items: filas
        .map((fila) => ({
          etiqueta: fila.etiqueta,
          cantidad: num(fila.cantidad),
          porcentaje: porcentaje(num(fila.cantidad), totalSocios),
        }))
        .sort((a, b) => b.cantidad - a.cantidad),
    };
  }

  async getIngresos(query: PeriodoQuery): Promise<IngresosEstadistica> {
    const db = this.db.getKysely();
    const { desde, hastaExcl } = resolverRango(query);
    const agrupacion = resolverAgrupacion(query.agrupacion);
    const periodo = periodoSql('i.fecha', agrupacion);

    // tbingresos es la misma fuente que usa el corte de caja (ver CajaService.cerrar), así
    // que los totales cuadran con tbcortes.totingresos. Además cubre mensualidades y ventas
    // de punto de venta en una sola pasada y su `fecha` siempre es la del cobro real, sin
    // el centinela 1900-01-01 que arrastra tbmensualidades.fecpago.
    const ORIGEN = sql<string>`case when i.idmens > 0 then 'mensualidades' else 'ventas' end`;

    const filas = await db
      .selectFrom('tbingresos as i')
      .select([
        periodo.as('clave'),
        ORIGEN.as('origen'),
        sql<string>`coalesce(sum(i.importe), 0)`.as('importe'),
      ])
      .where('i.cancelado', '=', 0)
      .where('i.fecha', '>=', desde)
      .where('i.fecha', '<', hastaExcl)
      .groupBy([periodo, ORIGEN])
      .execute();

    const acumulado = new Map<string, { mensualidades: number; ventas: number }>();
    for (const clave of periodosDelRango(desde, hastaExcl, agrupacion)) {
      acumulado.set(clave, { mensualidades: 0, ventas: 0 });
    }

    for (const fila of filas) {
      const valores = acumulado.get(fila.clave);
      // Una fecha corrupta puede caer fuera del eje generado; se ignora en vez de romper.
      if (!valores) continue;
      if (fila.origen === 'mensualidades') valores.mensualidades = num(fila.importe);
      else valores.ventas = num(fila.importe);
    }

    const periodos = [...acumulado.entries()].map(([clave, valores]) => ({
      clave,
      etiqueta: etiquetaPeriodo(clave, agrupacion),
      mensualidades: round2(valores.mensualidades),
      ventas: round2(valores.ventas),
      total: round2(valores.mensualidades + valores.ventas),
    }));

    const totalMensualidades = round2(periodos.reduce((acc, p) => acc + p.mensualidades, 0));
    const totalVentas = round2(periodos.reduce((acc, p) => acc + p.ventas, 0));

    return {
      agrupacion,
      totalCobrado: round2(totalMensualidades + totalVentas),
      totalMensualidades,
      totalVentas,
      periodos,
    };
  }

  async getAltasBajas(query: PeriodoQuery): Promise<AltasBajasEstadistica> {
    const db = this.db.getKysely();
    const { desde, hastaExcl } = resolverRango(query);
    const agrupacion = resolverAgrupacion(query.agrupacion);

    const periodoAltas = periodoSql('s.fecnvo', agrupacion);
    const periodoBajas = periodoSql('l.fecnvo', agrupacion);

    const [filasAltas, filasBajas] = await Promise.all([
      db
        .selectFrom('tbsocios as s')
        .select([periodoAltas.as('clave'), sql<number>`count(*)`.as('total')])
        .where('s.fecnvo', '>=', desde)
        .where('s.fecnvo', '<', hastaExcl)
        .groupBy(periodoAltas)
        .execute(),
      // tbsocios no guarda fecha de baja: el único rastro es el log de texto libre de BDK.
      // Se usa el mismo criterio que derivarTipoLog en socios.service.ts ('de baja' lleva
      // preposición para no chocar con palabras como "rebaja").
      db
        .selectFrom('tblogsocio as l')
        .select([periodoBajas.as('clave'), sql<number>`count(*)`.as('total')])
        .where('l.fecnvo', '>=', desde)
        .where('l.fecnvo', '<', hastaExcl)
        .where(sql<SqlBool>`lower(l.log) like '%de baja%'`)
        .groupBy(periodoBajas)
        .execute(),
    ]);

    const porClave = new Map(
      periodosDelRango(desde, hastaExcl, agrupacion).map((clave) => [
        clave,
        { altas: 0, bajas: 0 },
      ]),
    );

    for (const fila of filasAltas) {
      const valores = porClave.get(fila.clave);
      if (valores) valores.altas = num(fila.total);
    }
    for (const fila of filasBajas) {
      const valores = porClave.get(fila.clave);
      if (valores) valores.bajas = num(fila.total);
    }

    const periodos = [...porClave.entries()].map(([clave, valores]) => ({
      clave,
      etiqueta: etiquetaPeriodo(clave, agrupacion),
      altas: valores.altas,
      bajas: valores.bajas,
    }));

    const totalAltas = periodos.reduce((acc, p) => acc + p.altas, 0);
    const totalBajas = periodos.reduce((acc, p) => acc + p.bajas, 0);

    return { agrupacion, totalAltas, totalBajas, neto: totalAltas - totalBajas, periodos };
  }

  async getSociosPorClase(query: SociosQuery): Promise<SociosPorClaseEstadistica> {
    const db = this.db.getKysely();
    const soloActivos = resolverBooleano(query.soloActivos, true);

    // tbsocios.clases es un CSV desnormalizado: la app lo escribe como ',001,003'
    // (formatClasesField en socios.service.ts) pero las filas históricas de BDK pueden
    // traer '1,3', así que se prueban las dos representaciones. El LPAD asume clases de
    // hasta 3 dígitos, que es el formato que escribe la app.
    const PERTENECE = sql<SqlBool>`(
      find_in_set(lpad(c.clase, 3, '0'), s.clases) > 0
      or find_in_set(c.clase, s.clases) > 0
    )`;

    const consultaClases = db
      .selectFrom('tbclases as c')
      .leftJoin('tbsocios as s', (join) =>
        soloActivos ? join.on(PERTENECE).on('s.activo', '=', 1) : join.on(PERTENECE),
      )
      .select(['c.clase', 'c.nomclase', sql<number>`count(s.id)`.as('socios')])
      .where('c.activa', '=', 1)
      .groupBy(['c.clase', 'c.nomclase']);

    let consultaTotal = db
      .selectFrom('tbsocios as s')
      .select(sql<number>`count(*)`.as('total'));

    // 'Sin clase' agrupa a quienes no caen en ninguna clase activa, para que la tarjeta
    // cubra al padrón completo aunque su CSV apunte a clases dadas de baja.
    let consultaSinClase = db
      .selectFrom('tbsocios as s')
      .select(sql<number>`count(*)`.as('total'))
      .where(({ not, exists, selectFrom }) =>
        not(
          exists(
            selectFrom('tbclases as c')
              .select('c.id')
              .where('c.activa', '=', 1)
              .where(PERTENECE),
          ),
        ),
      );

    if (soloActivos) {
      consultaTotal = consultaTotal.where('s.activo', '=', 1);
      consultaSinClase = consultaSinClase.where('s.activo', '=', 1);
    }

    const [filas, totalRow, sinClaseRow] = await Promise.all([
      consultaClases.execute(),
      consultaTotal.executeTakeFirst(),
      consultaSinClase.executeTakeFirst(),
    ]);

    const totalSocios = num(totalRow?.total);
    const sinClase = num(sinClaseRow?.total);

    const clases = filas.map((fila) => ({
      clase: fila.clase,
      nombre: fila.nomclase.trim(),
      socios: num(fila.socios),
      porcentaje: porcentaje(num(fila.socios), totalSocios),
    }));

    if (sinClase > 0) {
      clases.push({
        clase: 0,
        nombre: 'Sin clase',
        socios: sinClase,
        porcentaje: porcentaje(sinClase, totalSocios),
      });
    }

    return { totalSocios, clases: clases.sort((a, b) => b.socios - a.socios) };
  }

  async getFormasPago(query: RangoQuery): Promise<FormasPagoEstadistica> {
    const db = this.db.getKysely();
    const { desde, hastaExcl } = resolverRango(query);

    const [filas, nombresFp] = await Promise.all([
      db
        .selectFrom('tbingresos as i')
        .select([
          'i.fp',
          sql<string>`coalesce(sum(i.importe), 0)`.as('importe'),
          sql<number>`count(*)`.as('movimientos'),
        ])
        .where('i.cancelado', '=', 0)
        .where('i.fecha', '>=', desde)
        .where('i.fecha', '<', hastaExcl)
        .groupBy('i.fp')
        .execute(),
      this.formasPagoService.getCatalogoFormasPago(),
    ]);

    // El catálogo indexa por 'id' y por 'fp', así que dos valores distintos de i.fp pueden
    // resolver al mismo nombre: se re-agrupa por nombre para no duplicar rebanadas.
    const porNombre = new Map<string, { importe: number; movimientos: number }>();
    for (const fila of filas) {
      const nombre = nombresFp.get(Number(fila.fp)) ?? 'Otro';
      const acumulado = porNombre.get(nombre) ?? { importe: 0, movimientos: 0 };
      acumulado.importe += num(fila.importe);
      acumulado.movimientos += num(fila.movimientos);
      porNombre.set(nombre, acumulado);
    }

    const totalCobrado = round2(
      [...porNombre.values()].reduce((acc, valores) => acc + valores.importe, 0),
    );

    return {
      totalCobrado,
      formas: [...porNombre.entries()]
        .map(([nombre, valores]) => ({
          nombre,
          importe: round2(valores.importe),
          movimientos: valores.movimientos,
          porcentaje: porcentaje(valores.importe, totalCobrado),
        }))
        .sort((a, b) => b.importe - a.importe),
    };
  }

  async getAdeudos(): Promise<AdeudosEstadistica> {
    const db = this.db.getKysely();

    const ANTIGUEDAD = sql<number>`datediff(curdate(), m.fecha)`;
    const BUCKET = sql<number>`case
      when ${ANTIGUEDAD} <= 30 then 0
      when ${ANTIGUEDAD} <= 60 then 1
      when ${ANTIGUEDAD} <= 90 then 2
      else 3 end`;

    // Un adeudo es un cargo vigente sin cobrar. saldo es DECIMAL, así que la comparación
    // va en SQL. Los cargos con fecha futura todavía no son adeudo.
    const vigentesSinCobrar = db
      .selectFrom('tbmensualidades as m')
      .where('m.cancelado', '=', 0)
      .where('m.pagado', '=', 0)
      .where(sql<SqlBool>`m.saldo > 0`)
      .where(sql<SqlBool>`m.fecha <= curdate()`);

    const [filas, totalRow] = await Promise.all([
      vigentesSinCobrar
        .select([
          BUCKET.as('bucket'),
          sql<string>`coalesce(sum(m.saldo), 0)`.as('importe'),
          sql<number>`count(distinct m.socio)`.as('socios'),
        ])
        .groupBy(BUCKET)
        .execute(),
      // El total de socios no se puede sumar de los buckets: un mismo socio puede tener
      // cargos de distinta antigüedad.
      vigentesSinCobrar
        .select([
          sql<string>`coalesce(sum(m.saldo), 0)`.as('importe'),
          sql<number>`count(distinct m.socio)`.as('socios'),
        ])
        .executeTakeFirst(),
    ]);

    const porBucket = new Map<number, { importe: number; socios: number }>(
      BUCKETS_ADEUDO.map((_, indice) => [indice, { importe: 0, socios: 0 }]),
    );

    for (const fila of filas) {
      const valores = porBucket.get(num(fila.bucket));
      if (!valores) continue;
      valores.importe = round2(num(fila.importe));
      valores.socios = num(fila.socios);
    }

    return {
      totalImporte: round2(num(totalRow?.importe)),
      totalSocios: num(totalRow?.socios),
      buckets: BUCKETS_ADEUDO.map((etiqueta, indice) => ({
        etiqueta,
        importe: porBucket.get(indice)!.importe,
        socios: porBucket.get(indice)!.socios,
      })),
    };
  }

  async getAsistencias(query: RangoQuery): Promise<AsistenciasEstadistica> {
    const db = this.db.getKysely();
    const { desde, hastaExcl } = resolverRango(query);

    const DIA = sql<number>`weekday(a.fecha)`;
    const HORA = sql<number>`hour(a.fecha)`;

    const filas = await db
      .selectFrom('tbasistencia as a')
      .select([DIA.as('dia'), HORA.as('hora'), sql<number>`count(*)`.as('accesos')])
      .where('a.fecha', '>=', desde)
      .where('a.fecha', '<', hastaExcl)
      .groupBy([DIA, HORA])
      .execute();

    // Matriz completa: el heatmap necesita las 168 celdas aunque estén en cero.
    const celdas = Array.from({ length: 7 * 24 }, (_, indice) => ({
      dia: Math.floor(indice / 24),
      hora: indice % 24,
      accesos: 0,
    }));

    const porDia = new Array<number>(7).fill(0);
    const porHora = new Array<number>(24).fill(0);
    let totalAccesos = 0;

    for (const fila of filas) {
      const dia = num(fila.dia);
      const hora = num(fila.hora);
      const accesos = num(fila.accesos);
      if (dia < 0 || dia > 6 || hora < 0 || hora > 23) continue;

      celdas[dia * 24 + hora].accesos = accesos;
      porDia[dia] += accesos;
      porHora[hora] += accesos;
      totalAccesos += accesos;
    }

    const indiceMayor = (valores: number[]) =>
      valores.reduce((mejor, valor, indice) => (valor > valores[mejor] ? indice : mejor), 0);

    return {
      totalAccesos,
      promedioDiario: round2(totalAccesos / diasDelRango(desde, hastaExcl)),
      diaPico: totalAccesos > 0 ? DIAS_SEMANA[indiceMayor(porDia)] : null,
      horaPico: totalAccesos > 0 ? `${String(indiceMayor(porHora)).padStart(2, '0')}:00` : null,
      celdas,
    };
  }
}
