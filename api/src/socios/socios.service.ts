import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class SociosService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.getKysely();
  }

  async getAllSocios(search?: string, estatus?: string, becado?: string) {
    const socios = await this.db
      .selectFrom('tbsocios as s')
      .leftJoin('tbhuellas as h', 'h.socio', 's.socio')
      .select([
        's.id',
        's.socio',
        's.nomsocio',
        's.direccion',
        's.tel1',
        's.tel2',
        's.correo',
        's.obs',
        's.activo',
        's.foto',
        's.modopago',
        's.importepago',
        's.descpo',
        's.becado',
        's.diapago',
        's.visitasdisp',
        's.fecvencevis',
        's.cumpleaños',
        's.sexo',
        's.clases',
        's.usunvo',
        's.fecnvo',
        's.usumod',
        's.fecmod',
        's.envia',
        's.campo1',
        's.campo2',
        's.campo3',
        's.campo4',
        's.campo5',
        's.campo6',
        's.campo7',
        's.campo8',
        's.campo9',
        's.campo10',
        's.fotostr',
        's.visvig',
        's.vissucacc',
        's.razonsocial',
        's.fcalle',
        's.fnumero',
        's.finterior',
        's.fcolonia',
        's.fciudad',
        's.festado',
        's.fcp',
        's.rfc',
        's.nivel',
        sql<number>`CASE WHEN h.huella IS NOT NULL THEN 1 ELSE 0 END`.as('tieneHuella')
      ])
      .$if(!!search, qb =>
        qb.where(eb => eb.or([
          eb('s.nomsocio', 'like', `%${search}%`),
          eb('s.correo', 'like', `%${search}%`),
          eb('s.tel1', 'like', `%${search}%`),
        ])),
      )
      .$if(!!estatus, qb => {
        const parts = estatus!.split(',');
        const conds: any[] = [];
        return qb.where(eb => {
          if (parts.includes('Activo'))   conds.push(eb('s.activo', '=', 1));
          if (parts.includes('Inactivo')) conds.push(eb('s.activo', '=', 0));
          if (parts.includes('Becado'))   conds.push(eb('s.becado', '=', 1));
          return eb.or(conds);
        });
      })
      .$if(becado !== undefined, qb =>
        qb.where('s.becado', '=', Number(becado)),
      )
      .orderBy('s.nomsocio')
      .execute();

    return socios;
  }

  async getSocioById(id: number) {
    return this.db
      .selectFrom('tbsocios')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst() ?? null;
  }

  async createSocio(data: any) {
    const result = await this.db
      .insertInto('tbsocios')
      .values({
        socio: data.socio ?? 0,
        nomsocio: data.nomsocio ?? '',
        direccion: data.direccion ?? '',
        tel1: data.tel1 ?? '',
        tel2: data.tel2 ?? '',
        correo: data.correo ?? '',
        obs: data.obs ?? '',
        activo: data.activo !== undefined ? data.activo : 1,
        foto: data.foto ?? '',
        modopago: data.modopago ?? 3,
        importepago: data.importepago ?? 0,
        descpo: data.descpo ?? 0,
        becado: data.becado ?? 0,
        diapago: sql`NOW()`,
        visitasdisp: data.visitasdisp ?? 0,
        fecvencevis: sql`NOW()`,
        'cumpleaños': data['cumpleaños'] ?? null,
        sexo: data.sexo ?? 1,
        clases: data.clases ?? '',
        usunvo: data.usunvo ?? 1,
        fecnvo: sql`NOW()`,
        usumod: data.usumod ?? 1,
        fecmod: sql`NOW()`,
        envia: data.envia ?? 0,
        campo1: data.campo1 ?? '',
        campo2: data.campo2 ?? '',
        campo3: data.campo3 ?? '',
        campo4: data.campo4 ?? '',
        campo5: data.campo5 ?? '',
        campo6: data.campo6 ?? '',
        campo7: data.campo7 ?? '',
        campo8: data.campo8 ?? '',
        campo9: data.campo9 ?? '',
        campo10: data.campo10 ?? '',
        fotostr: data.fotostr ?? null,
        visvig: sql`NOW()`,
        vissucacc: data.vissucacc ?? null,
        razonsocial: data.razonsocial ?? '',
        fcalle: data.fcalle ?? '',
        fnumero: data.fnumero ?? '',
        finterior: data.finterior ?? '',
        fcolonia: data.fcolonia ?? '',
        fciudad: data.fciudad ?? '',
        festado: data.festado ?? '',
        fcp: data.fcp ?? '',
        rfc: data.rfc ?? '',
        nivel: data.nivel ?? 0,
      })
      .executeTakeFirstOrThrow();

    return this.getSocioById(Number(result.insertId));
  }

  async updateSocio(id: number, data: any) {
    await this.db
      .updateTable('tbsocios')
      .set({
        nomsocio: data.nomsocio,
        direccion: data.direccion ?? '',
        tel1: data.tel1,
        tel2: data.tel2 ?? '',
        correo: data.correo,
        obs: data.obs ?? '',
        activo: data.activo !== undefined ? data.activo : 1,
        foto: data.foto ?? '',
        modopago: data.modopago ?? 3,
        importepago: data.importepago ?? 0,
        descpo: data.descpo ?? 0,
        becado: data.becado ?? 0,
        visitasdisp: data.visitasdisp ?? 0,
        'cumpleaños': data['cumpleaños'],
        sexo: data.sexo,
        clases: data.clases ?? '',
        usumod: data.usumod ?? 1,
        fecmod: sql`NOW()`,
        envia: data.envia ?? 0,
        fotostr: data.fotostr ?? null,
        razonsocial: data.razonsocial ?? '',
        fcalle: data.fcalle ?? '',
        fnumero: data.fnumero ?? '',
        finterior: data.finterior ?? '',
        fcolonia: data.fcolonia ?? '',
        fciudad: data.fciudad ?? '',
        festado: data.festado ?? '',
        fcp: data.fcp ?? '',
        rfc: data.rfc ?? '',
        nivel: data.nivel ?? 0,
      })
      .where('id', '=', id)
      .execute();

  return this.getSocioById(id);
  }

  async deleteSocio(id: number) {
    await this.db
      .deleteFrom('tbsocios')
      .where('id', '=', id)
      .execute();
    return { deleted: true };
  }

  async getHuellaBySocio(socioId: number) {
    return this.db
      .selectFrom('tbhuellas')
      .selectAll()
      .where('socio', '=', socioId)
      .executeTakeFirst() ?? null;
  }

  async guardarHuella(socioId: number, huellaData: any) {
    // Verificar si ya existe huella para este socio
    const existente = await this.getHuellaBySocio(socioId);

    if (existente) {
      // Actualizar huella existente
      await this.db
        .updateTable('tbhuellas')
        .set({
          huella: huellaData.fmd,
          dedo: huellaData.dedo ?? 1,
          usumod: huellaData.usumod ?? 1,
          fecmod: sql`NOW()`,
        })
        .where('socio', '=', socioId)
        .execute();
    } else {
      // Insertar nueva huella
      await this.db
        .insertInto('tbhuellas')
        .values({
          socio: socioId,
          huella: huellaData.fmd,
          dedo: huellaData.dedo ?? 1,
          envia: 0,
          usunvo: huellaData.usunvo ?? 1,
          fecnvo: sql`NOW()`,
          usumod: huellaData.usumod ?? 1,
          fecmod: sql`NOW()`,
        })
        .execute();
    }

    return this.getHuellaBySocio(socioId);
  }

  async eliminarHuella(socioId: number) {
    await this.db
      .deleteFrom('tbhuellas')
      .where('socio', '=', socioId)
      .execute();
    return { deleted: true };
  }
}
