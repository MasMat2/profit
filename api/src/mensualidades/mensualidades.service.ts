import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class MensualidadesService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.getKysely();
  }

  async getMensualidadesBySocio(socioId: number, pagado?: string, cancelado?: string) {
    return this.db
      .selectFrom('tbmensualidades')
      .selectAll()
      .where('socio', '=', socioId)
      .$if(pagado !== undefined, qb =>
        qb.where('pagado', '=', pagado === '1' ? 1 : 0),
      )
      .$if(cancelado !== undefined, qb =>
        qb.where('cancelado', '=', cancelado === '1' ? 1 : 0),
      )
      .orderBy('fecha', 'desc')
      .execute();
  }

  async getMensualidadById(id: number) {
    return this.db
      .selectFrom('tbmensualidades')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst() ?? null;
  }

  async cobrarMensualidad(cobroData: {
    idMens: number;
    formaPago: number;
    descuento: number;
    referencia: string;
    motivoDescuento: string;
    usuarioId: number;
  }) {
    const now = new Date();
    
    // Paso 1: Obtener información de la mensualidad
    const mensualidad = await this.db
      .selectFrom('tbmensualidades')
      .selectAll()
      .where('idmens', '=', cobroData.idMens)
      .executeTakeFirst();
    
    if (!mensualidad) {
      throw new Error('Mensualidad no encontrada');
    }
    
    // Paso 2: Obtener el siguiente consecutivo para tbingresos
    const ingresosResult = await this.db
      .selectFrom('tbingresos')
      .select(this.db.fn.max('iding').as('consecutivo'))
      .executeTakeFirst();
    
    const nextIdIng = (ingresosResult?.consecutivo || 0) + 1;
    
    // Paso 3: Insertar en tbingresos (sigue el patrón del log)
    await this.db
      .insertInto('tbingresos')
      .values({
        iding: nextIdIng,
        fecha: now,
        ticket: 0,
        idmens: cobroData.idMens,
        socio: mensualidad.socio,
        usuario: cobroData.usuarioId,
        importe: mensualidad.importe,
        fp: cobroData.formaPago,
        referencia: cobroData.referencia || '',
        corte: 0,
        cancelado: 0,
        usunvo: cobroData.usuarioId,
        fecnvo: now,
        usumod: 0,
        fecmod: new Date('1900-01-01 00:00:00'),
        envia: 1
      })
      .execute();
    
    // Paso 4: Actualizar tbmensualidades (sigue el patrón del log)
    const totalConDescuento = parseFloat(mensualidad.importe) - cobroData.descuento;
    
    await this.db
      .updateTable('tbmensualidades')
      .set({
        descuento: cobroData.descuento.toString(),
        total: totalConDescuento.toString(),
        saldo: '0',
        pagado: 1,
        fecpago: now,
        notas: cobroData.motivoDescuento || '',
        usumod: cobroData.usuarioId,
        fecmod: now,
        envia: 1
      })
      .where('idmens', '=', cobroData.idMens)
      .execute();
    
    // Paso 5: Si hay descuento, insertar en tbdescuentos
    if (cobroData.descuento > 0) {
      // Obtener el siguiente consecutivo para tbdescuentos
      const descuentosResult = await this.db
        .selectFrom('tbdescuentos')
        .select(this.db.fn.max('iddesc').as('consecutivo'))
        .executeTakeFirst();
      
      const nextIdDesc = (descuentosResult?.consecutivo || 0) + 1;
      
      await this.db
        .insertInto('tbdescuentos')
        .values({
          iddesc: nextIdDesc,
          fecha: now,
          ticket: 0,
          idmens: cobroData.idMens,
          socio: mensualidad.socio,
          usuario: cobroData.usuarioId,
          importe: mensualidad.importe,
          descuento: cobroData.descuento,
          total: totalConDescuento.toString(),
          autdes: 1,
          motivo: cobroData.motivoDescuento || '',
          corte: 0,
          cancelado: 0,
          usunvo: cobroData.usuarioId,
          fecnvo: now,
          usumod: 0,
          fecmod: new Date('1900-01-01 00:00:00'),
          envia: 1
        })
        .execute();
    }
    
    // Paso 6: Generar la siguiente mensualidad
    await this.generarSiguienteMensualidad(mensualidad.socio, cobroData.usuarioId);
    
    return {
      success: true,
      message: 'Mensualidad cobrada exitosamente',
      idIngreso: nextIdIng
    };
  }
  
  private async generarSiguienteMensualidad(socioId: number, usuarioId: number) {
    // Obtener información del socio y su modo de pago
    const socioInfo = await this.db
      .selectFrom('tbsocios')
      .innerJoin('tbmodospago', 'tbsocios.modopago', 'tbmodospago.modopago')
      .select([
        'tbsocios.modopago',
        'tbsocios.diapago',
        'tbmodospago.cadadias'
      ])
      .where('tbsocios.socio', '=', socioId)
      .executeTakeFirst();
    
    if (!socioInfo) {
      return; // No se puede generar siguiente mensualidad si no hay info del socio
    }
    
    // Obtener la última fecha de mensualidad
    const ultimaMensualidad = await this.db
      .selectFrom('tbmensualidades')
      .select(this.db.fn.max('fecha').as('UltFec'))
      .where('socio', '=', socioId)
      .where('inscrip', '=', 0)
      .executeTakeFirst();
    
    if (!ultimaMensualidad?.UltFec) {
      return;
    }
    
    // Calcular la siguiente fecha según el modo de pago
    const ultimaFecha = new Date(ultimaMensualidad.UltFec);
    const siguienteFecha = new Date(ultimaFecha);
    siguienteFecha.setDate(siguienteFecha.getDate() + socioInfo.cadadias);
    
    // Obtener el precio de la mensualidad
    const precioMensualidad = await this.db
      .selectFrom('tbmensualidades')
      .select('importe')
      .where('socio', '=', socioId)
      .where('inscrip', '=', 0)
      .orderBy('fecha', 'desc')
      .limit(1)
      .executeTakeFirst();
    
    if (!precioMensualidad) {
      return;
    }
    
    // Obtener el siguiente consecutivo para tbmensualidades
    const mensualidadesResult = await this.db
      .selectFrom('tbmensualidades')
      .select(this.db.fn.max('idmens').as('consecutivo'))
      .executeTakeFirst();
    
    const nextIdMens = (mensualidadesResult?.consecutivo || 0) + 1;
    
    // Insertar la siguiente mensualidad
    await this.db
      .insertInto('tbmensualidades')
      .values({
        idmens: nextIdMens,
        socio: socioId,
        fecha: siguienteFecha,
        descrip: this.generarDescripcionMensualidad(siguienteFecha),
        importe: precioMensualidad.importe,
        descuento: '0',
        total: precioMensualidad.importe.toString(),
        saldo: precioMensualidad.importe.toString(),
        pagado: 0,
        fecpago: new Date('1900-01-01 00:00:00'),
        notas: '',
        inscrip: 0,
        cancelado: 0,
        modopago: socioInfo.modopago,
        autcan: 0,
        factura: '',
        motivo: '',
        usunvo: usuarioId,
        fecnvo: new Date(),
        usumod: 0,
        fecmod: new Date('1900-01-01 00:00:00'),
        envia: 1
      })
      .execute();
  }

  private generarDescripcionMensualidad(fecha: Date): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const mes = meses[fecha.getMonth()];
    const año = fecha.getFullYear();
    
    return `Mensualidad ${mes} ${año}`;
  }
}
