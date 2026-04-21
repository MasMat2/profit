import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class MensualidadesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getMensualidadesBySocio(socioId: number, pagado?: string, cancelado?: string) {
    let query = `SELECT * FROM tbmensualidades WHERE socio = ?`;
    const params: any[] = [socioId];
    const conditions: string[] = [];

    // Filtro por pagado
    if (pagado !== undefined) {
      conditions.push('pagado = ?');
      params.push(pagado === '1' ? 1 : 0);
    }

    // Filtro por cancelado
    if (cancelado !== undefined) {
      conditions.push('cancelado = ?');
      params.push(cancelado === '1' ? 1 : 0);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY fecha DESC';

    console.log('Query mensualidades:', query);
    console.log('Params:', params);
    const results = await this.databaseService.query(query, params);
    console.log('Mensualidades encontradas:', Array.isArray(results) ? results.length : 0);
    return results;
  }

  async getMensualidadById(id: number) {
    const query = `SELECT * FROM tbmensualidades WHERE id = ?`;
    const results = await this.databaseService.query(query, [id]);
    return results[0] || null;
  }
}
