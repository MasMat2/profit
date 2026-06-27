import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { Tbclases } from '../../database/database.types';

const PERIODO_COLS = [
  { periodo: 'Semanal',    colPrecio: 'prsem',   colDescuento: 'descsem'   },
  { periodo: 'Quincenal',  colPrecio: 'prqna',   colDescuento: 'descqna'   },
  { periodo: 'Mensual',    colPrecio: 'prmes',   colDescuento: 'descmes'   },
  { periodo: 'Trimestral', colPrecio: 'prtrim',  colDescuento: 'desctrim'  },
  { periodo: 'Semestral',  colPrecio: 'prstre',  colDescuento: 'descstre'  },
  { periodo: 'Anual',      colPrecio: 'pranual', colDescuento: 'descanual' },
] as const;

export type CreateClaseDto = Pick<Tbclases, 'nomclase' | 'activa'>;

export type UpdateClaseDto = { id: number } &
  Partial<Pick<Tbclases, 'nomclase' | 'limitectes' | 'cntlimite' | 'activa' | 'cobinsc' | 'prinsc'>> & {
    precios?: { periodo: string; precioNormal: number; descuento: number }[];
  };

@Injectable()
export class ClasesService {
  constructor(private readonly db: DatabaseService) {}

  async createClase(dto: CreateClaseDto) {
    const db = this.db.getKysely();
    const now = new Date();
    const result = await db
      .insertInto('tbclases')
      .values({
        nomclase: dto.nomclase,
        clase: 0,
        activa: dto.activa,
        controlhr: 0,
        limitectes: 0,
        cntlimite: 0,
        impticketasist: 0,
        cobinsc: 0,
        prinsc: 0,
        prsem: 0,
        prqna: 0,
        prmes: 0,
        prtrim: 0,
        prstre: 0,
        pranual: 0,
        descsem: 0,
        descqna: 0,
        descmes: 0,
        desctrim: 0,
        descstre: 0,
        descanual: 0,
        usunvo: 1,
        fecnvo: now,
        usumod: 0,
        fecmod: new Date('1900-01-01'),
        envia: 1,
      })
      .executeTakeFirst();

    const newId = Number(result.insertId);
    return this.getClase(newId);
  }

  async updateClase(dto: UpdateClaseDto) {
    const db = this.db.getKysely();

    // Flatten precios into column names
    const flatPrices: Record<string, number> = {};
    if (dto.precios) {
      for (const p of dto.precios) {
        const periodoRow = PERIODO_COLS.find(c => c.periodo === p.periodo);
        if (periodoRow) {
          flatPrices[periodoRow.colPrecio] = p.precioNormal;
          flatPrices[periodoRow.colDescuento] = p.descuento;
        }
      }
    }

    // Build update data
    const { id, precios: _, ...rest } = dto;
    const updateData: Record<string, unknown> = {
      ...rest,
      ...flatPrices,
      fecmod: new Date(),
    };

    // Execute update
    const result = await db
      .updateTable('tbclases')
      .set(updateData as any)
      .where('id', '=', id)
      .executeTakeFirst();

    if (!result || result.numUpdatedRows === BigInt(0)) {
      throw new NotFoundException(`Clase con id ${id} no encontrada`);
    }

    return this.getClase(id);
  }

  private async getClase(id: number) {
    const db = this.db.getKysely();
    const row = await db
      .selectFrom('tbclases')
      .select([
        'id', 'clase', 'nomclase', 'activa', 'cobinsc', 'prinsc',
        'prsem', 'prqna', 'prmes', 'prtrim', 'prstre', 'pranual',
        'descsem', 'descqna', 'descmes', 'desctrim', 'descstre', 'descanual',
        'limitectes', 'cntlimite', 'controlhr', 'impticketasist', 'fecmod',
      ])
      .where('id', '=', id)
      .executeTakeFirst();

    if (!row) throw new NotFoundException(`Clase con id ${id} no encontrada`);

    const { prsem, prqna, prmes, prtrim, prstre, pranual,
      descsem, descqna, descmes, desctrim, descstre, descanual, ...rest } = row;
    const prices = { prsem, prqna, prmes, prtrim, prstre, pranual,
      descsem, descqna, descmes, desctrim, descstre, descanual };
    return {
      ...rest,
      precios: PERIODO_COLS.map(({ periodo, colPrecio, colDescuento }) => ({
        periodo,
        precioNormal: prices[colPrecio],
        descuento: prices[colDescuento],
      })),
    };
  }

  async getAllClases() {
    const db = this.db.getKysely();
    const rows = await db
      .selectFrom('tbclases')
      .select([
        'id',
        'clase',
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
        'controlhr',
        'impticketasist',
        'fecmod',
      ])
      .orderBy('nomclase', 'asc')
      .execute();

      return rows.map(({ prsem, prqna, prmes, prtrim, prstre, pranual,
        descsem, descqna, descmes, desctrim, descstre, descanual,
        ...rest }) => {
          const prices = { prsem, prqna, prmes, prtrim, prstre, pranual,
            descsem, descqna, descmes, desctrim, descstre, descanual };
          return {
            ...rest,
            precios: PERIODO_COLS.map(({ periodo, colPrecio, colDescuento }) => ({
              periodo,
              precioNormal: prices[colPrecio],
              descuento: prices[colDescuento],
            })),
          };
      });
  }

}
