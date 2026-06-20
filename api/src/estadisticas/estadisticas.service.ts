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
        sql<number>`(SELECT COUNT(DISTINCT id) FROM tbsocios WHERE FIND_IN_SET(LPAD(tbclases.clase, 3, '0'), clases) AND activo = 1${sql.raw(fechaCondition)})`.as('usuarios'),
      ])
      .where('activa', '=', 1)
      .orderBy('usuarios', 'desc')
      .limit(10)
      .execute();

    return result;
  }

  async getEstadisticaInscripciones(fechaInicio?: string, fechaFin?: string) {
    const kysely = this.db.getKysely();

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
    
    let queryTickets = kysely
      .selectFrom('tbtickets')
      .select(sql<number>`COALESCE(SUM(total), 0)`.as('total'))
      .where('cancelado', '=', 0)
      .where('credito', '=', 0);
    
    let queryIngresos = kysely
      .selectFrom('tbingresos')
      .select(sql<number>`COALESCE(SUM(importe), 0)`.as('total'))
      .where('cancelado', '=', 0);
    
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
    
    const [resultTickets, resultIngresos] = await Promise.all([
      queryTickets.executeTakeFirst(),
      queryIngresos.executeTakeFirst(),
    ]);
    
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

    if (fechaInicio) {
      query = query.where(sql`DATE(fecha)`, '>=', fechaInicio);
    }
    if (fechaFin) {
      query = query.where(sql`DATE(fecha)`, '<=', fechaFin);
    }

    if (!fechaInicio && !fechaFin) {
      const hace14Dias = new Date();
      hace14Dias.setDate(hace14Dias.getDate() - 14);
      query = query.where('fecha', '>=', hace14Dias);
    }

    const result = await query
      .groupBy(sql`DATE(fecha)`)
      .orderBy('fecha', 'desc')
      .execute();

    return result;
  }

  async getTicketsGlobal(fechaInicio?: string, fechaFin?: string) {
    const kysely = this.db.getKysely();

    let query = kysely
      .selectFrom('tbtickets as t')
      .leftJoin('tbsocios as s', 't.socio', 's.id')
      .select([
        't.ticket',
        't.fecha',
        't.total',
        't.credito',
        't.pagado',
        't.saldo',
        't.notas',
        's.nomsocio as cliente',
        sql<string>`DATE_FORMAT(t.fecha, '%Y-%m-%d')`.as('fechaDia'),
        sql<string>`DATE_FORMAT(t.fecha, '%Y-%m')`.as('fechaMes'),
        sql<string>`DATE_FORMAT(t.fecha, '%Y')`.as('fechaAnio'),
      ])
      .where('t.cancelado', '=', 0)
      .orderBy('t.fecha', 'desc');

    if (fechaInicio) {
      query = query.where(sql`DATE(t.fecha)`, '>=', fechaInicio);
    }
    if (fechaFin) {
      query = query.where(sql`DATE(t.fecha)`, '<=', fechaFin);
    }

    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];

    if (!fechaInicio && !fechaFin) {
      query = query.where(sql`DATE(t.fecha)`, '=', hoyStr);
    }

    const tickets = await query.limit(1000).execute();
    const mesActual = hoy.toISOString().slice(0, 7);
    const anioActual = hoy.getFullYear().toString();

    let totalDia = 0;
    let totalMes = 0;
    let totalAnio = 0;

    tickets.forEach((ticket) => {
      const monto = Number(ticket.total) || 0;
      if (ticket.fechaDia === hoyStr) totalDia += monto;
      if (ticket.fechaMes === mesActual) totalMes += monto;
      if (ticket.fechaAnio === anioActual) totalAnio += monto;
    });

    const ticketsFormateados = tickets.map((t) => {
      let metodoPago: string;
      const notasFP = t.notas?.match(/^\[FP:([^\]]+)\]/);
      if (notasFP) {
        metodoPago = notasFP[1];
      } else if (t.notas && t.notas.trim().length > 0) {
        metodoPago = t.notas.trim();
      } else if (t.credito === 1) {
        metodoPago = 'Crédito';
      } else if (Number(t.saldo) > 0 && t.pagado === 0) {
        metodoPago = 'Pendiente';
      } else {
        metodoPago = 'Contado';
      }

      return {
        ticket: t.ticket,
        fecha: t.fecha,
        cliente: t.cliente?.trim() || 'Cliente ocasional',
        total: Number(t.total),
        credito: t.credito === 1,
        metodoPago,
      };
    });

    const totalesPorMetodo: Record<string, number> = {};
    ticketsFormateados.forEach((t) => {
      totalesPorMetodo[t.metodoPago] = (totalesPorMetodo[t.metodoPago] || 0) + t.total;
    });

    const porMetodo = Object.entries(totalesPorMetodo)
      .map(([metodo, monto]) => ({ metodo, monto }))
      .sort((a, b) => b.monto - a.monto);

    return {
      tickets: ticketsFormateados,
      totales: {
        dia: totalDia,
        mes: totalMes,
        anio: totalAnio,
        cantidadTickets: tickets.length,
        porMetodo,
      },
      periodo: fechaInicio && fechaFin ? `${fechaInicio} - ${fechaFin}` : 'Hoy',
    };
  }
}
