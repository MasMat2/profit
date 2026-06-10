import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { sql } from 'kysely';

@Injectable()
export class EstadisticasService {
  constructor(private readonly db: DatabaseService) {}

  async getEstadisticaGenero(fechaInicio?: string, fechaFin?: string) {
    const kysely = this.db.getKysely();

    let query = kysely
      .selectFrom('tbsocios')
      .select([
        sql<number>`SUM(CASE WHEN sexo = 1 THEN 1 ELSE 0 END)`.as('masculino'),
        sql<number>`SUM(CASE WHEN sexo = 2 THEN 1 ELSE 0 END)`.as('femenino'),
        sql<number>`COUNT(*)`.as('total'),
      ])
      .where('activo', '=', 1);

    // Aplicar filtros de fecha si se proporcionan
    if (fechaInicio) {
      query = query.where(sql`DATE(fecnvo)`, '>=', fechaInicio);
    }
    if (fechaFin) {
      query = query.where(sql`DATE(fecnvo)`, '<=', fechaFin);
    }

    const result = await query.executeTakeFirst();
    return result || { masculino: 0, femenino: 0, total: 0 };
  }

  async getEstadisticaEdades(fechaInicio?: string, fechaFin?: string) {
    const kysely = this.db.getKysely();

    let query = kysely
      .selectFrom('tbsocios')
      .select([
        sql<string>`
          CASE
            WHEN YEAR(CURDATE()) - YEAR(cumpleaños) < 18 THEN 'Menor de 18'
            WHEN YEAR(CURDATE()) - YEAR(cumpleaños) BETWEEN 18 AND 25 THEN '18-25'
            WHEN YEAR(CURDATE()) - YEAR(cumpleaños) BETWEEN 26 AND 35 THEN '26-35'
            WHEN YEAR(CURDATE()) - YEAR(cumpleaños) BETWEEN 36 AND 45 THEN '36-45'
            WHEN YEAR(CURDATE()) - YEAR(cumpleaños) BETWEEN 46 AND 55 THEN '46-55'
            ELSE 'Mayor de 55'
          END
        `.as('rango'),
        sql<number>`COUNT(*)`.as('cantidad'),
      ])
      .where('activo', '=', 1)
      .where('cumpleaños', 'is not', null);

    // Aplicar filtros de fecha
    if (fechaInicio) {
      query = query.where(sql`DATE(fecnvo)`, '>=', fechaInicio);
    }
    if (fechaFin) {
      query = query.where(sql`DATE(fecnvo)`, '<=', fechaFin);
    }

    const result = await query
      .groupBy('rango')
      .orderBy('rango')
      .execute();

    return result;
  }

  async getEstadisticaPaquetes(fechaInicio?: string, fechaFin?: string) {
    const kysely = this.db.getKysely();

    // Construir condición de fecha para la subquery
    let fechaCondition = '';
    if (fechaInicio) {
      fechaCondition += ` AND DATE(fecnvo) >= '${fechaInicio}'`;
    }
    if (fechaFin) {
      fechaCondition += ` AND DATE(fecnvo) <= '${fechaFin}'`;
    }

    const result = await kysely
      .selectFrom('tbclases')
      .select([
        'nomclase as paquete',
        sql<number>`(SELECT COUNT(*) FROM tbsocios WHERE FIND_IN_SET(LPAD(tbclases.clase, 3, '0'), clases) AND activo = 1${sql.raw(fechaCondition)})`.as('usuarios'),
      ])
      .where('activa', '=', 1)
      .orderBy('usuarios', 'desc')
      .limit(10)
      .execute();

    return result;
  }

