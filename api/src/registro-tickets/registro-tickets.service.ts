import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CobrarMensualidadDto } from './dto/cobrar-mensualidad.dto';

@Injectable()
export class RegistroTicketsService {
  constructor(private readonly db: DatabaseService) {}

  async getMensualidades(busqueda?: string) {
    let query = this.db.getKysely()
      .selectFrom('tbmensualidades as m')
      .leftJoin('tbsocios as s', 's.id', 'm.socio')
      .leftJoin('tbformaspago as fp', 'fp.id', 'm.modopago' as any)
      .select([
        'm.idmens',
        'm.socio',
        's.nomsocio as nombreSocio',
        'm.fecha',
        'm.importe',
        'm.descuento',
        'm.total',
        'm.pagado',
        'm.saldo',
        'm.descrip',
        'm.modopago',
        'm.notas',
        'fp.nomfp as nommodopago',
        'm.cancelado',
        'm.inscrip'
      ]);

    if (busqueda && busqueda.trim().length > 0) {
      const termino = `%${busqueda.toLowerCase()}%`;
      query = query.where((eb) => 
        eb.or([
          eb(eb.fn('LOWER', ['s.nomsocio']), 'like', termino),
          eb(eb.fn('LOWER', ['m.descrip']), 'like', termino),
          eb('m.idmens', '=', isNaN(Number(busqueda)) ? -1 : Number(busqueda))
        ])
      );
    }

    const mensualidades = await query
      .orderBy('m.fecha', 'desc')
      .limit(100)
      .execute();

    return mensualidades;
  }

  async getTickets(busqueda?: string) {
    let query = this.db.getKysely()
      .selectFrom('tbtickets as t')
      .leftJoin('tbsocios as s', 's.id', 't.socio')
      .select([
        't.ticket',
        't.socio',
        's.nomsocio as nombreSocio',
        't.fecha',
        't.importe',
        't.descuento',
        't.total',
        't.pagado',
        't.saldo',
        't.iva',
        't.ieps',
        't.cancelado',
        't.credito'
      ]);

    if (busqueda && busqueda.trim().length > 0) {
      const termino = `%${busqueda.toLowerCase()}%`;
      query = query.where((eb) => 
        eb.or([
          eb(eb.fn('LOWER', ['s.nomsocio']), 'like', termino),
          eb('t.ticket', '=', isNaN(Number(busqueda)) ? -1 : Number(busqueda))
        ])
      );
    }

    const tickets = await query
      .orderBy('t.fecha', 'desc')
      .limit(100)
      .execute();

    return tickets;
  }

  async getDetalleTicket(ticketId: number) {
    const kysely = this.db.getKysely();

    const productos = await kysely
      .selectFrom('tbdettickets as d')
      .leftJoin('tbproductos as p', 'p.id', 'd.producto')
      .select([
        'p.nomproducto',
        'd.cnt',
        'd.venta',
        'd.importe'
      ])
      .where('d.ticket', '=', ticketId)
      .where('d.cancelado', '=', 0)
      .execute();

    const ticket = await kysely
      .selectFrom('tbtickets as t')
      .select([
        't.ticket',
        't.fecha',
        't.importe',
        't.descuento',
        't.iva',
        't.total',
        't.pagado',
        't.credito',
        't.notas'
      ])
      .where('t.ticket', '=', ticketId)
      .executeTakeFirst();

    return {
      ticket: ticket ? {
        ...ticket,
        formaPago: ticket.notas || (ticket.credito ? 'Crédito' : 'Contado')
      } : null,
      productos: productos.map(d => ({
        nombre: d.nomproducto || 'Producto',
        cantidad: Number(d.cnt),
        precio: Number(d.venta),
        subtotal: Number(d.importe)
      }))
    };
  }

  async cobrarMensualidad(cobrarDto: CobrarMensualidadDto) {
    try {
      const kysely = this.db.getKysely();
      
      const mensualidad = await kysely
        .selectFrom('tbmensualidades')
        .selectAll()
        .where('idmens', '=', cobrarDto.idmens)
        .executeTakeFirst();

      if (!mensualidad) {
        throw new Error('Mensualidad no encontrada');
      }

      if (mensualidad.cancelado === 1) {
        throw new Error('No se puede cobrar una mensualidad cancelada');
      }

      const saldoActual = Number(mensualidad.saldo) > 0 ? Number(mensualidad.saldo) : Number(mensualidad.total);
      
      if (cobrarDto.monto > saldoActual) {
        throw new Error('El monto a cobrar excede el saldo pendiente');
      }

      const nuevoSaldo = saldoActual - cobrarDto.monto;
      const estaPagada = nuevoSaldo <= 0 ? 1 : 0;

      const formaPagoRow = await kysely
        .selectFrom('tbformaspago')
        .select(['id'])
        .where((eb) => eb(
          eb.fn('LOWER', ['nomfp']), '=', cobrarDto.formaPago.toLowerCase()
        ))
        .executeTakeFirst();

      await kysely
        .updateTable('tbmensualidades')
        .set({
          saldo: (nuevoSaldo >= 0 ? nuevoSaldo : 0) as any,
          pagado: estaPagada as any,
          notas: cobrarDto.formaPago,
          ...(formaPagoRow ? { modopago: formaPagoRow.id as any } : {})
        })
        .where('idmens', '=', cobrarDto.idmens)
        .execute();

      return {
        success: true,
        mensaje: 'Cobro procesado exitosamente',
        nuevoSaldo: nuevoSaldo >= 0 ? nuevoSaldo : 0,
        pagada: estaPagada === 1
      };
    } catch (error) {
      console.error('Error en cobrarMensualidad:', error);
      throw error;
    }
  }
}
