import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { sql } from 'kysely';

@Injectable()
export class SociosService {
  constructor(private readonly db: DatabaseService) {}

  async getAllSocios() {
    const db = this.db.getKysely();

    const rows = await db
      .selectFrom('tbsocios')
      .leftJoin('tbhuellas', join =>
        join
          .onRef('tbhuellas.socio', '=', 'tbsocios.socio')
          .on('tbhuellas.huella', 'is not', null),
      )
      .select([
        'tbsocios.id',
        'tbsocios.socio',
        'tbsocios.nomsocio',
        'tbsocios.tel1',
        'tbsocios.tel2',
        'tbsocios.correo',
        'tbsocios.activo',
        'tbsocios.becado',
        'tbsocios.importepago',
        'tbsocios.fecnvo',
        sql<number>`count(tbhuellas.id)`.as('huellaCount'),
      ])
      .groupBy('tbsocios.id')
      .orderBy('tbsocios.nomsocio', 'asc')
      .execute();

    return rows.map(({ huellaCount, activo, becado, ...rest }) => ({
      ...rest,
      activo,
      becado,
      estatus: becado === 1 ? 'Becado' : activo === 1 ? 'Activo' : 'Inactivo',
      tieneHuella: Number(huellaCount) > 0,
    }));
  }
}