  async getEstadisticaInscripciones(fechaInicio?: string, fechaFin?: string) {
    const kysely = this.db.getKysely();

    // Usar fechas proporcionadas o default al mes actual
    let fechaInicioNuevas = fechaInicio;
    let fechaFinNuevas = fechaFin;
    let periodoLabel = 'Personalizado';

    if (!fechaInicio && !fechaFin) {
      const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      fechaInicioNuevas = primerDiaMes.toISOString().split('T')[0];
      fechaFinNuevas = new Date().toISOString().split('T')[0];
      periodoLabel = 'Mes actual';
    } else if (fechaInicio && fechaFin) {
      periodoLabel = `${fechaInicio} - ${fechaFin}`;
    }

    let queryNuevas = kysely
      .selectFrom('tbsocios')
      .select(sql<number>`COUNT(*)`.as('count'));

    let queryBajas = kysely
      .selectFrom('tbsocios')
      .select(sql<number>`COUNT(*)`.as('count'))
      .where('activo', '=', 0);

    // Aplicar filtros de fecha
    if (fechaInicioNuevas) {
      queryNuevas = queryNuevas.where(sql`DATE(fecnvo)`, '>=', fechaInicioNuevas);
      queryBajas = queryBajas.where(sql`DATE(fecmod)`, '>=', fechaInicioNuevas);
    }
    if (fechaFinNuevas) {
      queryNuevas = queryNuevas.where(sql`DATE(fecnvo)`, '<=', fechaFinNuevas);
      queryBajas = queryBajas.where(sql`DATE(fecmod)`, '<=', fechaFinNuevas);
    }

    const [nuevas, bajas] = await Promise.all([
      queryNuevas.executeTakeFirst(),
      queryBajas.executeTakeFirst(),
    ]);

    return {
      nuevas: Number(nuevas?.count) || 0,
      bajas: Number(bajas?.count) || 0,
      periodo: periodoLabel,
    };
  }

  async getEstadisticaSaldo(fechaInicio?: string, fechaFin?: string) {
    const kysely = this.db.getKysely();
    
    // Query para tbtickets (ventas de contado)
    let queryTickets = kysely
      .selectFrom('tbtickets')
      .select(sql<number>`COALESCE(SUM(total), 0)`.as('total'))
      .where('cancelado', '=', 0)
      .where('credito', '=', 0);
    
    // Query para tbingresos (otros ingresos)
    let queryIngresos = kysely
      .selectFrom('tbingresos')
      .select(sql<number>`COALESCE(SUM(importe), 0)`.as('total'))
      .where('cancelado', '=', 0);
    
    // Aplicar filtros de fecha a ambas queries
    if (fechaInicio) {
      queryTickets = queryTickets.where(sql`DATE(fecha)`, '>=', fechaInicio);
      queryIngresos = queryIngresos.where(sql`DATE(fecha)`, '>=', fechaInicio);
    }
    
    if (fechaFin) {
      const fechaFinMasUno = new Date(fechaFin);
      fechaFinMasUno.setDate(fechaFinMasUno.getDate() + 1);
      const fechaFinStr = fechaFinMasUno.toISOString().split('T')[0];
      queryTickets = queryTickets.where(sql`DATE(fecha)`, '<', fechaFinStr);
      queryIngresos = queryIngresos.where(sql`DATE(fecha)`, '<', fechaFinStr);
    }
    
    // Ejecutar ambas queries en paralelo
    const [resultTickets, resultIngresos] = await Promise.all([
      queryTickets.executeTakeFirst(),
      queryIngresos.executeTakeFirst(),
    ]);
    
    // Sumar ambos totales
    const totalTickets = Number(resultTickets?.total) || 0;
    const totalIngresos = Number(resultIngresos?.total) || 0;
    const saldoTotal = totalTickets + totalIngresos;

    return {
      saldoTotal,
      fecha: new Date(),
      periodo: fechaInicio && fechaFin ? `${fechaInicio} - ${fechaFin}` : (fechaInicio || fechaFin ? 'Personalizado' : 'Histórico completo'),
    };
  }

  async getEstadisticaDeudas() {
    const kysely = this.db.getKysely();
    
    const result = await kysely
      .selectFrom('tbtickets')
      .select([
        sql<number>`SUM(total)`.as('totalDeudas'),
        sql<number>`COUNT(DISTINCT socio)`.as('clientesConDeuda'),
      ])
      .where('credito', '=', 1)
      .where('cancelado', '=', 0)
      .executeTakeFirst();

    return {
      totalDeudas: Number(result?.totalDeudas) || 0,
      clientesConDeuda: result?.clientesConDeuda || 0,
    };
  }

