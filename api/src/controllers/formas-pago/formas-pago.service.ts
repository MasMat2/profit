import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { Tbformaspago } from '../../database/database.types';

export type CreateFormaPagoDto = Pick<Tbformaspago, 'nomfp'> & Partial<Pick<Tbformaspago, 'c_formapago' | 'c_moneda'>>;
export type UpdateFormaPagoDto = Partial<Pick<Tbformaspago, 'nomfp' | 'c_formapago' | 'c_moneda'>>;


@Injectable()
export class FormasPagoService {
  constructor(private readonly db: DatabaseService) {}

  async getFormasPago() {
    const db = this.db.getKysely();
    return db
      .selectFrom('tbformaspago')
      .select(['id', 'nomfp', 'c_formapago', 'c_moneda'])
      .orderBy('nomfp', 'asc')
      .execute();
  }

  // tbingresos.fp debería referenciar tbformaspago.fp (así lo une BDK), pero el alta de
  // cobros guarda ahí el 'id' del catálogo. Se indexa por ambas llaves, dando prioridad
  // a fp, para resolver tanto las filas históricas como las nuevas.
  async getCatalogoFormasPago(): Promise<Map<number, string>> {
    const db = this.db.getKysely();

    const formas = await db
      .selectFrom('tbformaspago')
      .select(['id', 'fp', 'nomfp'])
      .execute();

    const porLlave = new Map<number, string>();
    for (const forma of formas) {
      porLlave.set(Number(forma.id), forma.nomfp.trim());
    }
    for (const forma of formas) {
      const fp = Number(forma.fp);
      if (fp > 0) porLlave.set(fp, forma.nomfp.trim());
    }

    return porLlave;
  }

  async createFormaPago(dto: CreateFormaPagoDto) {
    const db = this.db.getKysely();
    const now = new Date();
    await db
      .insertInto('tbformaspago')
      .values({
        nomfp: dto.nomfp,
        c_formapago: dto.c_formapago ?? '',
        c_moneda: dto.c_moneda ?? 'MXN',
        fp: 0,
        envia: 0,
        fecmod: now,
        fecnvo: now,
        usumod: 0,
        usunvo: 0,
      })
      .execute();
    return this.getFormasPago();
  }

  async updateFormaPago(id: number, dto: UpdateFormaPagoDto) {
    const db = this.db.getKysely();
    const existing = await db
      .selectFrom('tbformaspago')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst();
    if (!existing) throw new NotFoundException(`FormaPago ${id} not found`);
    await db
      .updateTable('tbformaspago')
      .set({ ...dto, fecmod: new Date() })
      .where('id', '=', id)
      .execute();
    return this.getFormasPago();
  }

  async deleteFormaPago(id: number) {
    const db = this.db.getKysely();
    await db
      .deleteFrom('tbformaspago')
      .where('id', '=', id)
      .execute();
    return this.getFormasPago();
  }
}

