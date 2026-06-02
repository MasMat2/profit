import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface SocioAccesoDto {
  id: number;
  socio: number;
  nombre: string;
  foto?: string;
  fotostr?: string;
  telefono?: string;
  correo?: string;
  activo: number;
  tipoMembresia?: string;
  fechaVencimiento?: Date | null;
  visitasDisponibles?: number;
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
        'correo',
        'tel1',
        'foto',
        'fotostr',
        'activo',
        'visitasdisp',
        'fecvencevis',
        'visvig',
      ])
      .where('socio', '=', socioId)
      .executeTakeFirst();

    if (!socio) {
      throw new NotFoundException(`Socio ${socioId} no encontrado`);
    }

    const membresia = await db
      .selectFrom('tbmensualidades')
      .select(['descrip'])
      .where('socio', '=', socioId)
      .where('cancelado', '=', 0)
      .orderBy('fecha', 'desc')
      .executeTakeFirst();

    return {
      id: socio.id,
      socio: socio.socio,
      nombre: socio.nomsocio,
      foto: socio.foto,
      fotostr: socio.fotostr ?? undefined,
      telefono: socio.tel1,
      correo: socio.correo,
      activo: socio.activo,
      tipoMembresia: membresia?.descrip,
      fechaVencimiento: socio.fecvencevis,
      visitasDisponibles: socio.visitasdisp,
      vigenciaVisitas: socio.visvig,
    };
  }
}
