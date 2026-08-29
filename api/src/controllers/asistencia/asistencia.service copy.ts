import { Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { DatabaseService } from '../../database/database.service';
import { DB } from '../../database/database.types';

export interface SocioAcceso {
  id: number;
  socio: number;
  nombre: string;
  tipoMembresia?: string;
  fechaVencimiento?: Date | null;
  clase?: string;
  visitasPeriodo: number;
  becado?: boolean;
}

export interface AccesoDto {
  acceso: boolean;
  motivo?: string;
  socio?: SocioAcceso;
  fecha?: Date;
}

@Injectable()
export class AsistenciaService {
  constructor(private readonly db: DatabaseService) {}

  async registrarAcceso(socioId: number): Promise<AccesoDto> {
    const db = this.db.getKysely();
    const now = new Date();

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
      return { acceso: false, motivo: `Socio ${socioId} no encontrado` };
    }

    if (!socio.activo) {
      return { acceso: false, motivo: 'Socio inactivo' };
    }

    if (!socio.becado && !this.esMembresiaVigente(socio.diapago, now)) {
      return { acceso: false, motivo: 'Membresía vencida' };
    }

    const claseIds = this.parseClaseIds(socio.clases);
    const claseId = claseIds[0] ?? 0;

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
        fecmod: new Date('1900-01-01T00:00:00'),
        envia: 1,
      })
      .execute();

    const [tipoMembresia, visitasPeriodo, claseNombre] = await Promise.all([
      this.obtenerNombreModoPago(db, socio.modopago),
      this.contarVisitasPeriodoActual(db, socio.socio, now),
      this.obtenerNombreClases(db, claseIds),
    ]);

    return {
      acceso: true,
      socio: {
        id: socio.id,
        socio: socio.socio,
        nombre: socio.nomsocio,
        tipoMembresia,
        fechaVencimiento: socio.diapago,
        clase: claseNombre,
        visitasPeriodo,
        becado: !!socio.becado,
      },
      fecha: now,
    };
  }

  private esMembresiaVigente(diapago: Date | null, now: Date): boolean {
    return !!diapago && new Date(diapago).getTime() > now.getTime();
  }

  private parseClaseIds(clases: string | null): number[] {
    return (clases ?? '')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
  }

  private async obtenerNombreModoPago(db: Kysely<DB>, modopago: number) {
    const modo = await db
      .selectFrom('tbmodospago')
      .select(['nommodopago'])
      .where('modopago', '=', modopago)
      .executeTakeFirst();

    return modo?.nommodopago;
  }

  private async contarVisitasPeriodoActual(
    db: Kysely<DB>,
    socio: number,
    now: Date,
  ): Promise<number> {
    const inicioPeriodo = await db
      .selectFrom('tbmensualidades')
      .select('fecha')
      .where('socio', '=', socio)
      .where('cancelado', '=', 0)
      .where('fecha', '<=', now)
      .orderBy('fecha', 'desc')
      .limit(1)
      .executeTakeFirst();

    if (!inicioPeriodo) {
      return 0;
    }

    const visitas = await db
      .selectFrom('tbasistencia')
      .select((eb) => eb.fn.countAll<number>().as('total'))
      .where('socio', '=', socio)
      .where('fecha', '>=', inicioPeriodo.fecha)
      .executeTakeFirst();

    return Number(visitas?.total ?? 0);
  }

  private async obtenerNombreClases(
    db: Kysely<DB>,
    claseIds: number[],
  ): Promise<string | undefined> {
    if (claseIds.length === 0) {
      return undefined;
    }

    const clasesRows = await db
      .selectFrom('tbclases')
      .select(['nomclase'])
      .where('clase', 'in', claseIds)
      .execute();

    return clasesRows.length > 0
      ? clasesRows.map((r) => r.nomclase).join(', ')
      : undefined;
  }
}
