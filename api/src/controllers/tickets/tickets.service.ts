import { Injectable, NotFoundException } from '@nestjs/common';
import { sql, SqlBool } from 'kysely';
import { DatabaseService } from '../../database/database.service';
import { FormasPagoService } from '../formas-pago/formas-pago.service';

export type TicketEstatusFiltro = 'pagados' | 'pendientes' | 'cancelados' | 'todos';

export interface ListarTicketsQuery {
  desde?: string; // 'yyyy-MM-dd'
  hasta?: string; // 'yyyy-MM-dd' (inclusivo)
  socio?: string; // nombre (LIKE) o número de socio (exacto si es numérico)
  estatus?: TicketEstatusFiltro;
}

// Tope de seguridad: tbmensualidades es histórica y el grid pagina en cliente.
const MAX_ROWS = 2000;

// La "fecha del ticket" es la del cobro cuando ya se pagó y la del cargo cuando sigue
// pendiente: tbmensualidades deja fecpago en el centinela 1900-01-01 hasta que se cobra.
const FECHA_TICKET = sql<Date>`case when m.pagado = 1 then m.fecpago else m.fecha end`;

function estatusDe(pagado: number, cancelado: number): string {
  if (Number(cancelado) === 1) return 'Cancelado';
  return Number(pagado) === 1 ? 'Pagado' : 'Pendiente';
}

function fechaTicketDe(pagado: number, fechaCargo: Date, fechaPago: Date): Date {
  return Number(pagado) === 1 ? fechaPago : fechaCargo;
}

