import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class SociosService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getAllSocios(search?: string, estatus?: string, becado?: string) {
    let query = `SELECT * FROM tbsocios`;
    const params: any[] = [];
    const conditions: string[] = [];

    // Filtro de búsqueda
    if (search) {
      conditions.push(`(nomsocio LIKE ? OR correo LIKE ? OR tel1 LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Filtro por estatus
    if (estatus) {
      const estatusArray = estatus.split(',');
      const estatusConditions: string[] = [];
      
      estatusArray.forEach(est => {
        if (est === 'Activo') {
          estatusConditions.push('activo = 1');
        } else if (est === 'Inactivo') {
          estatusConditions.push('activo = 0');
        } else if (est === 'Becado') {
          estatusConditions.push('becado = 1');
        }
      });
      
      if (estatusConditions.length > 0) {
        conditions.push(`(${estatusConditions.join(' OR ')})`);
      }
    }

    // Filtro por becado
    if (becado !== undefined) {
      conditions.push(`becado = ?`);
      params.push(+becado);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY nomsocio`;

    return await this.databaseService.query(query, params);
  }

  async getSocioById(id: number) {
    const query = `SELECT * FROM tbsocios WHERE id = ?`;
    const results = await this.databaseService.query(query, [id]);
    return results[0] || null;
  }

  async createSocio(data: any) {
    const query = `
      INSERT INTO tbsocios (
        socio, nomsocio, direccion, tel1, tel2, correo, obs,
        activo, foto, modopago, importepago, descpo, becado,
        diapago, visitasdisp, fecvencevis, cumpleaños, sexo,
        clases, usunvo, fecnvo, usumod, fecmod, envia,
        campo1, campo2, campo3, campo4, campo5,
        campo6, campo7, campo8, campo9, campo10,
        fotostr, visvig, vissucacc, razonsocial,
        fcalle, fnumero, finterior, fcolonia, fciudad,
        festado, fcp, rfc, nivel
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        NOW(), ?, NOW(), ?, ?,
        ?, ?, NOW(), ?, NOW(), ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, NOW(), ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `;
    
    const params = [
      data.socio || 0,
      data.nomsocio || '',
      data.direccion || '',
      data.tel1 || '',
      data.tel2 || '',
      data.correo || '',
      data.obs || '',
      data.activo !== undefined ? data.activo : 1,
      data.foto || '',
      data.modopago || 3,
      data.importepago || 0,
      data.descpo || 0,
      data.becado || 0,
      data.visitasdisp || 0,
      data.cumpleaños || null,
      data.sexo || 1,
      data.clases || '',
      data.usunvo || 1,
      data.usumod || 1,
      data.envia || 0,
      data.campo1 || '',
      data.campo2 || '',
      data.campo3 || '',
      data.campo4 || '',
      data.campo5 || '',
      data.campo6 || '',
      data.campo7 || '',
      data.campo8 || '',
      data.campo9 || '',
      data.campo10 || '',
      data.fotostr || null,
      data.vissucacc || null,
      data.razonsocial || '',
      data.fcalle || '',
      data.fnumero || '',
      data.finterior || '',
      data.fcolonia || '',
      data.fciudad || '',
      data.festado || '',
      data.fcp || '',
      data.rfc || '',
      data.nivel || 0
    ];
    
    const result: any = await this.databaseService.query(query, params);
    return this.getSocioById(result.insertId);
  }

  async updateSocio(id: number, data: any) {
    const query = `
      UPDATE tbsocios 
      SET 
        nomsocio = ?,
        direccion = ?,
        tel1 = ?,
        tel2 = ?,
        correo = ?,
        obs = ?,
        activo = ?,
        foto = ?,
        modopago = ?,
        importepago = ?,
        descpo = ?,
        becado = ?,
        visitasdisp = ?,
        cumpleaños = ?,
        sexo = ?,
        clases = ?,
        usumod = ?,
        fecmod = NOW(),
        envia = ?,
        fotostr = ?,
        razonsocial = ?,
        fcalle = ?,
        fnumero = ?,
        finterior = ?,
        fcolonia = ?,
        fciudad = ?,
        festado = ?,
        fcp = ?,
        rfc = ?,
        nivel = ?
      WHERE id = ?
    `;
    
    const params = [
      data.nomsocio,
      data.direccion || '',
      data.tel1,
      data.tel2 || '',
      data.correo,
      data.obs || '',
      data.activo !== undefined ? data.activo : 1,
      data.foto || '',
      data.modopago || 3,
      data.importepago || 0,
      data.descpo || 0,
      data.becado || 0,
      data.visitasdisp || 0,
      data.cumpleaños,
      data.sexo,
      data.clases || '',
      data.usumod || 1,
      data.envia || 0,
      data.fotostr || null,
      data.razonsocial || '',
      data.fcalle || '',
      data.fnumero || '',
      data.finterior || '',
      data.fcolonia || '',
      data.fciudad || '',
      data.festado || '',
      data.fcp || '',
      data.rfc || '',
      data.nivel || 0,
      id
    ];
    
    await this.databaseService.query(query, params);
    return this.getSocioById(id);
  }

  async deleteSocio(id: number) {
    const query = `DELETE FROM tbsocios WHERE id = ?`;
    await this.databaseService.query(query, [id]);
    return { deleted: true };
  }
}
