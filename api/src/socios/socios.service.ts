import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class SociosService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.getKysely();
  }

  async getAllSocios(search?: string, estatus?: string, becado?: string) {
    const socios = await this.db
      .selectFrom('tbsocios as s')
      .leftJoin('tbhuellas as h', 'h.socio', 's.socio')
      .select([
        's.id',
        's.socio',
        's.nomsocio',
        's.direccion',
        's.tel1',
        's.tel2',
        's.correo',
        's.obs',
        's.activo',
        's.foto',
        's.modopago',
        's.importepago',
        's.descpo',
        's.becado',
        's.diapago',
        's.visitasdisp',
        's.fecvencevis',
        's.cumpleaños',
        's.sexo',
        's.clases',
        's.usunvo',
        's.fecnvo',
        's.usumod',
        's.fecmod',
        's.envia',
        's.campo1',
        's.campo2',
        's.campo3',
        's.campo4',
        's.campo5',
        's.campo6',
        's.campo7',
        's.campo8',
        's.campo9',
        's.campo10',
        's.fotostr',
        's.visvig',
        's.vissucacc',
        's.razonsocial',
        's.fcalle',
        's.fnumero',
        's.finterior',
        's.fcolonia',
        's.fciudad',
        's.festado',
        's.fcp',
        's.rfc',
        's.nivel',
        sql<number>`CASE WHEN h.huella IS NOT NULL THEN 1 ELSE 0 END`.as('tieneHuella')
      ])
      .$if(!!search, qb =>
        qb.where(eb => eb.or([
          eb('s.nomsocio', 'like', `%${search}%`),
          eb('s.correo', 'like', `%${search}%`),
          eb('s.tel1', 'like', `%${search}%`),
        ])),
      )
      .$if(!!estatus, qb => {
        const parts = estatus!.split(',');
        const conds: any[] = [];
        return qb.where(eb => {
          if (parts.includes('Activo'))   conds.push(eb('s.activo', '=', 1));
          if (parts.includes('Inactivo')) conds.push(eb('s.activo', '=', 0));
          if (parts.includes('Becado'))   conds.push(eb('s.becado', '=', 1));
          return eb.or(conds);
        });
      })
      .$if(becado !== undefined, qb =>
        qb.where('s.becado', '=', Number(becado)),
      )
      .orderBy('s.nomsocio')
      .execute();

    return socios;
  }

  async getSocioById(id: number) {
    return this.db
      .selectFrom('tbsocios')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst() ?? null;
  }

  async createSocio(data: any) {
    const result = await this.db
      .insertInto('tbsocios')
      .values({
        socio: data.socio ?? 0,
        nomsocio: data.nomsocio ?? '',
        direccion: data.direccion ?? '',
        tel1: data.tel1 ?? '',
        tel2: data.tel2 ?? '',
        correo: data.correo ?? '',
        obs: data.obs ?? '',
        activo: 1, // Siempre crear socios nuevos como activos
        foto: data.foto ?? '',
        modopago: data.modopago ?? 3,
        importepago: data.importepago ?? 0,
        descpo: data.descpo ?? 0,
        becado: data.becado ?? 0,
        diapago: sql`NOW()`,
        visitasdisp: data.visitasdisp ?? 0,
        fecvencevis: sql`NOW()`,
        'cumpleaños': data['cumpleaños'] ?? null,
        sexo: data.sexo ?? 1,
        clases: data.clases ?? '',
        usunvo: data.usunvo ?? 1,
        fecnvo: sql`NOW()`,
        usumod: data.usumod ?? 1,
        fecmod: sql`NOW()`,
        envia: data.envia ?? 0,
        campo1: data.campo1 ?? '',
        campo2: data.campo2 ?? '',
        campo3: data.campo3 ?? '',
        campo4: data.campo4 ?? '',
        campo5: data.campo5 ?? '',
        campo6: data.campo6 ?? '',
        campo7: data.campo7 ?? '',
        campo8: data.campo8 ?? '',
        campo9: data.campo9 ?? '',
        campo10: data.campo10 ?? '',
        fotostr: data.fotostr ?? null,
        visvig: sql`NOW()`,
        vissucacc: data.vissucacc ?? null,
        razonsocial: data.razonsocial ?? '',
        fcalle: data.fcalle ?? '',
        fnumero: data.fnumero ?? '',
        finterior: data.finterior ?? '',
        fcolonia: data.fcolonia ?? '',
        fciudad: data.fciudad ?? '',
        festado: data.festado ?? '',
        fcp: data.fcp ?? '',
        rfc: data.rfc ?? '',
        nivel: data.nivel ?? 0,
      })
      .executeTakeFirstOrThrow();

    const nuevoSocioId = Number(result.insertId);
    const numeroSocio = data.socio ?? nuevoSocioId; // Usar el número de socio proporcionado o el ID como fallback
    
    console.log(`📝 Socio creado - ID: ${nuevoSocioId}, Número socio: ${numeroSocio}`);
    
    // 1. Insertar log de alta en tblogsocio
    await this.db
      .insertInto('tblogsocio')
      .values({
        socio: numeroSocio,
        usuario: data.usunvo ?? 1,
        log: 'Día de alta al socio.',
        usunvo: data.usunvo ?? 1,
        fecnvo: sql`NOW()`,
        usumod: 0,
        fecmod: sql`'1900-01-01 00:00:00'`,
        envia: 1
      })
      .execute();
    
    console.log(`📋 Log de alta creado para socio ${numeroSocio}`);
    
    // 2. Asignar clases al socio si se proporcionaron
    if (data.clases && data.clases.trim() !== '') {
      await this.asignarClasesSocio(numeroSocio, data.clases, data.usunvo ?? 1);
    }
    
    // 3. Generar mensualidad inicial para el nuevo socio usando el número de socio
    await this.generarMensualidadInicial(numeroSocio, data.usunvo ?? 1);

    return this.getSocioById(nuevoSocioId);
  }

  private async asignarClasesSocio(socioId: number, clases: string, usuarioId: number) {
    console.log(`📚 Asignando clases al socio ${socioId}: ${clases}`);
    
    // Parsear las clases (formato: ',031,' o '031')
    const clasesArray = clases.split(',').filter(c => c.trim() !== '');
    
    for (const claseId of clasesArray) {
      const claseNum = parseInt(claseId);
      if (isNaN(claseNum)) continue;
      
      // Obtener información de la clase
      const claseInfo = await this.db
        .selectFrom('tbclases')
        .select(['nomclase'])
        .where('clase', '=', claseNum)
        .executeTakeFirst();
      
      if (!claseInfo) {
        console.log(`⚠️ Clase ${claseNum} no encontrada`);
        continue;
      }
      
      // Insertar log de asignación de clase
      await this.db
        .insertInto('tblogsocio')
        .values({
          socio: socioId,
          usuario: usuarioId,
          log: `Agregó la clase de ${claseInfo.nomclase}`,
          usunvo: usuarioId,
          fecnvo: sql`NOW()`,
          usumod: 0,
          fecmod: sql`'1900-01-01 00:00:00'`,
          envia: 1
        })
        .execute();
      
      console.log(`📋 Log de clase creado: ${claseInfo.nomclase}`);
    }
    
    // Eliminar horarios existentes del socio
    await this.db
      .deleteFrom('tbhorariossocio')
      .where('socio', '=', socioId)
      .execute();
    
    // Insertar nuevos horarios para cada clase
    for (const claseId of clasesArray) {
      const claseNum = parseInt(claseId);
      if (isNaN(claseNum)) continue;
      
      await this.db
        .insertInto('tbhorariossocio')
        .values({
          socio: socioId,
          clase: claseNum,
          horario: 0, // Horario por defecto
          usunvo: usuarioId,
          fecnvo: sql`NOW()`,
          usumod: 0,
          fecmod: sql`'1900-01-01 00:00:00'`,
          envia: 1
        })
        .execute();
    }
    
    // Actualizar campo Clases en tbsocios
    await this.db
      .updateTable('tbsocios')
      .set({
        clases: ',' + clasesArray.join(',') + ',',
        usumod: usuarioId,
        fecmod: sql`NOW()`,
        envia: 1
      })
      .where('socio', '=', socioId)
      .execute();
    
    console.log(`✅ Clases asignadas y campo actualizado para socio ${socioId}`);
  }

  async cambiarClaseSocio(socioId: number, usuarioId: number, nuevaClaseId: number, nuevoImporte: number) {
    console.log(`🔄 Cambiando clase del socio ${socioId} a clase ${nuevaClaseId} con importe ${nuevoImporte}`);
    
    // 1. Obtener información actual del socio
    const socioActual = await this.db
      .selectFrom('tbsocios')
      .selectAll()
      .where('socio', '=', socioId)
      .executeTakeFirst();
    
    if (!socioActual) {
      throw new Error('Socio no encontrado');
    }
    
    // 2. Obtener información de la nueva clase
    const nuevaClase = await this.db
      .selectFrom('tbclases')
      .select(['nomclase'])
      .where('clase', '=', nuevaClaseId)
      .executeTakeFirst();
    
    if (!nuevaClase) {
      throw new Error('Nueva clase no encontrada');
    }
    
    // 3. Actualizar importe de pago del socio
    await this.db
      .updateTable('tbsocios')
      .set({
        importepago: nuevoImporte.toString(),
        usumod: usuarioId,
        fecmod: sql`NOW()`,
        envia: 1
      })
      .where('socio', '=', socioId)
      .execute();
    
    console.log(`💰 Importe actualizado a ${nuevoImporte}`);
    
    // 4. Insertar log del cambio de importe
    const importeAnterior = parseFloat(socioActual.importepago as string) || 0;
    await this.db
      .insertInto('tblogsocio')
      .values({
        socio: socioId,
        usuario: usuarioId,
        log: `Modificó el importe a pagar de $${importeAnterior.toFixed(3)} por $${nuevoImporte.toFixed(3)}`,
        usunvo: usuarioId,
        fecnvo: sql`NOW()`,
        usumod: 0,
        fecmod: sql`'1900-01-01 00:00:00'`,
        envia: 1
      })
      .execute();
    
    console.log(`📋 Log de cambio de importe creado`);
    
    // 5. Obtener clases actuales del socio para eliminarlas
    const clasesActuales = socioActual.clases || '';
    const clasesArray = clasesActuales.split(',').filter(c => c.trim() !== '');
    
    for (const claseId of clasesArray) {
      const claseNum = parseInt(claseId);
      if (isNaN(claseNum)) continue;
      
      // Obtener información de la clase actual
      const claseActual = await this.db
        .selectFrom('tbclases')
        .select(['nomclase'])
        .where('clase', '=', claseNum)
        .executeTakeFirst();
      
      if (claseActual) {
        // Insertar log de eliminación de clase
        await this.db
          .insertInto('tblogsocio')
          .values({
            socio: socioId,
            usuario: usuarioId,
            log: `Eliminó la clase de ${claseActual.nomclase}`,
            usunvo: usuarioId,
            fecnvo: sql`NOW()`,
            usumod: 0,
            fecmod: sql`'1900-01-01 00:00:00'`,
            envia: 1
          })
          .execute();
        
        console.log(`📋 Log de eliminación creado: ${claseActual.nomclase}`);
      }
    }
    
    // 6. Insertar log de agregado de nueva clase
    await this.db
      .insertInto('tblogsocio')
      .values({
        socio: socioId,
        usuario: usuarioId,
        log: `Agregó la clase de ${nuevaClase.nomclase}`,
        usunvo: usuarioId,
        fecnvo: sql`NOW()`,
        usumod: 0,
        fecmod: sql`'1900-01-01 00:00:00'`,
        envia: 1
      })
      .execute();
    
    console.log(`📋 Log de nueva clase creado: ${nuevaClase.nomclase}`);
    
    // 7. Eliminar horarios existentes del socio
    await this.db
      .deleteFrom('tbhorariossocio')
      .where('socio', '=', socioId)
      .execute();
    
    // 8. Insertar nuevo horario para la nueva clase
    await this.db
      .insertInto('tbhorariossocio')
      .values({
        socio: socioId,
        clase: nuevaClaseId,
        horario: 0, // Horario por defecto
        usunvo: usuarioId,
        fecnvo: sql`NOW()`,
        usumod: 0,
        fecmod: sql`'1900-01-01 00:00:00'`,
        envia: 1
      })
      .execute();
    
    // 9. Actualizar campo Clases en tbsocios
    await this.db
      .updateTable('tbsocios')
      .set({
        clases: ',' + nuevaClaseId + ',',
        usumod: usuarioId,
        fecmod: sql`NOW()`,
        envia: 1
      })
      .where('socio', '=', socioId)
      .execute();
    
    console.log(`✅ Campo Clases actualizado a ,${nuevaClaseId},`);
    
    // 10. Actualizar mensualidades pendientes (no pagadas) con el nuevo precio
    const updateResult = await this.db
      .updateTable('tbmensualidades')
      .set({
        importe: nuevoImporte.toString(),
        usumod: usuarioId,
        fecmod: sql`NOW()`,
        envia: 1
      })
      .where('socio', '=', socioId)
      .where('pagado', '=', 0) // Solo mensualidades pendientes
      .executeTakeFirst();
    
    const numActualizadas = Number(updateResult.numUpdatedRows) || 0;
    console.log(`💳 ${numActualizadas} mensualidad(es) pendiente(s) actualizada(s) con nuevo precio: ${nuevoImporte}`);
    
    // 11. Insertar log del cambio de precio en mensualidades
    if (numActualizadas > 0) {
      await this.db
        .insertInto('tblogsocio')
        .values({
          socio: socioId,
          usuario: usuarioId,
          log: `Actualizó ${numActualizadas} mensualidad(es) pendiente(s) al nuevo precio de $${nuevoImporte.toFixed(3)}`,
          usunvo: usuarioId,
          fecnvo: sql`NOW()`,
          usumod: 0,
          fecmod: sql`'1900-01-01 00:00:00'`,
          envia: 1
        })
        .execute();
      
      console.log(`📋 Log de actualización de mensualidades creado`);
    }
    
    // 12. Retornar socio actualizado
    return this.getSocioById(socioId);
  }

  private async generarMensualidadInicial(socioId: number, usuarioId: number) {
    console.log(`📅 Generando mensualidad inicial para nuevo socio ${socioId}`);
    
    // Intentar buscar por número de socio primero, si no encuentra, buscar por ID
    let socioInfo = await this.db
      .selectFrom('tbsocios')
      .innerJoin('tbmodospago', 'tbsocios.modopago', 'tbmodospago.modopago')
      .select([
        'tbsocios.id',
        'tbsocios.socio',
        'tbsocios.modopago',
        'tbsocios.diapago',
        'tbsocios.clases',
        'tbmodospago.cadadias'
      ])
      .where('tbsocios.socio', '=', socioId)
      .executeTakeFirst();
    
    // Si no encuentra por número de socio, buscar por ID interno
    if (!socioInfo) {
      console.log(`⚠️ No se encontró socio por número ${socioId}, intentando por ID...`);
      socioInfo = await this.db
        .selectFrom('tbsocios')
        .innerJoin('tbmodospago', 'tbsocios.modopago', 'tbmodospago.modopago')
        .select([
          'tbsocios.id',
          'tbsocios.socio',
          'tbsocios.modopago',
          'tbsocios.diapago',
          'tbsocios.clases',
          'tbmodospago.cadadias'
        ])
        .where('tbsocios.id', '=', socioId)
        .executeTakeFirst();
    }
    
    console.log(`🔍 Socio encontrado para mensualidad:`, socioInfo);
    
    if (!socioInfo) {
      console.log(`❌ No se encontró información del socio ${socioId} para generar mensualidad inicial`);
      return;
    }
    
    // Obtener el precio de la clase asignada o precio por defecto
    let precioMensualidad = { importe: '500.00' }; // Precio por defecto
    
    // Si el socio tiene clase asignada, usar su precio
    if (socioInfo.clases && socioInfo.clases.trim()) {
      const claseId = parseInt(socioInfo.clases.replace(',', ''));
      if (!isNaN(claseId)) {
        const claseInfo = await this.db
          .selectFrom('tbclases')
          .select('prmes')
          .where('id', '=', claseId)
          .executeTakeFirst();
        
        if (claseInfo) {
          precioMensualidad = { importe: claseInfo.prmes };
          console.log(`💰 Usando precio de clase asignada: ${claseInfo.prmes}`);
        }
      }
    }
    
    console.log(`💰 Precio mensualidad inicial: ${precioMensualidad.importe}`);
    
    // Obtener el siguiente consecutivo para tbmensualidades
    const mensualidadesResult = await this.db
      .selectFrom('tbmensualidades')
      .select(this.db.fn.max('idmens').as('consecutivo'))
      .executeTakeFirst();
    
    const nextIdMens = (mensualidadesResult?.consecutivo || 0) + 1;
    console.log(`🔢 Siguiente ID de mensualidad: ${nextIdMens}`);
    
    // Generar fecha de la mensualidad (usar fecha actual + días según modo de pago)
    const fechaMensualidad = new Date();
    fechaMensualidad.setDate(fechaMensualidad.getDate() + (socioInfo.cadadias || 30));
    
    console.log(`📅 Fecha actual: ${new Date().toISOString()}`);
    console.log(`📅 Fecha mensualidad calculada: ${fechaMensualidad.toISOString()}`);
    console.log(`📊 Días a agregar: ${socioInfo.cadadias || 30}`);
    
    // Insertar mensualidad inicial
    await this.db
      .insertInto('tbmensualidades')
      .values({
        idmens: nextIdMens,
        socio: socioInfo.socio, // Usar el número de socio correcto del objeto encontrado
        fecha: fechaMensualidad,
        descrip: this.generarDescripcionMensualidad(fechaMensualidad),
        importe: precioMensualidad.importe,
        descuento: '0',
        total: precioMensualidad.importe.toString(),
        saldo: precioMensualidad.importe.toString(),
        pagado: 0,
        fecpago: new Date('1900-01-01 00:00:00'),
        notas: 'Mensualidad inicial',
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
    
    console.log(`✅ Mensualidad inicial generada para socio ${socioId} - ID: ${nextIdMens}`);
  }

  private generarDescripcionMensualidad(fecha: Date): string {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const mes = meses[fecha.getMonth()];
    const año = fecha.getFullYear();
    return `Mensualidad ${mes} ${año}`;
  }

  async updateSocio(id: number, data: any) {
    await this.db
      .updateTable('tbsocios')
      .set({
        nomsocio: data.nomsocio,
        direccion: data.direccion ?? '',
        tel1: data.tel1,
        tel2: data.tel2 ?? '',
        correo: data.correo,
        obs: data.obs ?? '',
        activo: data.activo !== undefined ? data.activo : 1,
        foto: data.foto ?? '',
        modopago: data.modopago ?? 3,
        importepago: data.importepago ?? 0,
        descpo: data.descpo ?? 0,
        becado: data.becado ?? 0,
        visitasdisp: data.visitasdisp ?? 0,
        'cumpleaños': data['cumpleaños'],
        sexo: data.sexo,
        clases: data.clases ?? '',
        usumod: data.usumod ?? 1,
        fecmod: sql`NOW()`,
        envia: data.envia ?? 0,
        fotostr: data.fotostr ?? null,
        razonsocial: data.razonsocial ?? '',
        fcalle: data.fcalle ?? '',
        fnumero: data.fnumero ?? '',
        finterior: data.finterior ?? '',
        fcolonia: data.fcolonia ?? '',
        fciudad: data.fciudad ?? '',
        festado: data.festado ?? '',
        fcp: data.fcp ?? '',
        rfc: data.rfc ?? '',
        nivel: data.nivel ?? 0,
      })
      .where('id', '=', id)
      .execute();

  return this.getSocioById(id);
  }

  async deleteSocio(id: number) {
    await this.db
      .deleteFrom('tbsocios')
      .where('id', '=', id)
      .execute();
    return { deleted: true };
  }

  async getHuellaBySocio(socioId: number) {
    return this.db
      .selectFrom('tbhuellas')
      .selectAll()
      .where('socio', '=', socioId)
      .executeTakeFirst() ?? null;
  }

  async guardarHuella(socioId: number, huellaData: any) {
    // Verificar si ya existe huella para este socio
    const existente = await this.getHuellaBySocio(socioId);

    if (existente) {
      // Actualizar huella existente
      await this.db
        .updateTable('tbhuellas')
        .set({
          huella: huellaData.fmd,
          dedo: huellaData.dedo ?? 1,
          usumod: huellaData.usumod ?? 1,
          fecmod: sql`NOW()`,
        })
        .where('socio', '=', socioId)
        .execute();
    } else {
      // Insertar nueva huella
      await this.db
        .insertInto('tbhuellas')
        .values({
          socio: socioId,
          huella: huellaData.fmd,
          dedo: huellaData.dedo ?? 1,
          envia: 0,
          usunvo: huellaData.usunvo ?? 1,
          fecnvo: sql`NOW()`,
          usumod: huellaData.usumod ?? 1,
          fecmod: sql`NOW()`,
        })
        .execute();
    }

    return this.getHuellaBySocio(socioId);
  }

  async eliminarHuella(socioId: number) {
    await this.db
      .deleteFrom('tbhuellas')
      .where('socio', '=', socioId)
      .execute();
    return { deleted: true };
  }

  async reactivarSocio(socioId: number, usuarioId: number, claseId?: number) {
    console.log(`🔄 Reactivando socio ${socioId} - claseId recibido: ${claseId}`);
    console.log(`🔄 Marcando mensualidades pasadas como pagadas`);
    
    // Paso 1: Marcar todas las mensualidades impagas como pagadas (condonar deuda)
    await this.db
      .updateTable('tbmensualidades')
      .set({
        pagado: 1,
        saldo: '0',
        fecpago: new Date(),
        notas: 'Mensualidad condonada por reactivación de socio',
        usumod: usuarioId,
        fecmod: new Date(),
        envia: 1
      })
      .where('socio', '=', socioId)
      .where('pagado', '=', 0)
      .execute();

    console.log(`✅ Mensualidades pasadas marcadas como pagadas para socio ${socioId}`);

    // Paso 2: Actualizar el socio a activo = 1
    await this.db
      .updateTable('tbsocios')
      .set({
        activo: 1,
        usumod: usuarioId,
        fecmod: new Date(),
        envia: 1
      })
      .where('socio', '=', socioId)
      .execute();

    // Paso 3: Insertar el log de reactivación
    await this.db
      .insertInto('tblogsocio')
      .values({
        id: 0, // Auto-incremental
        socio: socioId,
        usuario: usuarioId,
        log: 'Reactivó al socio. Mensualidades pasadas condonadas.',
        usunvo: usuarioId,
        fecnvo: new Date(),
        usumod: 0,
        fecmod: new Date('1900-01-01 00:00:00'),
        envia: 1
      })
      .execute();

    // Paso 4: Asignar clase al socio (si se proporciona claseId, si no usa clase por defecto)
    if (claseId) {
      console.log(`📋 Usando claseId proporcionado: ${claseId}`);
      await this.asignarClaseReactivacion(socioId, usuarioId, claseId);
    } else {
      // Clase por defecto si no se especifica (ID 8 = HYROX CLASS)
      console.log(`⚠️ No se proporcionó claseId, usando clase por defecto: 8`);
      await this.asignarClaseReactivacion(socioId, usuarioId, 8);
    }

    // Paso 5: Generar nueva mensualidad desde la fecha actual
    await this.generarMensualidadReactivacion(socioId, usuarioId, claseId);

    console.log(`✅ Socio ${socioId} reactivado exitosamente con nueva clase y mensualidad`);

    return this.getSocioBySocioNumber(socioId);
  }

  private async generarMensualidadReactivacion(socioId: number, usuarioId: number, claseId?: number) {
    console.log(`📅 Generando mensualidad de reactivación para socio ${socioId} - claseId: ${claseId}`);
    
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
      console.log(`❌ No se encontró información del socio ${socioId} para generar mensualidad`);
      return;
    }
    
    // Obtener el precio de la clase asignada (o precio por defecto)
    let precioMensualidad;
    if (claseId) {
      // Usar el precio de la clase asignada
      const claseInfo = await this.db
        .selectFrom('tbclases')
        .select('prmes')
        .where('id', '=', claseId)
        .executeTakeFirst();
      
      if (claseInfo) {
        precioMensualidad = { importe: claseInfo.prmes };
        console.log(`💰 Usando precio de clase asignada: ${claseInfo.prmes}`);
      } else {
        console.log(`⚠️ No se encontró la clase ${claseId}, usando precio por defecto`);
        precioMensualidad = { importe: '1985.00' }; // Precio HYROX por defecto
      }
    } else {
      // Usar precio por defecto (HYROX)
      precioMensualidad = { importe: '1985.00' };
      console.log(`💰 Usando precio por defecto: 1985.00`);
    }
    
    const importe = precioMensualidad?.importe || '500'; // Precio por defecto si no hay historial
    
    // Obtener el siguiente consecutivo para tbmensualidades
    const mensualidadesResult = await this.db
      .selectFrom('tbmensualidades')
      .select(this.db.fn.max('idmens').as('consecutivo'))
      .executeTakeFirst();
    
    const nextIdMens = (mensualidadesResult?.consecutivo || 0) + 1;
    
    // Generar mensualidad para la fecha actual
    const fechaActual = new Date();
    
    await this.db
      .insertInto('tbmensualidades')
      .values({
        idmens: nextIdMens,
        socio: socioId,
        fecha: fechaActual,
        descrip: `Mensualidad Reactivación ${fechaActual.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`,
        importe: importe,
        descuento: '0',
        total: importe,
        saldo: importe,
        pagado: 0,
        fecpago: new Date('1900-01-01 00:00:00'),
        notas: 'Mensualidad generada por reactivación de socio',
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
    
    console.log(`✅ Mensualidad de reactivación generada para socio ${socioId} - ID: ${nextIdMens}`);
  }

  private async asignarClaseReactivacion(socioId: number, usuarioId: number, claseId: number) {
    console.log(`🏋️ Asignando clase de reactivación para socio ${socioId} - Clase ID: ${claseId}`);
    
    const horarioId = 0;
    
    // Obtener información de la clase para el log
    console.log(`🔍 Buscando clase con ID: ${claseId}`);
    const claseInfo = await this.db
      .selectFrom('tbclases')
      .select(['id', 'clase', 'nomclase', 'prmes'])
      .where('id', '=', claseId)
      .executeTakeFirst();
    
    console.log(`🔍 Resultado búsqueda clase:`, claseInfo);
    
    if (!claseInfo) {
      console.log(`❌ No se encontró la clase ${claseId} para asignar`);
      // Listar todas las clases disponibles para depuración
      const todasClases = await this.db
        .selectFrom('tbclases')
        .select(['id', 'clase', 'nomclase'])
        .where('activa', '=', 1)
        .orderBy('id')
        .limit(10)
        .execute();
      console.log(`📋 Clases activas disponibles:`, todasClases);
      return;
    }
    
    console.log(`📋 Clase a asignar: ${claseInfo.nomclase} - $${claseInfo.prmes}`);
    
    // Paso 1: Eliminar clases/horarios existentes del socio (como en los logs)
    await this.db
      .deleteFrom('tbhorariossocio')
      .where('socio', '=', socioId)
      .execute();
    
    console.log(`🗑️ Eliminadas clases anteriores del socio ${socioId}`);
    
    // Paso 2: Insertar log de eliminación de clase anterior (simulado)
    await this.db
      .insertInto('tblogsocio')
      .values({
        id: 0,
        socio: socioId,
        usuario: usuarioId,
        log: `Eliminó la clase anterior para reactivación`,
        usunvo: usuarioId,
        fecnvo: new Date(),
        usumod: 0,
        fecmod: new Date('1900-01-01 00:00:00'),
        envia: 1
      })
      .execute();
    
    // Paso 3: Insertar nueva clase en tbhorariossocio
    await this.db
      .insertInto('tbhorariossocio')
      .values({
        id: 0,
        socio: socioId,
        clase: claseId,
        horario: horarioId,
        usunvo: usuarioId,
        fecnvo: new Date(),
        usumod: 0,
        fecmod: new Date('1900-01-01 00:00:00'),
        envia: 1
      })
      .execute();
    
    console.log(`✅ Insertada nueva clase en tbhorariossocio`);
    
    // Paso 4: Insertar log de agregado de nueva clase
    await this.db
      .insertInto('tblogsocio')
      .values({
        id: 0,
        socio: socioId,
        usuario: usuarioId,
        log: `Agregó la clase de ${claseInfo.nomclase} $${claseInfo.prmes}`,
        usunvo: usuarioId,
        fecnvo: new Date(),
        usumod: 0,
        fecmod: new Date('1900-01-01 00:00:00'),
        envia: 1
      })
      .execute();
    
    // Paso 5: Actualizar campo CLASES del socio (formato ',008' como en los logs)
    const clasesString = `,${claseId.toString().padStart(3, '0')}`;
    
    await this.db
      .updateTable('tbsocios')
      .set({
        clases: clasesString,
        usumod: usuarioId,
        fecmod: new Date(),
        envia: 1
      })
      .where('socio', '=', socioId)
      .execute();
    
    console.log(`✅ Actualizado campo CLASES del socio: ${clasesString}`);
    console.log(`✅ Clase de reactivación asignada exitosamente: ${claseInfo.nomclase}`);
  }

  async darDeBajaSocio(socioId: number, usuarioId: number) {
    // Primero actualizar el socio a activo = 0
    await this.db
      .updateTable('tbsocios')
      .set({
        activo: 0,
        usumod: usuarioId,
        fecmod: new Date(),
        envia: 1
      })
      .where('socio', '=', socioId)
      .execute();

    // Luego insertar el log de baja
    await this.db
      .insertInto('tblogsocio')
      .values({
        id: 0, // Auto-incremental
        socio: socioId,
        usuario: usuarioId,
        log: 'Dió de baja al socio.',
        usunvo: usuarioId,
        fecnvo: new Date(),
        usumod: 0,
        fecmod: new Date('1900-01-01 00:00:00'),
        envia: 1
      })
      .execute();

    return this.getSocioBySocioNumber(socioId);
  }

  async getSocioBySocioNumber(socioNumber: number) {
    return this.db
      .selectFrom('tbsocios')
      .selectAll()
      .where('socio', '=', socioNumber)
      .executeTakeFirst() ?? null;
  }

  async getLogsBySocio(socioId: number) {
    return this.db
      .selectFrom('tblogsocio as l')
      .leftJoin('tbusuarios as u', 'u.usuario', 'l.usuario')
      .select([
        'l.id',
        'l.socio',
        'l.usuario',
        'l.log',
        'l.fecnvo',
        'l.usunvo',
        'l.fecmod',
        'l.usumod',
        'l.envia',
        'u.nombre'
      ])
      .where('l.socio', '=', socioId)
      .orderBy('l.fecnvo', 'desc')
      .execute();
  }
}