function parseFecha(valor: string | undefined, finDelDia = false): Date | undefined {
  if (!valor) return undefined;
  const fecha = new Date(`${valor}T00:00:00`);
  if (isNaN(fecha.getTime())) return undefined;
  // 'hasta' es inclusivo: se compara contra el inicio del día siguiente.
  if (finDelDia) fecha.setDate(fecha.getDate() + 1);
  return fecha;
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly formasPagoService: FormasPagoService,
  ) {}

  async getTickets(query: ListarTicketsQuery) {
    const db = this.db.getKysely();

    const desde = parseFecha(query.desde);
    const hasta = parseFecha(query.hasta, true);
    // Por defecto se devuelve todo el rango (pagados, pendientes y cancelados): el
    // grid trae su propio filtro por columna sobre el estatus.
    const estatus = query.estatus ?? 'todos';
    const socio = (query.socio ?? '').trim();

    let consulta = db
      .selectFrom('tbmensualidades as m')
      .leftJoin('tbsocios as s', 's.socio', 'm.socio')
      // leftJoin: las filas históricas pueden apuntar a usuarios que ya no existen.
      .leftJoin('tbusuarios as u', 'u.usuario', 'm.usunvo')
      .select([
        'm.id',
        'm.idmens',
        'm.socio',
        'm.fecha as fechaCargo',
        'm.fecpago as fechaPago',
        'm.descrip',
        'm.importe',
        'm.descuento',
        'm.total',
        'm.saldo',
        'm.pagado',
        'm.cancelado',
        's.nomsocio',
        'u.nombre as cajero',
      ]);

    if (desde) consulta = consulta.where(sql<SqlBool>`${FECHA_TICKET} >= ${desde}`);
    if (hasta) consulta = consulta.where(sql<SqlBool>`${FECHA_TICKET} < ${hasta}`);

    if (estatus === 'pagados') {
      consulta = consulta.where('m.cancelado', '=', 0).where('m.pagado', '=', 1);
    } else if (estatus === 'pendientes') {
      consulta = consulta.where('m.cancelado', '=', 0).where('m.pagado', '=', 0);
    } else if (estatus === 'cancelados') {
      consulta = consulta.where('m.cancelado', '=', 1);
    }

    if (socio) {
      consulta = /^\d+$/.test(socio)
        ? consulta.where('m.socio', '=', Number(socio))
        : consulta.where('s.nomsocio', 'like', `%${socio}%`);
    }

    const rows = await consulta
      .orderBy(FECHA_TICKET, 'desc')
      .orderBy('m.idmens', 'desc')
      .limit(MAX_ROWS)
      .execute();

    const pagosPorMens = await this.getFormasPagoPorMensualidad(rows.map((row) => row.idmens));

    return rows.map((row) => ({
      tipo: 'mensualidad' as const,
      id: row.id,
      idmens: row.idmens,
      folio: row.idmens,
      fecha: fechaTicketDe(row.pagado, row.fechaCargo, row.fechaPago),
      fechaCargo: row.fechaCargo,
      fechaPago: row.fechaPago,
      socio: row.socio,
      nomsocio: row.nomsocio?.trim() ?? '',
      descrip: row.descrip.trim(),
      importe: Number(row.importe),
      descuento: Number(row.descuento),
      total: Number(row.total),
      saldo: Number(row.saldo),
      pagado: row.pagado,
      cancelado: row.cancelado,
      estatus: estatusDe(row.pagado, row.cancelado),
      formasPago: pagosPorMens.get(row.idmens)?.join(', ') ?? '',
      cajero: row.cajero?.trim() || null,
    }));
  }

  async getTicketMensualidad(idmens: number) {
    const db = this.db.getKysely();

    const row = await db
      .selectFrom('tbmensualidades as m')
      .leftJoin('tbsocios as s', 's.socio', 'm.socio')
      .leftJoin('tbusuarios as u', 'u.usuario', 'm.usunvo')
      // El descuento va aparte: tbmensualidades.descuento se sobrescribe al cobrar y
      // el motivo sólo queda registrado en tbdescuentos.
      .leftJoin('tbdescuentos as d', (join) =>
        join.onRef('d.idmens', '=', 'm.idmens').on('d.cancelado', '=', 0),
      )
      .select([
        'm.id',
        'm.idmens',
        'm.socio',
        'm.fecha as fechaCargo',
        'm.fecpago as fechaPago',
        'm.descrip',
        'm.importe',
        'm.descuento',
        'm.total',
        'm.saldo',
        'm.pagado',
        'm.cancelado',
        'm.motivo',
        's.nomsocio',
        'u.nombre as cajero',
        'd.motivo as motivoDescuento',
      ])
      .where('m.idmens', '=', idmens)
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundException(`Ticket de mensualidad ${idmens} no encontrado`);
    }

    const nombresFp = await this.formasPagoService.getCatalogoFormasPago();

    const pagos = await db
      .selectFrom('tbingresos')
      .select(['iding', 'fp', 'importe', 'referencia', 'fecha'])
      .where('idmens', '=', idmens)
      .where('cancelado', '=', 0)
      .orderBy('iding', 'asc')
      .execute();

    return {
      tipo: 'mensualidad' as const,
      id: row.id,
      idmens: row.idmens,
      folio: row.idmens,
      fecha: fechaTicketDe(row.pagado, row.fechaCargo, row.fechaPago),
      fechaCargo: row.fechaCargo,
      fechaPago: row.fechaPago,
      socio: row.socio,
      nomsocio: row.nomsocio?.trim() ?? '',
      descrip: row.descrip.trim(),
      importe: Number(row.importe),
      descuento: Number(row.descuento),
      total: Number(row.total),
      saldo: Number(row.saldo),
      pagado: row.pagado,
      cancelado: row.cancelado,
      estatus: estatusDe(row.pagado, row.cancelado),
      motivo: row.motivo.trim() || null,
      motivoDescuento: row.motivoDescuento?.trim() || null,
      cajero: row.cajero?.trim() || null,
      pagos: pagos.map((pago) => ({
        iding: pago.iding,
        fp: pago.fp,
        nomfp: nombresFp.get(pago.fp) ?? 'Otro',
        importe: Number(pago.importe),
        referencia: pago.referencia.trim(),
        fecha: pago.fecha,
      })),
    };
  }

  private async getFormasPagoPorMensualidad(idmensList: number[]): Promise<Map<number, string[]>> {
    const resultado = new Map<number, string[]>();
    if (idmensList.length === 0) return resultado;

    const db = this.db.getKysely();
    const nombresFp = await this.formasPagoService.getCatalogoFormasPago();

    const pagos = await db
      .selectFrom('tbingresos')
      .select(['idmens', 'fp'])
      .where('idmens', 'in', idmensList)
      .where('cancelado', '=', 0)
      .execute();

    for (const pago of pagos) {
      const nombre = nombresFp.get(pago.fp) ?? 'Otro';
      const actuales = resultado.get(pago.idmens);
      if (!actuales) {
        resultado.set(pago.idmens, [nombre]);
      } else if (!actuales.includes(nombre)) {
        actuales.push(nombre);
      }
    }

    return resultado;
  }
}
