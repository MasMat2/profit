import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { sql } from 'kysely';

@Injectable()
export class EstadisticasService {
  constructor(private readonly db: DatabaseService) {}

  async getEstadisticaGenero() {
    const kysely = this.db.getKysely();
    
    const result = await kysely
      .selectFrom('tbsocios')
      .select([
        sql<number>`SUM(CASE WHEN sexo = 1 THEN 1 ELSE 0 END)`.as('masculino'),
        sql<number>`SUM(CASE WHEN sexo = 2 THEN 1 ELSE 0 END)`.as('femenino'),
        sql<number>`COUNT(*)`.as('total'),
      ])
      .where('activo', '=', 1)
      .executeTakeFirst();

    return result || { masculino: 0, femenino: 0, total: 0 };
  }

  async getEstadisticaEdades() {
    const kysely = this.db.getKysely();
    
    const result = await kysely
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
      .where('cumpleaños', 'is not', null)
      .groupBy('rango')
      .orderBy('rango')
      .execute();

    return result;
  }

  async getEstadisticaPaquetes() {
    const kysely = this.db.getKysely();
    
    const result = await kysely
      .selectFrom('tbclases')
      .select([
        'nomclase as paquete',
        sql<number>`(SELECT COUNT(*) FROM tbsocios WHERE FIND_IN_SET(LPAD(tbclases.clase, 3, '0'), clases) AND activo = 1)`.as('usuarios'),
      ])
      .where('activa', '=', 1)
      .orderBy('usuarios', 'desc')
      .execute();

    return result;
  }

  async getEstadisticaInscripciones() {
    const kysely = this.db.getKysely();
    const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    const nuevas = await kysely
      .selectFrom('tbsocios')
      .select(sql<number>`COUNT(*)`.as('count'))
      .where('fecnvo', '>=', primerDiaMes)
      .executeTakeFirst();

    const bajas = await kysely
      .selectFrom('tbsocios')
      .select(sql<number>`COUNT(*)`.as('count'))
      .where('activo', '=', 0)
      .where('fecmod', '>=', primerDiaMes)
      .executeTakeFirst();

    return {
      nuevas: nuevas?.count || 0,
      bajas: bajas?.count || 0,
      periodo: 'Mes actual',
    };
  }

  async getEstadisticaSaldo() {
    const kysely = this.db.getKysely();
    
    const result = await kysely
      .selectFrom('tbtickets')
      .select(sql<number>`SUM(total)`.as('saldoTotal'))
      .where('cancelado', '=', 0)
      .where('credito', '=', 0)
      .executeTakeFirst();

    return {
      saldoTotal: Number(result?.saldoTotal) || 0,
      fecha: new Date(),
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

  async getEstadisticaPagos() {
    const kysely = this.db.getKysely();
    
    const result = await kysely
      .selectFrom('tbmodospago')
      .select([
        'nommodopago as tipoPago',
        sql<number>`(SELECT COUNT(*) FROM tbmensualidades WHERE modopago = tbmodospago.modopago AND cancelado = 0)`.as('cantidad'),
        sql<number>`(SELECT COALESCE(SUM(total), 0) FROM tbmensualidades WHERE modopago = tbmodospago.modopago AND cancelado = 0)`.as('monto'),
      ])
      .execute();

    return result.map((r) => ({
      tipoPago: r.tipoPago,
      cantidad: r.cantidad,
      monto: Number(r.monto),
    }));
  }

  async getEstadisticaMembresias() {
    const kysely = this.db.getKysely();
    
    const activas = await kysely
      .selectFrom('tbmensualidades')
      .select(sql<number>`COUNT(DISTINCT socio)`.as('count'))
      .where('cancelado', '=', 0)
      .where('pagado', '=', 1)
      .executeTakeFirst();

    const inactivas = await kysely
      .selectFrom('tbmensualidades')
      .select(sql<number>`COUNT(DISTINCT socio)`.as('count'))
      .where('cancelado', '=', 1)
      .executeTakeFirst();

    const totalActivas = activas?.count || 0;
    const totalInactivas = inactivas?.count || 0;
    const total = totalActivas + totalInactivas;

    return {
      membresiasActivas: totalActivas,
      membresiasInactivas: totalInactivas,
      porcentajeActivas: total > 0 ? Math.round((totalActivas / total) * 100) : 0,
    };
  }

  async getEstadisticaIngresos() {
    const kysely = this.db.getKysely();
    const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const hace6Meses = new Date();
    hace6Meses.setMonth(hace6Meses.getMonth() - 5);
    hace6Meses.setDate(1);
    
    const ingresoTotal = await kysely
      .selectFrom('tbtickets')
      .select(sql<number>`SUM(total)`.as('total'))
      .where('cancelado', '=', 0)
      .where('fecha', '>=', primerDiaMes)
      .executeTakeFirst();

    const desglose = await kysely
      .selectFrom('tbdettickets')
      .innerJoin('tbproductos', 'tbdettickets.producto', 'tbproductos.producto')
      .innerJoin('tbtickets', 'tbdettickets.ticket', 'tbtickets.ticket')
      .select([
        'tbproductos.nomproducto as concepto',
        sql<number>`SUM(tbdettickets.importe)`.as('monto'),
      ])
      .where('tbtickets.cancelado', '=', 0)
      .where('tbtickets.fecha', '>=', primerDiaMes)
      .groupBy('tbproductos.nomproducto')
      .orderBy('monto', 'desc')
      .limit(5)
      .execute();

    // Ingresos por mes (últimos 6 meses)
    const ingresosMensuales = await kysely
      .selectFrom('tbtickets')
      .select([
        sql<string>`DATE_FORMAT(fecha, '%Y-%m')`.as('mes'),
        sql<number>`SUM(total)`.as('monto'),
      ])
      .where('cancelado', '=', 0)
      .where('fecha', '>=', hace6Meses)
      .groupBy(sql`DATE_FORMAT(fecha, '%Y-%m')`)
      .orderBy('mes', 'asc')
      .execute();

    return {
      ingresoTotal: Number(ingresoTotal?.total) || 0,
      periodo: 'Mes actual',
      desglose: desglose.map((d) => ({
        concepto: d.concepto,
        monto: Number(d.monto),
      })),
      mensuales: ingresosMensuales.map((m) => ({
        mes: m.mes,
        monto: Number(m.monto),
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

  async getEstadisticaAccesos() {
    const kysely = this.db.getKysely();
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);
    
    const result = await kysely
      .selectFrom('tbasistencia')
      .select([
        sql<Date>`DATE(fecha)`.as('fecha'),
        sql<number>`COUNT(*)`.as('cantidad'),
      ])
      .where('fecha', '>=', hace7Dias)
      .groupBy(sql`DATE(fecha)`)
      .orderBy('fecha', 'desc')
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
