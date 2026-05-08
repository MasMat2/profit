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
        'm.cancelado',
        'm.inscrip'
      ]);

    // Aplicar filtro de búsqueda si se proporciona
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
      .limit(100) // Limitar resultados para mejor rendimiento
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

    // Aplicar filtro de búsqueda si se proporciona
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
      .limit(100) // Limitar resultados para mejor rendimiento
      .execute();

    return tickets;
  }

  async cobrarMensualidad(cobrarDto: CobrarMensualidadDto) {
    try {
      const kysely = this.db.getKysely();
      
      // Obtener datos actuales de la mensualidad
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

      // Usar el saldo actual o el total si no hay saldo registrado
      const saldoActual = Number(mensualidad.saldo) > 0 ? Number(mensualidad.saldo) : Number(mensualidad.total);
      
      if (cobrarDto.monto > saldoActual) {
        throw new Error('El monto a cobrar excede el saldo pendiente');
      }

      // Calcular nuevo saldo
      const nuevoSaldo = saldoActual - cobrarDto.monto;
      const estaPagada = nuevoSaldo <= 0 ? 1 : 0;

      // Actualizar mensualidad
      await kysely
        .updateTable('tbmensualidades')
        .set({
          saldo: (nuevoSaldo >= 0 ? nuevoSaldo : 0) as any,
          pagado: estaPagada as any
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
