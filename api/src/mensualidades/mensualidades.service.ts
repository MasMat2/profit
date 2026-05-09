import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class MensualidadesService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.getKysely();
  }

  async getMensualidadesBySocio(socioId: number, pagado?: string, cancelado?: string) {
    return this.db
      .selectFrom('tbmensualidades')
      .selectAll()
      .where('socio', '=', socioId)
      .$if(pagado !== undefined, qb =>
        qb.where('pagado', '=', pagado === '1' ? 1 : 0),
      )
      .$if(cancelado !== undefined, qb =>
        qb.where('cancelado', '=', cancelado === '1' ? 1 : 0),
      )
      .orderBy('fecha', 'desc')
      .execute();
  }

  async getMensualidadById(id: number) {
    return this.db
      .selectFrom('tbmensualidades')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst() ?? null;
  }
}
