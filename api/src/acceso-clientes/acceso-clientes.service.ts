import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AccesoClientesService {
  constructor(private readonly db: DatabaseService) {}

  async verificarHuella(huellaData: string) {
    const result = await this.db.getKysely()
      .selectFrom('tbhuellas as h')
      .innerJoin('tbsocios as s', 's.socio', 'h.socio')
      .leftJoin('tbmodospago as mp', 'mp.modopago', 's.modopago')
      .select([
        's.socio as id',
        's.nomsocio as nombre',
        's.foto',
        's.activo',
        's.tel1',
        's.correo',
        'h.dedo',
        's.diapago as fechaVencimiento',
        's.importepago as montoPago',
        'mp.nommodopago as tipoMembresia',
        's.visitasdisp as visitasDisponibles',
        's.visvig as vigenciaVisitas'
      ])
      .where('h.huella', '=', huellaData)
      .where('s.activo', '=', 1)
      .executeTakeFirst();

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      nombre: result.nombre,
      foto: result.foto,
      activo: result.activo === 1,
      telefono: result.tel1,
      correo: result.correo,
      dedo: result.dedo,
      fechaVencimiento: result.fechaVencimiento,
      montoPago: result.montoPago ? Number(result.montoPago) : 0,
      tipoMembresia: result.tipoMembresia || 'Sin membresía',
      visitasDisponibles: result.visitasDisponibles || 0,
      vigenciaVisitas: result.vigenciaVisitas
    };
  }

  async buscarClientePorId(socioId: number) {
    const result = await this.db.getKysely()
      .selectFrom('tbsocios as s')
      .select([
        's.socio as id',
        's.nomsocio as nombre',
        's.foto',
        's.activo',
        's.tel1',
        's.correo',
        's.fecvencevis as fechaVencimiento'
      ])
      .where('s.socio', '=', socioId)
      .where('s.activo', '=', 1)
      .executeTakeFirst();

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      nombre: result.nombre,
      foto: result.foto,
      activo: result.activo === 1,
      telefono: result.tel1,
      correo: result.correo,
      fechaVencimiento: result.fechaVencimiento
    };
  }

  async registrarAsistencia(socioId: number) {
    const fechaActual = new Date();
    
    await this.db.getKysely()
      .insertInto('tbasistencia')
      .values({
        socio: socioId,
        fecha: fechaActual,
        clase: 0,
        horario: 0,
        instructor: 0,
        retardo: 0,
        autorizo: 0,
        motivo: 'Acceso por huella',
        envia: 0,
        fecnvo: fechaActual,
        fecmod: fechaActual,
        usunvo: 1,
        usumod: 1
      })
      .execute();

    return { success: true, fecha: fechaActual };
  }
}
