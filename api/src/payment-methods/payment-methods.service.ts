import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getAllPaymentMethods() {
    const query = `SELECT * FROM tbformaspago ORDER BY id ASC`;
    return await this.databaseService.query(query);
  }

  async getPaymentMethodById(id: number) {
    const query = `SELECT * FROM tbformaspago WHERE id = ?`;
    const results = await this.databaseService.query(query, [id]);
    return results[0] || null;
  }

  async createPaymentMethod(data: any) {
    const query = `
      INSERT INTO tbformaspago 
      (fp, nomfp, usunvo, fecnvo, usumod, fecmod, envia, c_formapago, c_moneda) 
      VALUES (?, ?, ?, NOW(), ?, NOW(), ?, ?, ?)
    `;
    
    const params = [
      data.fp || 0,
      data.nomfp,
      data.usunvo || 1,
      data.usumod || 1,
      data.envia || 0,
      data.c_formapago || '',
      data.c_moneda || 'MXN'
    ];
    
    const result: any = await this.databaseService.query(query, params);
    return this.getPaymentMethodById(result.insertId);
  }

  async updatePaymentMethod(id: number, data: any) {
    const query = `
      UPDATE tbformaspago 
      SET 
        fp = ?,
        nomfp = ?,
        usumod = ?,
        fecmod = NOW(),
        envia = ?,
        c_formapago = ?,
        c_moneda = ?
      WHERE id = ?
    `;
    
    const params = [
      data.fp || 0,
      data.nomfp,
      data.usumod || 1,
      data.envia || 0,
      data.c_formapago || '',
      data.c_moneda || 'MXN',
      id
    ];
    
    await this.databaseService.query(query, params);
    return this.getPaymentMethodById(id);
  }

  async deletePaymentMethod(id: number) {
    const query = `DELETE FROM tbformaspago WHERE id = ?`;
    await this.databaseService.query(query, [id]);
    return { success: true, message: 'Payment method deleted successfully' };
  }
}
