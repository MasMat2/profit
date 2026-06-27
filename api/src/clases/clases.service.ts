import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { Tbclases } from '../database/database.types';

const PERIODO_COLS = [
  { periodo: 'Semanal',    colPrecio: 'prsem',   colDescuento: 'descsem'   },
  { periodo: 'Quincenal',  colPrecio: 'prqna',   colDescuento: 'descqna'   },
  { periodo: 'Mensual',    colPrecio: 'prmes',   colDescuento: 'descmes'   },
  { periodo: 'Trimestral', colPrecio: 'prtrim',  colDescuento: 'desctrim'  },
  { periodo: 'Semestral',  colPrecio: 'prstre',  colDescuento: 'descstre'  },
  { periodo: 'Anual',      colPrecio: 'pranual', colDescuento: 'descanual' },
] as const;

export type UpdateClaseDto = { id: number } &
  Partial<Pick<Tbclases, 'nomclase' | 'limitectes' | 'cntlimite' | 'activa' | 'cobinsc' | 'prinsc'>> & {
    precios?: { periodo: string; precioNormal: number; descuento: number }[];
  };

@Injectable()
export class ClasesService {
  constructor(private readonly db: DatabaseService) {}

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

    return { success: true };
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