  async getEstadisticaPagos(fechaInicio?: string, fechaFin?: string) {
    const kysely = this.db.getKysely();

    // Construir condiciones de fecha para las subqueries
    let fechaCondition = '';
    if (fechaInicio) {
      fechaCondition += ` AND DATE(fecha) >= '${fechaInicio}'`;
    }
    if (fechaFin) {
      fechaCondition += ` AND DATE(fecha) <= '${fechaFin}'`;
    }

    const result = await kysely
      .selectFrom('tbmodospago')
      .select([
        'nommodopago as tipoPago',
        sql<number>`(SELECT COUNT(*) FROM tbmensualidades WHERE modopago = tbmodospago.modopago AND cancelado = 0${sql.raw(fechaCondition)})`.as('cantidad'),
        sql<number>`(SELECT COALESCE(SUM(total), 0) FROM tbmensualidades WHERE modopago = tbmodospago.modopago AND cancelado = 0${sql.raw(fechaCondition)})`.as('monto'),
      ])
      .execute();

    return result.map((r) => ({
      tipoPago: r.tipoPago,
      cantidad: Number(r.cantidad),
      monto: Number(r.monto),
    }));
  }

  async getEstadisticaMembresias() {
    const kysely = this.db.getKysely();

    // Contar socios activos e inactivos directamente de la tabla tbsocios
    // activo = 1 significa activo, cualquier otro valor (0, NULL) es inactivo
    const activas = await kysely
      .selectFrom('tbsocios')
      .select(sql<number>`COUNT(*)`.as('count'))
      .where('activo', '=', 1)
      .executeTakeFirst();

    const inactivas = await kysely
      .selectFrom('tbsocios')
      .select(sql<number>`COUNT(*)`.as('count'))
      .where(sql`COALESCE(activo, 0)`, '!=', 1)
      .executeTakeFirst();

    const totalActivas = Number(activas?.count) || 0;
    const totalInactivas = Number(inactivas?.count) || 0;

    return {
      membresiasActivas: totalActivas,
      membresiasInactivas: totalInactivas,
      porcentajeActivas: totalActivas + totalInactivas > 0
        ? Math.round((totalActivas / (totalActivas + totalInactivas)) * 100)
        : 0,
    };
  }

  async getEstadisticaIngresos(fechaInicio?: string, fechaFin?: string) {
    const kysely = this.db.getKysely();
    
    // Determinar rango de fechas
    let fechaInicioDate: Date;
    let fechaFinDate: Date;
    
    if (fechaInicio && fechaFin) {
      fechaInicioDate = new Date(fechaInicio);
      fechaFinDate = new Date(fechaFin);
    } else {
      // Por defecto: mes actual
      fechaInicioDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      fechaFinDate = new Date();
    }
    
    // Calcular inicio para últimos 6 meses
    const hace6Meses = new Date(fechaFinDate);
    hace6Meses.setMonth(hace6Meses.getMonth() - 5);
    hace6Meses.setDate(1);
    
    // Ingreso total y cantidad de pagos en el período
    const resumenPeriodo = await kysely
      .selectFrom('tbtickets')
      .select([
        sql<number>`SUM(total)`.as('total'),
        sql<number>`COUNT(*)`.as('cantidad'),
      ])
      .where('cancelado', '=', 0)
      .where('fecha', '>=', fechaInicioDate)
      .where('fecha', '<=', fechaFinDate)
      .executeTakeFirst();

    // Ingresos por mes (últimos 6 meses) con cantidad de pagos
    const ingresosMensuales = await kysely
      .selectFrom('tbtickets')
      .select([
        sql<string>`DATE_FORMAT(fecha, '%Y-%m')`.as('mes'),
        sql<number>`SUM(total)`.as('monto'),
        sql<number>`COUNT(*)`.as('pagos'),
      ])
      .where('cancelado', '=', 0)
      .where('fecha', '>=', hace6Meses)
      .groupBy(sql`DATE_FORMAT(fecha, '%Y-%m')`)
      .orderBy('mes', 'asc')
      .execute();

    // Ingresos por método de pago
    const ingresosPorMetodo = await kysely
      .selectFrom('tbtickets')
      .innerJoin('tbmodospago', 'tbtickets.modopago', 'tbmodospago.modopago')
      .select([
        'tbmodospago.nommodopago as metodo',
        sql<number>`SUM(tbtickets.total)`.as('monto'),
        sql<number>`COUNT(*)`.as('pagos'),
      ])
      .where('tbtickets.cancelado', '=', 0)
      .where('tbtickets.fecha', '>=', fechaInicioDate)
      .where('tbtickets.fecha', '<=', fechaFinDate)
      .groupBy('tbmodospago.nommodopago')
      .orderBy('monto', 'desc')
      .execute();

    const totalIngresos = Number(resumenPeriodo?.total) || 0;
    const totalPagos = Number(resumenPeriodo?.cantidad) || 0;

    return {
      ingresoTotal: totalIngresos,
      totalPagos: totalPagos,
      promedioPorPago: totalPagos > 0 ? Math.round(totalIngresos / totalPagos) : 0,
      periodo: fechaInicio && fechaFin ? `${fechaInicio} - ${fechaFin}` : 'Mes actual',
      mensuales: ingresosMensuales.map((m) => ({
        mes: m.mes,
        monto: Number(m.monto),
        pagos: Number(m.pagos),
      })),
      porMetodo: ingresosPorMetodo.map((m) => ({
        metodo: m.metodo,
        monto: Number(m.monto),
        pagos: Number(m.pagos),
      })),
    };
  }

