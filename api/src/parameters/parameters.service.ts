import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ParametersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getParameters() {
    const query = `SELECT * FROM tbparametros LIMIT 1`;
    const results = await this.databaseService.query(query);
    return results[0] || null;
  }

  async updateParameters(data: any) {
    const query = `
      UPDATE tbparametros 
      SET 
        empresa = ?,
        dir1 = ?,
        dir2 = ?,
        dir3 = ?,
        tels = ?,
        sucursal = ?,
        logocte = ?,
        paqvisvence = ?,
        diaspaqvisvence = ?,
        aplicadescdias = ?,
        usumod = ?,
        fecmod = NOW()
      WHERE id = ?
    `;
    
    const params = [
      data.empresa,
      data.dir1,
      data.dir2,
      data.dir3,
      data.tels,
      data.sucursal,
      data.logocte || '',
      data.paqvisvence || 0,
      data.diaspaqvisvence || 15,
      data.aplicadescdias || 10,
      data.usumod || 1,
      data.id
    ];
    
    await this.databaseService.query(query, params);
    return this.getParameters();
  }
}
