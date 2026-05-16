import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ClasesService {
  constructor(private readonly db: DatabaseService) {}

  async getAllClases() {
    const db = this.db.getKysely();
    const rows = await db
      .selectFrom('tbclases')
      .select([
        'id',
        'nomclase',
        'activa',
        'cobinsc',
        'prinsc',
        'prsem',
        'prqna',
        'prmes',
        'prtrim',
        'prstre',
        'pranual',
        'descsem',
        'descqna',
        'descmes',
        'desctrim',
        'descstre',
        'descanual',
        'limitectes',
        'cntlimite',
        'fecmod',
      ])
      .orderBy('nomclase', 'asc')
      .execute();

      return rows.map(({ prsem, prqna, prmes, prtrim, prstre, pranual,
        descsem, descqna, descmes, desctrim, descstre, descanual,
        ...rest }) => ({
          ...rest,
          precios: [
            { periodo: 'Semanal',    precioNormal: prsem,   descuento: descsem   },
            { periodo: 'Quincenal',  precioNormal: prqna,   descuento: descqna   },
            { periodo: 'Mensual',    precioNormal: prmes,   descuento: descmes   },
            { periodo: 'Trimestral', precioNormal: prtrim,  descuento: desctrim  },
            { periodo: 'Semestral',  precioNormal: prstre,  descuento: descstre  },
            { periodo: 'Anual',      precioNormal: pranual, descuento: descanual },
          ],
      }));
  }

}
