import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface SocioAccesoDto {
  id: number;
  socio: number;
  nombre: string;
  activo: number;
  tipoMembresia?: string;
  fechaVencimiento?: Date | null;
  vigenciaVisitas?: Date | null;
  clase?: string;
  visitasPeriodo: number;
}

@Injectable()
export class AsistenciaService {
  constructor(private readonly db: DatabaseService) {}

  async getSocioAcceso(socioId: number): Promise<SocioAccesoDto> {
    const db = this.db.getKysely();

    const socio = await db
      .selectFrom('tbsocios')
      .select([
        'id',
        'socio',
        'nomsocio',
        'activo',
        'modopago',
        'diapago',
        'visvig',
        'clases',
      ])
      .where('socio', '=', socioId)
      .executeTakeFirst();

    if (!socio) {
      throw new NotFoundException(`Socio ${socioId} no encontrado`);
    }

    const claseIds = (socio.clases ?? '')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    const [modo, visitasResult, clasesRows] = await Promise.all([
      db
        .selectFrom('tbmodospago')
        .select(['nommodopago'])
        .where('modopago', '=', socio.modopago)
        .executeTakeFirst(),
      socio.diapago
        ? db
            .selectFrom('tbasistencia')
            .select((eb) => eb.fn.countAll<number>().as('total'))
            .where('socio', '=', socio.socio)
            .where('fecha', '>=', socio.diapago)
            .executeTakeFirst()
        : Promise.resolve(null),
      claseIds.length > 0
        ? db
            .selectFrom('tbclases')
            .select(['nomclase'])
            .where('clase', 'in', claseIds)
            .execute()
        : Promise.resolve([]),
    ]);

    const claseNombre = clasesRows.length > 0
      ? clasesRows.map((r) => r.nomclase).join(', ')
      : undefined;

    return {
      id: socio.id,
      socio: socio.socio,
      nombre: socio.nomsocio,
      activo: socio.activo,
      tipoMembresia: modo?.nommodopago,
      fechaVencimiento: socio.diapago,
      vigenciaVisitas: socio.visvig,
      clase: claseNombre,
      visitasPeriodo: Number(visitasResult?.total ?? 0),
    };
  }
}
