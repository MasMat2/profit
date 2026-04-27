import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class RegistroTicketsService {
  constructor(private readonly db: DatabaseService) {}

  async getMensualidades() {
    const mensualidades = await this.db.getKysely()
      .selectFrom('tbmensualidades as m')
      .leftJoin('tbsocios as s', 's.socio', 'm.socio')
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
      ])
      .orderBy('m.fecha', 'desc')
      .limit(100)
      .execute();

    return mensualidades;
  }

  async getTickets() {
    const tickets = await this.db.getKysely()
      .selectFrom('tbtickets as t')
      .leftJoin('tbsocios as s', 's.socio', 't.socio')
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
      ])
      .orderBy('t.fecha', 'desc')
      .limit(100)
      .execute();

    return tickets;
  }
}
