import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { sql } from 'kysely';

export interface CreateSocioDto {
  nomsocio: string;
  tel1?: string;
  tel2?: string;
  correo?: string;
  sexo?: number;
  fechaNacimiento?: Date;
  becado?: number;
  comentarios?: string;
}

export interface UpdateSocioDto {
  nomsocio?: string;
  tel1?: string;
  tel2?: string;
  correo?: string;
  sexo?: number;
  fechaNacimiento?: Date;
  becado?: number;
  comentarios?: string;
  importepago?: number;
  diapago?: Date;
}

const EMPTY_DATE = new Date('1900-01-01T00:00:00');

@Injectable()
export class SociosService {
  constructor(private readonly db: DatabaseService) {}

  async getSocioById(id: number) {
    const db = this.db.getKysely();

    const socio = await db
      .selectFrom('tbsocios')
      .select([
        'id',
        'socio',
        'nomsocio',
        'tel1',
        'tel2',
        'correo',
        'sexo',
        'cumpleaños',
        'becado',
        'obs',
        'activo',
        'clases',
        'importepago',
        'diapago',
      ])
      .where('id', '=', id)
      .executeTakeFirst();

    if (!socio) {
      throw new NotFoundException(`Socio ${id} no encontrado`);
    }

    const claseIds = (socio.clases ?? '')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);
    const claseId = claseIds[0] ?? null;

    const clase = claseId
      ? await db
          .selectFrom('tbclases')
          .select(['clase', 'nomclase'])
          .where('clase', '=', claseId)
          .executeTakeFirst()
      : undefined;

    const { obs, cumpleaños, clases, importepago, ...rest } = socio;

    return {
      ...rest,
      fechaNacimiento: cumpleaños,
      comentarios: obs,
      precio: importepago,
      clase: clase ? { id: clase.clase, nombre: clase.nomclase } : null,
    };
  }

  async createSocio(dto: CreateSocioDto) {
    const db = this.db.getKysely();
    const now = new Date();

    const result = await db
      .insertInto('tbsocios')
      .values({
        activo: 1,
        becado: dto.becado ? 1 : 0,
        campo1: '',
        campo2: '',
        campo3: '',
        campo4: '',
        campo5: '',
        campo6: '',
        campo7: '',
        campo8: '',
        campo9: '',
        campo10: '',
        clases: '',
        correo: dto.correo ?? '',
        'cumpleaños': dto.fechaNacimiento ?? EMPTY_DATE,
        descpo: 0,
        diapago: EMPTY_DATE,
        direccion: '',
        envia: 1,
        fcalle: '',
        fciudad: '',
        fcolonia: '',
        fcp: '',
        fecmod: EMPTY_DATE,
        fecnvo: now,
        fecvencevis: EMPTY_DATE,
        festado: '',
        finterior: '',
        fnumero: '',
        foto: '',
        fotostr: null,
        importepago: 0,
        modopago: 0,
        nivel: 0,
        nomsocio: dto.nomsocio,
        obs: dto.comentarios ?? null,
        razonsocial: '',
        rfc: '',
        sexo: dto.sexo ?? 0,
        socio: 0,
        tel1: dto.tel1 ?? '',
        tel2: dto.tel2 ?? '',
        usumod: 0,
        usunvo: 1,
        visitasdisp: 0,
        vissucacc: null,
        visvig: null,
      })
      .executeTakeFirst();

    const newId = Number(result.insertId);
    return this.getSocioById(newId);
  }

  async updateSocio(id: number, dto: UpdateSocioDto) {
    const db = this.db.getKysely();

    const updateData: Record<string, unknown> = { fecmod: new Date() };
    if (dto.nomsocio !== undefined) updateData['nomsocio'] = dto.nomsocio;
    if (dto.tel1 !== undefined) updateData['tel1'] = dto.tel1;
    if (dto.tel2 !== undefined) updateData['tel2'] = dto.tel2;
    if (dto.correo !== undefined) updateData['correo'] = dto.correo;
    if (dto.sexo !== undefined) updateData['sexo'] = dto.sexo;
    if (dto.fechaNacimiento !== undefined) updateData['cumpleaños'] = dto.fechaNacimiento;
    if (dto.becado !== undefined) updateData['becado'] = dto.becado ? 1 : 0;
    if (dto.comentarios !== undefined) updateData['obs'] = dto.comentarios;
    if (dto.importepago !== undefined) updateData['importepago'] = dto.importepago;
    if (dto.diapago !== undefined) updateData['diapago'] = dto.diapago;

    const result = await db
      .updateTable('tbsocios')
      .set(updateData as any)
      .where('id', '=', id)
      .executeTakeFirst();

    if (!result || result.numUpdatedRows === BigInt(0)) {
      throw new NotFoundException(`Socio con id ${id} no encontrado`);
    }

    return this.getSocioById(id);
  }

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
