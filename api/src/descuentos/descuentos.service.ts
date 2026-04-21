import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class DescuentosService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getDescuentosBySocio(socioId: number, cancelado?: string) {
    let query = `SELECT * FROM tbdescuentos WHERE socio = ?`;
    const params: any[] = [socioId];
    const conditions: string[] = [];

    if (cancelado !== undefined) {
      conditions.push('cancelado = ?');
      params.push(cancelado === '1' ? 1 : 0);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY fecha DESC';

    console.log('Query descuentos:', query);
    console.log('Params:', params);
    const results = await this.databaseService.query(query, params);
    console.log('Descuentos encontrados:', Array.isArray(results) ? results.length : 0);
    return results;
  }

  async getDescuentoById(id: number) {
    const query = `SELECT * FROM tbdescuentos WHERE id = ?`;
    const results = await this.databaseService.query(query, [id]);
    return results[0] || null;
  }
}
