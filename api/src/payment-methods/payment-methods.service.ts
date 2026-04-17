import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { sql } from 'kysely';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getAllPaymentMethods() {
    const db = this.databaseService.getKysely();
    
    return await db
      .selectFrom('tbformaspago')
      .selectAll()
      .orderBy('id', 'asc')
      .execute();
  }

  async getPaymentMethodById(id: number) {
    const db = this.databaseService.getKysely();
    
    const result = await db
      .selectFrom('tbformaspago')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    
    return result || null;
  }

  async createPaymentMethod(data: any) {
    const db = this.databaseService.getKysely();
    
    const result = await db
      .insertInto('tbformaspago')
      .values({
        fp: data.fp || 0,
        nomfp: data.nomfp,
        usunvo: data.usunvo || 1,
        fecnvo: sql`NOW()`,
        usumod: data.usumod || 1,
        fecmod: sql`NOW()`,
        envia: data.envia || 0,
        c_formapago: data.c_formapago || '',
        c_moneda: data.c_moneda || 'MXN',
      })
      .executeTakeFirstOrThrow();
    
    return this.getPaymentMethodById(Number(result.insertId));
  }

  async updatePaymentMethod(id: number, data: any) {
    const db = this.databaseService.getKysely();
    
    await db
      .updateTable('tbformaspago')
      .set({
        fp: data.fp || 0,
        nomfp: data.nomfp,
        usumod: data.usumod || 1,
        fecmod: sql`NOW()`,
        envia: data.envia || 0,
        c_formapago: data.c_formapago || '',
        c_moneda: data.c_moneda || 'MXN',
      })
      .where('id', '=', id)
      .execute();
    
    return this.getPaymentMethodById(id);
  }

  async deletePaymentMethod(id: number) {
    const db = this.databaseService.getKysely();
    
    await db
      .deleteFrom('tbformaspago')
      .where('id', '=', id)
      .execute();
    
    return { success: true, message: 'Payment method deleted successfully' };
  }
}
