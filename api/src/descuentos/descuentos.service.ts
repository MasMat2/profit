import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class DescuentosService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.getKysely();
  }

  async getDescuentosBySocio(socioId: number, cancelado?: string) {
    return this.db
      .selectFrom('tbdescuentos')
      .selectAll()
      .where('socio', '=', socioId)
      .$if(cancelado !== undefined, qb =>
        qb.where('cancelado', '=', cancelado === '1' ? 1 : 0),
      )
      .orderBy('fecha', 'desc')
      .execute();
  }

  async getDescuentoById(id: number) {
    return this.db
      .selectFrom('tbdescuentos')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst() ?? null;
  }
}
