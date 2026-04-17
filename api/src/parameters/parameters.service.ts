import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { sql } from 'kysely';

@Injectable()
export class ParametersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getParameters() {
    const db = this.databaseService.getKysely();
    
    const result = await db
      .selectFrom('tbparametros')
      .selectAll()
      .executeTakeFirst();
    
    return result || null;
  }

  async updateParameters(data: any) {
    const db = this.databaseService.getKysely();
    
    await db
      .updateTable('tbparametros')
      .set({
        empresa: data.empresa,
        dir1: data.dir1,
        dir2: data.dir2,
        dir3: data.dir3,
        tels: data.tels,
        sucursal: data.sucursal,
        logocte: data.logocte || '',
        paqvisvence: data.paqvisvence || 0,
        diaspaqvisvence: data.diaspaqvisvence || 15,
        aplicadescdias: data.aplicadescdias || 10,
        usumod: data.usumod || 1,
        fecmod: sql`NOW()`,
      })
      .where('id', '=', data.id)
      .execute();
    
    return this.getParameters();
  }
}
