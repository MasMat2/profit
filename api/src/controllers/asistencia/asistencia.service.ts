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
      ])
      .where('socio', '=', socioId)
      .executeTakeFirst();

    if (!socio) {
      throw new NotFoundException(`Socio ${socioId} no encontrado`);
    }

    const modo = await db
      .selectFrom('tbmodospago')
      .select(['nommodopago'])
      .where('modopago', '=', socio.modopago)
      .executeTakeFirst();

    return {
      id: socio.id,
      socio: socio.socio,
      nombre: socio.nomsocio,
      activo: socio.activo,
      tipoMembresia: modo?.nommodopago,
      fechaVencimiento: socio.diapago,
      vigenciaVisitas: socio.visvig,
    };
  }
}
