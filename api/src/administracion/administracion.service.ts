import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { Tbparametros } from '../database/database.types';

export type UpdateParametrosDto = Partial<Pick<Tbparametros,
  'paqvisvence' | 'diaspaqvisvence' | 'aplicadescdias' |
  'empresa' | 'dir1' | 'dir2' | 'dir3' | 'tels' | 'sucursal'
>>;

@Injectable()
export class AdministracionService {
  constructor(private readonly db: DatabaseService) {}

  async getParametros() {
    const db = this.db.getKysely();
    return db
      .selectFrom('tbparametros')
      .select([
        'id',
        'paqvisvence',
        'diaspaqvisvence',
        'aplicadescdias',
        'empresa',
        'dir1',
        'dir2',
        'dir3',
        'tels',
        'sucursal',
      ])
      .executeTakeFirst();
  }

  async updateParametros(dto: UpdateParametrosDto) {
    const db = this.db.getKysely();
    await db
      .updateTable('tbparametros')
      .set(dto)
      .execute();
    return this.getParametros();
  }
}
