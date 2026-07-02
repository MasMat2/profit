import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface SocioAccesoDto {
  id: number;
  socio: number;
  nombre: string;
  activo: number;
  becado: number;
  tipoMembresia?: string;
  fechaVencimiento?: Date | null;
  clase?: string;
  visitasPeriodo: number;
}

export interface AccesoDto {
  acceso: boolean;
  motivo?: string;
  socio?: SocioAccesoDto;
}

@Injectable()
export class AsistenciaService {
  constructor(private readonly db: DatabaseService) {}

  async registrarAcceso(socioId: number): Promise<AccesoDto> {
    const db = this.db.getKysely();

    const socio = await db
      .selectFrom('tbsocios')
      .select([
        'id',
        'socio',
        'nomsocio',
        'activo',
        'becado',
        'modopago',
        'diapago',
        'clases',
      ])
      .where('socio', '=', socioId)
      .executeTakeFirst();

    if (!socio) {
      throw new NotFoundException(`Socio ${socioId} no encontrado`);
    }

    if (!socio.activo) {
      return { acceso: false, motivo: 'Socio inactivo' };
    }

    if (!socio.becado) {
      const adeudo = await db
        .selectFrom('tbmensualidades')
        .select('id')
        .where('socio', '=', socio.socio)
        .where('saldo', '>', '0')
        .where('cancelado', '=', 0)
        .where('fecha', '<=', new Date())
        .limit(1)
        .executeTakeFirst();

      if (adeudo) {
        return { acceso: false, motivo: 'Adeudo pendiente' };
      }
    }

    const claseIds = (socio.clases ?? '')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
    const claseId = claseIds[0] ?? 0;

    const now = new Date();
    const fecmod = new Date('1900-01-01T00:00:00');

    await db
      .insertInto('tbasistencia')
      .values({
        socio: socio.socio,
        fecha: now,
        clase: claseId,
        horario: 0,
        retardo: 0,
        autorizo: 0,
        motivo: '',
        instructor: 0,
        usunvo: 1,
        fecnvo: now,
        usumod: 0,
        fecmod: fecmod,
        envia: 1,
      })
      .execute();

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
      acceso: true,
      socio: {
        id: socio.id,
        socio: socio.socio,
        nombre: socio.nomsocio,
        activo: socio.activo,
        becado: socio.becado,
        tipoMembresia: modo?.nommodopago,
        fechaVencimiento: socio.diapago,
        clase: claseNombre,
        visitasPeriodo: Number(visitasResult?.total ?? 0),
      },
    };
  }
}