  async getEstadisticaTiposClientes() {
    const kysely = this.db.getKysely();
    
    const result = await kysely
      .selectFrom('tbsocios')
      .select([
        sql<string>`
          CASE 
            WHEN becado = 1 THEN 'Becado'
            WHEN nivel = 1 THEN 'Premium'
            WHEN nivel = 2 THEN 'Estándar'
            ELSE 'Regular'
          END
        `.as('tipo'),
        sql<number>`COUNT(*)`.as('cantidad'),
      ])
      .where('activo', '=', 1)
      .groupBy('tipo')
      .orderBy('cantidad', 'desc')
      .execute();

    return result;
  }

  async getEstadisticaAccesos(fechaInicio?: string, fechaFin?: string) {
    const kysely = this.db.getKysely();

    let query = kysely
      .selectFrom('tbasistencia')
      .select([
        sql<Date>`DATE(fecha)`.as('fecha'),
        sql<number>`COUNT(*)`.as('cantidad'),
      ]);

    // Aplicar filtros de fecha
    if (fechaInicio) {
      query = query.where(sql`DATE(fecha)`, '>=', fechaInicio);
    }
    if (fechaFin) {
      query = query.where(sql`DATE(fecha)`, '<=', fechaFin);
    }

    // Si no hay filtros, limitar a últimos 14 días
    if (!fechaInicio && !fechaFin) {
      const hace14Dias = new Date();
      hace14Dias.setDate(hace14Dias.getDate() - 14);
      query = query.where('fecha', '>=', hace14Dias);
    }

    const result = await query
      .groupBy(sql`DATE(fecha)`)
      .orderBy('fecha', 'desc')
      .limit(14)
      .execute();

    return result;
  }

  async getVentasDiarias() {
    const kysely = this.db.getKysely();
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    
    const result = await kysely
      .selectFrom('tbtickets')
      .select([
        sql<Date>`DATE(fecha)`.as('fecha'),
        sql<number>`COUNT(*)`.as('cantidad'),
        sql<number>`SUM(total)`.as('monto'),
      ])
      .where('cancelado', '=', 0)
      .where('fecha', '>=', hace30Dias)
      .groupBy(sql`DATE(fecha)`)
      .orderBy('fecha', 'asc')
      .execute();

    return result.map((r) => ({
      fecha: r.fecha,
      cantidad: r.cantidad,
      monto: Number(r.monto),
    }));
  }

  async getProductosMasVendidos() {
    const kysely = this.db.getKysely();
    const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    const result = await kysely
      .selectFrom('tbdettickets')
      .innerJoin('tbproductos', 'tbdettickets.producto', 'tbproductos.producto')
      .innerJoin('tbtickets', 'tbdettickets.ticket', 'tbtickets.ticket')
      .select([
        'tbproductos.nomproducto as producto',
        sql<number>`SUM(tbdettickets.cantidad)`.as('cantidadVendida'),
        sql<number>`SUM(tbdettickets.importe)`.as('ingresoTotal'),
      ])
      .where('tbtickets.cancelado', '=', 0)
      .where('tbtickets.fecha', '>=', primerDiaMes)
      .groupBy('tbproductos.nomproducto')
      .orderBy('cantidadVendida', 'desc')
      .limit(10)
      .execute();

    return result.map((r) => ({
      producto: r.producto,
      cantidadVendida: r.cantidadVendida,
      ingresoTotal: Number(r.ingresoTotal),
    }));
  }
}
