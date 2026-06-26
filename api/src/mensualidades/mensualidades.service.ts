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

  async generarMensualidadesFuturas(socioId: number) {
    console.log(`🔄 Verificando y generando mensualidades futuras para socio ${socioId}`);
    
    // Primero verificar si el socio está activo
    const socioInfo = await this.db
      .selectFrom('tbsocios')
      .select('activo')
      .where('socio', '=', socioId)
      .executeTakeFirst();
    
    if (!socioInfo) {
      console.log(`❌ No se encontró información del socio ${socioId}`);
      return;
    }
    
    if (socioInfo.activo !== 1) {
      console.log(`ℹ️ Socio ${socioId} está inactivo (activo: ${socioInfo.activo}), no se generan mensualidades futuras`);
      return;
    }
    
    // Obtener la última mensualidad del socio
    const ultimaMensualidad = await this.db
      .selectFrom('tbmensualidades')
      .selectAll()
      .where('socio', '=', socioId)
      .where('inscrip', '=', 0)
      .orderBy('fecha', 'desc')
      .limit(1)
      .executeTakeFirst();
    
    if (!ultimaMensualidad) {
      console.log(`❌ No se encontraron mensualidades para socio ${socioId}`);
      return;
    }
    
    // Verificar si la última mensualidad está pagada y es pasada
    const ahora = new Date();
    const fechaUltima = new Date(ultimaMensualidad.fecha);
    
    if (ultimaMensualidad.pagado === 1 && fechaUltima < ahora) {
      console.log(`✅ Socio ${socioId} está activo y tiene mensualidad pagada y pasada, generando siguiente...`);
      await this.generarSiguienteMensualidad(socioId, 1); // usuarioId = 1 por defecto
    } else {
      console.log(`ℹ️ Socio ${socioId} no necesita generar mensualidad futura. Pagado: ${ultimaMensualidad.pagado}, Fecha: ${fechaUltima.toISOString()}`);
    }
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
    
    // Paso 6: Verificar si hay mensualidades atrasadas y procesarlas
    console.log(`🔄 Verificando mensualidades atrasadas para socio ${mensualidad.socio}`);
    await this.procesarMensualidadesAtrasadas(mensualidad.socio, cobroData.usuarioId);
    console.log(`✅ Proceso de cobro completado para mensualidad ${cobroData.idMens}`);
    
    return {
      success: true,
      message: 'Mensualidad cobrada exitosamente',
      idIngreso: nextIdIng
    };
  }

  async actualizarFechaMensualidad(idMens: number, nuevaFecha: string, usuarioId: number) {
    console.log(`📅 Actualizando fecha de mensualidad ${idMens} a ${nuevaFecha}`);
    
    // Verificar que la mensualidad existe
    const mensualidad = await this.db
      .selectFrom('tbmensualidades')
      .selectAll()
      .where('idmens', '=', idMens)
      .executeTakeFirst();
    
    if (!mensualidad) {
      throw new Error('Mensualidad no encontrada');
    }
    
    // No permitir actualizar fecha si ya está pagada
    if (mensualidad.pagado === 1) {
      throw new Error('No se puede modificar la fecha de una mensualidad ya pagada');
    }
    
    // Parsear la fecha correctamente para evitar problemas de zona horaria
    console.log(`📅 Fecha original recibida: ${nuevaFecha}`);
    const fechaActualizada = new Date(nuevaFecha + 'T12:00:00.000Z'); // Forzar mediodía UTC
    console.log(`📅 Fecha parseada: ${fechaActualizada.toISOString()}`);
    console.log(`📅 Fecha local: ${fechaActualizada.toLocaleDateString()}`);
    
    // Extraer el día de la nueva fecha para actualizar el ciclo de pago del socio
    const diaPago = fechaActualizada.getDate();
    console.log(`📅 Nuevo día de pago: ${diaPago}`);
    
    // Crear fecha para diapago sin problemas de zona horaria
    const fechaDiapago = new Date(nuevaFecha + 'T12:00:00.000Z');
    console.log(`📅 Fecha diapago: ${fechaDiapago.toISOString()}`);
    
    // Actualizar el día de pago del socio
    await this.db
      .updateTable('tbsocios')
      .set({
        diapago: fechaDiapago,
        usumod: usuarioId,
        fecmod: new Date(),
        envia: 1
      })
      .where('socio', '=', mensualidad.socio)
      .execute();
    
    // Actualizar la fecha de la mensualidad
    await this.db
      .updateTable('tbmensualidades')
      .set({
        fecha: fechaActualizada,
        descrip: this.generarDescripcionMensualidad(fechaActualizada),
        usumod: usuarioId,
        fecmod: new Date(),
        envia: 1
      })
      .where('idmens', '=', idMens)
      .execute();
    
    console.log(`✅ Fecha de mensualidad ${idMens} actualizada a ${fechaActualizada.toISOString()}`);
    console.log(`✅ Día de pago del socio ${mensualidad.socio} actualizado al día ${diaPago}`);
    
    return {
      success: true,
      message: `Fecha de mensualidad actualizada exitosamente. El ciclo de pago ahora será el día ${diaPago} de cada mes.`,
      nuevaFecha: fechaActualizada,
      diaPago: diaPago
    };
  }
  
  private async procesarMensualidadesAtrasadas(socioId: number, usuarioId: number) {
    console.log(`🔍 Verificando si hay mensualidades atrasadas para socio ${socioId}`);
    
    // Obtener todas las mensualidades no pagadas ordenadas por fecha
    const mensualidadesPendientes = await this.db
      .selectFrom('tbmensualidades')
      .selectAll()
      .where('socio', '=', socioId)
      .where('pagado', '=', 0)
      .where('cancelado', '=', 0)
      .where('inscrip', '=', 0)
      .orderBy('fecha', 'asc')
      .execute();
    
    console.log(`📊 Encontradas ${mensualidadesPendientes.length} mensualidades pendientes`);
    
    // Generar siguiente mensualidad solo si no quedan mensualidades atrasadas
    const ahora = new Date();
    const mensualidadesAtrasadas = mensualidadesPendientes.filter(m => 
      new Date(m.fecha) <= ahora
    );
    
    console.log(`📊 Mensualidades atrasadas: ${mensualidadesAtrasadas.length}`);
    
    if (mensualidadesAtrasadas.length === 0) {
      console.log(`✅ No hay mensualidades atrasadas, generando siguiente mensualidad...`);
      await this.generarSiguienteMensualidad(socioId, usuarioId);
    } else {
      console.log(`⚠️ Aún quedan ${mensualidadesAtrasadas.length} mensualidades atrasadas por pagar. No se genera siguiente mensualidad.`);
    }
  }
  
  private async generarSiguienteMensualidad(socioId: number, usuarioId: number) {
    console.log(`🔄 Generando siguiente mensualidad para socio ${socioId}`);
    
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
    
    console.log(`📊 Info socio encontrada:`, socioInfo);
    
    if (!socioInfo) {
      console.log(`❌ No se encontró información del socio ${socioId}`);
      return; // No se puede generar siguiente mensualidad si no hay info del socio
    }
    
    // Obtener la última fecha de mensualidad
    const ultimaMensualidad = await this.db
      .selectFrom('tbmensualidades')
      .select(this.db.fn.max('fecha').as('UltFec'))
      .where('socio', '=', socioId)
      .where('inscrip', '=', 0)
      .executeTakeFirst();
    
    console.log(`📅 Última mensualidad encontrada:`, ultimaMensualidad);
    
    if (!ultimaMensualidad?.UltFec) {
      console.log(`❌ No se encontró última fecha de mensualidad para socio ${socioId}`);
      return;
    }
    
    // Calcular la siguiente fecha según el modo de pago (no usar cadadias de la BD)
    const ultimaFecha = new Date(ultimaMensualidad.UltFec);
    const siguienteFecha = this.calcularFechaSiguientePeriodo(ultimaFecha, socioInfo.modopago);
    
    console.log(`📆 Fechas - Última: ${ultimaFecha.toISOString()}, Siguiente: ${siguienteFecha.toISOString()}, Modo pago: ${socioInfo.modopago}`);
    
    // Obtener el precio de la mensualidad
    const precioMensualidad = await this.db
      .selectFrom('tbmensualidades')
      .select('importe')
      .where('socio', '=', socioId)
      .where('inscrip', '=', 0)
      .orderBy('fecha', 'desc')
      .limit(1)
      .executeTakeFirst();
    
    console.log(`💰 Precio mensualidad encontrado:`, precioMensualidad);
    
    if (!precioMensualidad) {
      console.log(`❌ No se encontró precio de mensualidad para socio ${socioId}`);
      return;
    }
    
    // Obtener el siguiente consecutivo para tbmensualidades
    const mensualidadesResult = await this.db
      .selectFrom('tbmensualidades')
      .select(this.db.fn.max('idmens').as('consecutivo'))
      .executeTakeFirst();
    
    const nextIdMens = (mensualidadesResult?.consecutivo || 0) + 1;
    console.log(`🔢 Siguiente ID de mensualidad: ${nextIdMens}`);
    
    // Insertar la siguiente mensualidad
    const nuevaMensualidad = {
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
    };
    
    console.log(`📝 Insertando nueva mensualidad:`, nuevaMensualidad);
    
    await this.db
      .insertInto('tbmensualidades')
      .values(nuevaMensualidad)
      .execute();
    
    console.log(`✅ Mensualidad siguiente generada exitosamente para socio ${socioId}`);
  }

  private calcularFechaSiguientePeriodo(fecha: Date, modopago: number): Date {
    const nuevaFecha = new Date(fecha);
    switch (modopago) {
      case 1: // Semanal
        nuevaFecha.setDate(nuevaFecha.getDate() + 7);
        break;
      case 2: // Quincenal
        nuevaFecha.setDate(nuevaFecha.getDate() + 15);
        break;
      case 3: // Mensual
        nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);
        break;
      case 4: // Trimestral
        nuevaFecha.setMonth(nuevaFecha.getMonth() + 3);
        break;
      case 5: // Semestral
        nuevaFecha.setMonth(nuevaFecha.getMonth() + 6);
        break;
      case 6: // Anual
        nuevaFecha.setFullYear(nuevaFecha.getFullYear() + 1);
        break;
      default:
        nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);
    }
    return nuevaFecha;
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
