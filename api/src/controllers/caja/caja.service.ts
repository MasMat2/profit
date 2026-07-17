import { Injectable, BadRequestException } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../database/database.service';

const EMPTY_DATE = new Date('1900-01-01T00:00:00');

export interface EstadoCaja {
  abierta: boolean;
  apertura: { id: number; fecnvo: Date; usunvo: number } | null;
}

@Injectable()
export class CajaService {
  constructor(private readonly db: DatabaseService) {}

  async getEstado(): Promise<EstadoCaja> {
    const db = this.db.getKysely();

    const ultima = await db
      .selectFrom('tbapertura')
      .select(['id', 'abrir', 'usunvo', 'fecnvo'])
      .orderBy('id', 'desc')
      .executeTakeFirst();

    const abierta = !!ultima && Number(ultima.abrir) === 1;

    return {
      abierta,
      apertura: abierta && ultima ? { id: ultima.id, fecnvo: ultima.fecnvo, usunvo: ultima.usunvo } : null,
    };
  }

  async assertAbierta(): Promise<void> {
    const estado = await this.getEstado();
    if (!estado.abierta) {
      throw new BadRequestException('La caja está cerrada. Debe abrir la caja antes de registrar pagos.');
    }
  }

  async abrir() {
    const estado = await this.getEstado();
    if (estado.abierta) {
      throw new BadRequestException('La caja ya se encuentra abierta.');
    }

    const db = this.db.getKysely();
    const now = new Date();

    await db
      .insertInto('tbapertura')
      .values({
        abrir: 1,
        envia: 1,
        fecmod: EMPTY_DATE,
        fecnvo: now,
        usumod: 0,
        usunvo: 1,
      })
      .execute();

    await db
      .insertInto('tbaperturas')
      .values({
        envia: 1,
        fecha: now,
        fecmod: EMPTY_DATE,
        fecnvo: now,
        motivo: 'Apertura de caja',
        usumod: 0,
        usunvo: 1,
      })
      .execute();

    return this.getEstado();
  }

  async cerrar(obs?: string) {
    const estado = await this.getEstado();
    if (!estado.abierta || !estado.apertura) {
      throw new BadRequestException('No hay una caja abierta para cerrar.');
    }

    const desde = estado.apertura.fecnvo;
    const aperturaId = estado.apertura.id;
    const now = new Date();
    const db = this.db.getKysely();

    return db.transaction().execute(async (trx) => {
      const [ingresosRow, gastosRow, maxCorteRow] = await Promise.all([
        trx
          .selectFrom('tbingresos')
          .select(sql<string>`coalesce(sum(importe), 0)`.as('total'))
          .where('cancelado', '=', 0)
          .where('fecha', '>=', desde)
          .executeTakeFirst(),
        trx
          .selectFrom('tbgastos')
          .select(sql<string>`coalesce(sum(importe), 0)`.as('total'))
          .where('fecha', '>=', desde)
          .executeTakeFirst(),
        trx
          .selectFrom('tbcortes')
          .select(sql<string>`coalesce(max(corte), 0)`.as('maxCorte'))
          .executeTakeFirst(),
      ]);

      const totIngresos = Number(ingresosRow?.total ?? 0);
      const totGastos = Number(gastosRow?.total ?? 0);
      const nuevoCorte = Number(maxCorteRow?.maxCorte ?? 0) + 1;

      await trx
        .insertInto('tbcortes')
        .values({
          bauchers: 0,
          cheques: 0,
          compras: 0,
          corte: nuevoCorte,
          efecencaja: 0,
          efectivo: 0,
          entradafin: 0,
          entradaini: 0,
          envia: 1,
          faltante: 0,
          fdocaja: 0,
          fecha: now,
          fecmod: now,
          fecnvo: now,
          fichasdep: 0,
          gastos: totGastos,
          ingefec: 0,
          obs: obs ?? null,
          salefec: 0,
          salidafin: 0,
          salidaini: 0,
          sobrante: 0,
          totingresos: totIngresos,
          usuario: 1,
          usumod: 0,
          usunvo: 1,
          vales: 0,
          vtascredito: 0,
        })
        .execute();

      await trx
        .updateTable('tbapertura')
        .set({ abrir: 0, usumod: 1, fecmod: now })
        .where('id', '=', aperturaId)
        .execute();

      await trx
        .insertInto('tbaperturas')
        .values({
          envia: 1,
          fecha: now,
          fecmod: EMPTY_DATE,
          fecnvo: now,
          motivo: 'Cierre de caja',
          usumod: 0,
          usunvo: 1,
        })
        .execute();

      return {
        corte: nuevoCorte,
        fecha: now,
        totingresos: totIngresos,
        gastos: totGastos,
        obs: obs ?? null,
      };
    });
  }

  async getCortes() {
    const db = this.db.getKysely();
    const rows = await db
      .selectFrom('tbcortes')
      .select(['corte', 'fecha', 'usuario', 'totingresos', 'gastos', 'obs'])
      .orderBy('corte', 'desc')
      .execute();

    return rows.map((row) => ({
      ...row,
      totingresos: Number(row.totingresos),
      gastos: Number(row.gastos),
    }));
  }
}
