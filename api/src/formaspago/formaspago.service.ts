import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class FormaspagoService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getFormasPago() {
    const kysely = this.databaseService.getKysely();
    
    const formasPago = await kysely
      .selectFrom('tbformaspago')
      .select(['fp', 'nomfp'])
      .execute();
    
    return formasPago;
  }

  async exportarFormasPago() {
    const kysely = this.databaseService.getKysely();
    
    const formasPago = await kysely
      .selectFrom('tbformaspago')
      .selectAll()
      .orderBy('fp')
      .execute();
    
    // Formatear datos para exportación
    const datosExportacion = formasPago.map(fp => ({
      'ID Forma Pago': fp.fp,
      'Nombre Forma Pago': fp.nomfp,
      'Fecha Creación': fp.fecnvo ? new Date(fp.fecnvo).toLocaleString('es-MX') : '',
      'Usuario Creación': fp.usunvo || '',
      'Fecha Modificación': fp.fecmod && fp.fecmod.getTime() !== 0 ? new Date(fp.fecmod).toLocaleString('es-MX') : '',
      'Usuario Modificación': fp.usumod || ''
    }));
    
    return {
      datos: datosExportacion,
      nombreArchivo: `formas_pago_${new Date().toISOString().split('T')[0]}.csv`,
      fechaExportacion: new Date().toLocaleString('es-MX'),
      totalRegistros: datosExportacion.length
    };
  }
}
