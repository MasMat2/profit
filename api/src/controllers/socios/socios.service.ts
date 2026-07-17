import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CajaService } from '../caja/caja.service';
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
  descuento?: number;
}

export interface CambiarClaseDto {
  claseId: number;
  periodo: string;
}

export interface PagarMensualidadDto {
  fp: number;
}

const EMPTY_DATE = new Date('1900-01-01T00:00:00');

const PERIODO_COLS = [
  { periodo: 'Semanal',    colPrecio: 'prsem',   colDescuento: 'descsem'   },
  { periodo: 'Quincenal',  colPrecio: 'prqna',   colDescuento: 'descqna'   },
  { periodo: 'Mensual',    colPrecio: 'prmes',   colDescuento: 'descmes'   },
  { periodo: 'Trimestral', colPrecio: 'prtrim',  colDescuento: 'desctrim'  },
  { periodo: 'Semestral',  colPrecio: 'prstre',  colDescuento: 'descstre'  },
  { periodo: 'Anual',      colPrecio: 'pranual', colDescuento: 'descanual' },
] as const;

function formatClasesField(claseIds: number[]): string {
  return claseIds.map((id) => `,${String(id).padStart(3, '0')}`).join('');
}

function formatCurrency(value: number): string {
  return value.toLocaleString('es-MX', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

@Injectable()
export class SociosService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cajaService: CajaService,
  ) {}

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
        'descpo',
        'modopago',
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

    const [clase, modo] = await Promise.all([
      claseId
        ? db
            .selectFrom('tbclases')
            .select(['clase', 'nomclase'])
            .where('clase', '=', claseId)
            .executeTakeFirst()
        : Promise.resolve(undefined),
      socio.modopago
        ? db
            .selectFrom('tbmodospago')
            .select(['nommodopago'])
            .where('modopago', '=', socio.modopago)
            .executeTakeFirst()
        : Promise.resolve(undefined),
    ]);

    const { obs, cumpleaños, clases, importepago, descpo, modopago, ...rest } = socio;

    return {
      ...rest,
      fechaNacimiento: cumpleaños,
      comentarios: obs,
      precio: importepago,
      descuento: descpo,
      periodicidad: modo?.nommodopago?.trim() ?? null,
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
    if (dto.descuento !== undefined) updateData['descpo'] = dto.descuento;

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

  async cambiarClase(id: number, dto: CambiarClaseDto) {
    const periodoRow = PERIODO_COLS.find((p) => p.periodo === dto.periodo);
    if (!periodoRow) {
      throw new BadRequestException(`Periodo '${dto.periodo}' no es válido`);
    }

    const db = this.db.getKysely();

    return db.transaction().execute(async (trx) => {
      const socio = await trx
        .selectFrom('tbsocios')
        .select(['id', 'socio', 'importepago', 'clases'])
        .where('id', '=', id)
        .executeTakeFirst();

      if (!socio) {
        throw new NotFoundException(`Socio con id ${id} no encontrado`);
      }

      const nuevaClase = await trx
        .selectFrom('tbclases')
        .select(['clase', 'nomclase', periodoRow.colPrecio, periodoRow.colDescuento])
        .where('clase', '=', dto.claseId)
        .executeTakeFirst();

      if (!nuevaClase) {
        throw new NotFoundException(`Clase con id ${dto.claseId} no encontrada`);
      }

      const modo = await trx
        .selectFrom('tbmodospago')
        .select(['modopago'])
        .where('nommodopago', 'like', `%${dto.periodo}%`)
        .executeTakeFirst();

      if (!modo) {
        throw new BadRequestException(`No se encontró un modo de pago para el periodo '${dto.periodo}'`);
      }

      const precioNormal = Number(nuevaClase[periodoRow.colPrecio]);
      const descuento = Number(nuevaClase[periodoRow.colDescuento]);
      const nuevoImporte = precioNormal - descuento;
      const viejoImporte = Number(socio.importepago);
      const now = new Date();

      // 1. Actualizar importe, descuento y periodicidad del socio
      await trx
        .updateTable('tbsocios')
        .set({
          importepago: nuevoImporte,
          descpo: descuento,
          modopago: modo.modopago,
          fecmod: now,
          envia: 1,
        } as any)
        .where('id', '=', id)
        .executeTakeFirst();

      // 2. Log de cambio de importe
      if (nuevoImporte !== viejoImporte) {
        await trx
          .insertInto('tblogsocio')
          .values({
            socio: socio.socio,
            usuario: 1,
            log: `Modificó el importe a pagar de $${formatCurrency(viejoImporte)} por $${formatCurrency(nuevoImporte)}`,
            usunvo: 1,
            fecnvo: now,
            usumod: 0,
            fecmod: EMPTY_DATE,
            envia: 1,
          })
          .execute();
      }

      // 3. Clases previas asignadas al socio
      const oldClaseIds = (socio.clases ?? '')
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0);

      if (oldClaseIds.length > 0) {
        const oldClases = await trx
          .selectFrom('tbclases')
          .select(['clase', 'nomclase'])
          .where('clase', 'in', oldClaseIds)
          .execute();

        for (const oldClase of oldClases) {
          await trx
            .insertInto('tblogsocio')
            .values({
              socio: socio.socio,
              usuario: 1,
              log: `Eliminó la clase de ${oldClase.nomclase.trim()} $${formatCurrency(viejoImporte)}`,
              usunvo: 1,
              fecnvo: now,
              usumod: 0,
              fecmod: EMPTY_DATE,
              envia: 1,
            })
            .execute();
        }
      }

      // 4. Log de clase agregada
      await trx
        .insertInto('tblogsocio')
        .values({
          socio: socio.socio,
          usuario: 1,
          log: `Agregó la clase de ${nuevaClase.nomclase.trim()} $${formatCurrency(precioNormal)}`,
          usunvo: 1,
          fecnvo: now,
          usumod: 0,
          fecmod: EMPTY_DATE,
          envia: 1,
        })
        .execute();

      // 5. Reemplazar asignación en tbhorariossocio
      await trx.deleteFrom('tbhorariossocio').where('socio', '=', socio.socio).execute();

      await trx
        .insertInto('tbhorariossocio')
        .values({
          socio: socio.socio,
          clase: nuevaClase.clase,
          horario: 0,
          usunvo: 1,
          fecnvo: now,
          usumod: 0,
          fecmod: EMPTY_DATE,
          envia: 1,
        })
        .execute();

      // 6. Sincronizar campo desnormalizado tbsocios.Clases
      await trx
        .updateTable('tbsocios')
        .set({ clases: formatClasesField([nuevaClase.clase]), usumod: 1, fecmod: now, envia: 1 } as any)
        .where('id', '=', id)
        .executeTakeFirst();

      return { id };
    }).then(({ id }) => this.getSocioById(id));
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

  async getMensualidades(id: number) {
    const db = this.db.getKysely();

    const socio = await db
      .selectFrom('tbsocios')
      .select(['socio'])
      .where('id', '=', id)
      .executeTakeFirst();

    if (!socio) {
      throw new NotFoundException(`Socio con id ${id} no encontrado`);
    }

    const rows = await db
      .selectFrom('tbmensualidades')
      .select(['id', 'idmens', 'fecha', 'descrip', 'importe', 'descuento', 'total', 'pagado', 'saldo', 'fecpago', 'cancelado'])
      .where('socio', '=', socio.socio)
      .where('cancelado', '=', 0)
      .orderBy('fecha', 'desc')
      .orderBy('id', 'desc')
      .execute();

    return rows.map((row) => ({
      ...row,
      importe: Number(row.importe),
      descuento: Number(row.descuento),
      total: Number(row.total),
      saldo: Number(row.saldo),
    }));
  }

  async pagarMensualidad(id: number, dto: PagarMensualidadDto) {
    await this.cajaService.assertAbierta();

    const db = this.db.getKysely();

    await db.transaction().execute(async (trx) => {
      const socio = await trx
        .selectFrom('tbsocios')
        .select(['id', 'socio', 'importepago', 'descpo', 'diapago', 'modopago'])
        .where('id', '=', id)
        .executeTakeFirst();

      if (!socio) {
        throw new NotFoundException(`Socio con id ${id} no encontrado`);
      }

      const now = new Date();

      let pendiente = await trx
        .selectFrom('tbmensualidades')
        .select(['idmens', 'total'])
        .where('socio', '=', socio.socio)
        .where('cancelado', '=', 0)
        .where('pagado', '=', 0)
        .orderBy('fecha', 'asc')
        .executeTakeFirst();

      if (!pendiente) {
        const maxIdMensRow = await trx
          .selectFrom('tbmensualidades')
          .select(sql<string>`coalesce(max(idmens), 0)`.as('maxId'))
          .executeTakeFirst();
        const nuevoIdMens = Number(maxIdMensRow?.maxId ?? 0) + 1;

        const importe = Number(socio.importepago);
        const descuento = Number(socio.descpo);
        const total = importe - descuento;
        const fechaCargo = socio.diapago && new Date(socio.diapago).getTime() > 0 ? socio.diapago : now;
        const fechaLabel = new Date(fechaCargo).toLocaleDateString('en-GB').replace(/\//g, '/');

        await trx
          .insertInto('tbmensualidades')
          .values({
            autcan: 0,
            cancelado: 0,
            descrip: `SUSCRIPCION MENSUAL${fechaLabel}`,
            descuento,
            envia: 1,
            factura: '',
            fecha: fechaCargo,
            fecmod: EMPTY_DATE,
            fecnvo: now,
            fecpago: EMPTY_DATE,
            idmens: nuevoIdMens,
            importe,
            inscrip: 0,
            modopago: socio.modopago,
            motivo: '',
            notas: '',
            pagado: 0,
            saldo: total,
            socio: socio.socio,
            total,
            usumod: 0,
            usunvo: 1,
          })
          .execute();

        pendiente = { idmens: nuevoIdMens, total } as any;
      }

      const totalPagar = Number(pendiente!.total);

      const maxIdingRow = await trx
        .selectFrom('tbingresos')
        .select(sql<string>`coalesce(max(iding), 0)`.as('maxId'))
        .executeTakeFirst();
      const nuevoIding = Number(maxIdingRow?.maxId ?? 0) + 1;

      await trx
        .insertInto('tbingresos')
        .values({
          cancelado: 0,
          corte: 0,
          envia: 1,
          fecha: now,
          fecmod: EMPTY_DATE,
          fecnvo: now,
          fp: dto.fp,
          iding: nuevoIding,
          idmens: pendiente!.idmens,
          importe: totalPagar,
          referencia: '',
          socio: socio.socio,
          ticket: 0,
          usuario: 1,
          usumod: 0,
          usunvo: 1,
        })
        .execute();

      await trx
        .updateTable('tbmensualidades')
        .set({
          pagado: 1,
          saldo: 0,
          fecpago: now,
          usumod: 1,
          fecmod: now,
          envia: 1,
        } as any)
        .where('idmens', '=', pendiente!.idmens)
        .execute();

      const modo = await trx
        .selectFrom('tbmodospago')
        .select(['cadadias'])
        .where('modopago', '=', socio.modopago)
        .executeTakeFirst();

      const cadadias = modo ? Number(modo.cadadias) : 0;
      const baseFecha = socio.diapago && new Date(socio.diapago).getTime() > 0 ? new Date(socio.diapago) : now;
      const nuevoDiaPago = new Date(baseFecha);
      nuevoDiaPago.setDate(nuevoDiaPago.getDate() + cadadias);

      await trx
        .updateTable('tbsocios')
        .set({ diapago: nuevoDiaPago, usumod: 1, fecmod: now, envia: 1 } as any)
        .where('id', '=', id)
        .executeTakeFirst();

      await trx
        .insertInto('tblogsocio')
        .values({
          socio: socio.socio,
          usuario: 1,
          log: `Pagó mensualidad de $${formatCurrency(totalPagar)}`,
          usunvo: 1,
          fecnvo: now,
          usumod: 0,
          fecmod: EMPTY_DATE,
          envia: 1,
        })
        .execute();
    });

    return this.getSocioById(id);
  }
}
