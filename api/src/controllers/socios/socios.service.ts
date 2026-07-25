import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CajaService } from '../caja/caja.service';
import { sql, Transaction } from 'kysely';
import { DB } from '../../database/database.types';

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

export interface PagoLineaDto {
  fp: number;
  importe: number;
}

export interface PagarMensualidadDto {
  pagos: PagoLineaDto[];
  descuento?: number;
  motivo?: string;
  autoriza?: number;
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

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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
      .select((eb) => [
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
        eb
          .exists(
            eb
              .selectFrom('tbhuellas')
              .select('tbhuellas.id')
              .whereRef('tbhuellas.socio', '=', 'tbsocios.socio')
              .where('tbhuellas.huella', 'is not', null),
          )
          .as('tieneHuella'),
      ])
      .orderBy('tbsocios.nomsocio', 'asc')
      .execute();

    return rows.map(({ tieneHuella, activo, becado, ...rest }) => ({
      ...rest,
      activo,
      becado,
      estatus: becado === 1 ? 'Becado' : activo === 1 ? 'Activo' : 'Inactivo',
      tieneHuella: Boolean(tieneHuella),
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

    // Validaciones de entrada (replican el cobro de BDK: N formas de pago + descuento opcional).
    const pagos = dto.pagos ?? [];
    if (pagos.length === 0) {
      throw new BadRequestException('Debe capturar al menos una forma de pago');
    }
    for (const linea of pagos) {
      if (!linea.fp) {
        throw new BadRequestException('Cada pago debe tener una forma de pago');
      }
      if (!(Number(linea.importe) > 0)) {
        throw new BadRequestException('Cada pago debe tener un importe mayor a 0');
      }
    }

    const descuento = round2(Number(dto.descuento ?? 0));
    if (descuento < 0) {
      throw new BadRequestException('El descuento no puede ser negativo');
    }
    const motivo = (dto.motivo ?? '').trim();
    if (descuento > 0 && !motivo) {
      throw new BadRequestException('El motivo del descuento es obligatorio');
    }

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
        .select(['idmens', 'importe'])
        .where('socio', '=', socio.socio)
        .where('cancelado', '=', 0)
        .where('pagado', '=', 0)
        .orderBy('fecha', 'asc')
        .executeTakeFirst();

      // Si no existe un cargo pendiente, se crea igual que BDK: importe = ImportePago,
      // descuento = 0, total = importe, saldo = importe (el descuento se aplica al pagar).
      if (!pendiente) {
        const maxIdMensRow = await trx
          .selectFrom('tbmensualidades')
          .select(sql<string>`coalesce(max(idmens), 0)`.as('maxId'))
          .executeTakeFirst();
        const nuevoIdMens = Number(maxIdMensRow?.maxId ?? 0) + 1;

        const importe = Number(socio.importepago);
        const fechaCargo = socio.diapago && new Date(socio.diapago).getTime() > 0 ? socio.diapago : now;
        const fechaLabel = new Date(fechaCargo).toLocaleDateString('en-GB').replace(/\//g, '/');

        await trx
          .insertInto('tbmensualidades')
          .values({
            autcan: 0,
            cancelado: 0,
            descrip: `SUSCRIPCION MENSUAL${fechaLabel}`,
            descuento: 0,
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
            saldo: importe,
            socio: socio.socio,
            total: importe,
            usumod: 0,
            usunvo: 1,
          })
          .execute();

        pendiente = { idmens: nuevoIdMens, importe: String(importe) } as any;
      }

      const importeBase = Number(pendiente!.importe);
      const totalConDescuento = round2(importeBase - descuento);

      if (totalConDescuento < 0) {
        throw new BadRequestException('El descuento no puede ser mayor al importe de la mensualidad');
      }

      const sumaPagos = round2(pagos.reduce((acc, p) => acc + Number(p.importe), 0));
      if (sumaPagos !== totalConDescuento) {
        throw new BadRequestException(
          `La suma de los pagos ($${formatCurrency(sumaPagos)}) debe ser igual al total con descuento ($${formatCurrency(totalConDescuento)})`,
        );
      }

      // Un registro en tbingresos por cada forma de pago (como BDK: max(iding)+1 por fila).
      for (const linea of pagos) {
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
            fp: linea.fp,
            iding: nuevoIding,
            idmens: pendiente!.idmens,
            importe: round2(Number(linea.importe)),
            referencia: '',
            socio: socio.socio,
            ticket: 0,
            usuario: 1,
            usumod: 0,
            usunvo: 1,
          })
          .execute();
      }

      await trx
        .updateTable('tbmensualidades')
        .set({
          descuento,
          total: totalConDescuento,
          pagado: 1,
          saldo: 0,
          fecpago: now,
          usumod: 1,
          fecmod: now,
          envia: 1,
        } as any)
        .where('idmens', '=', pendiente!.idmens)
        .execute();

      // Registro del descuento en tbdescuentos (solo si aplica), como BDK: max(iddesc)+1.
      if (descuento > 0) {
        const maxIddescRow = await trx
          .selectFrom('tbdescuentos')
          .select(sql<string>`coalesce(max(iddesc), 0)`.as('maxId'))
          .executeTakeFirst();
        const nuevoIddesc = Number(maxIddescRow?.maxId ?? 0) + 1;

        await trx
          .insertInto('tbdescuentos')
          .values({
            autdes: dto.autoriza ?? 1,
            cancelado: 0,
            corte: 0,
            descuento,
            envia: 1,
            fecha: now,
            fecmod: EMPTY_DATE,
            fecnvo: now,
            iddesc: nuevoIddesc,
            idmens: pendiente!.idmens,
            importe: importeBase,
            motivo,
            socio: socio.socio,
            ticket: 0,
            total: totalConDescuento,
            usuario: 1,
            usumod: 0,
            usunvo: 1,
          })
          .execute();
      }

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

      const logDescuento = descuento > 0 ? ` con descuento de $${formatCurrency(descuento)}` : '';
      await trx
        .insertInto('tblogsocio')
        .values({
          socio: socio.socio,
          usuario: 1,
          log: `Pagó mensualidad de $${formatCurrency(totalConDescuento)}${logDescuento}`,
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
