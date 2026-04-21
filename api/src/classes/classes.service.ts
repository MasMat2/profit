import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ClassesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getAllClasses() {
    const query = `SELECT * FROM tbclases ORDER BY nomclase`;
    return await this.databaseService.query(query);
  }

  async getActiveClasses() {
    const query = `SELECT * FROM tbclases WHERE activa = 1 ORDER BY nomclase`;
    return await this.databaseService.query(query);
  }

  async getClassById(id: number) {
    const query = `SELECT * FROM tbclases WHERE id = ?`;
    const results = await this.databaseService.query(query, [id]);
    return results[0] || null;
  }

  async createClass(data: any) {
    const query = `
      INSERT INTO tbclases (
        clase, nomclase, controlhr, limitectes, cntlimite, 
        impticketasist, activa, cobinsc, prinsc, prsem, prqna, 
        prmes, prtrim, prstre, pranual, descsem, descqna, descmes, 
        desctrim, descstre, descanual, usunvo, fecnvo, usumod, 
        fecmod, envia
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)
    `;
    
    const params = [
      data.clase || 0,
      data.nomclase,
      data.controlhr || 0,
      data.limitectes || 0,
      data.cntlimite || 0,
      data.impticketasist || 0,
      data.activa !== undefined ? data.activa : 1,
      data.cobinsc || 0,
      data.prinsc || 0,
      data.prsem || 0,
      data.prqna || 0,
      data.prmes || 0,
      data.prtrim || 0,
      data.prstre || 0,
      data.pranual || 0,
      data.descsem || 0,
      data.descqna || 0,
      data.descmes || 0,
      data.desctrim || 0,
      data.descstre || 0,
      data.descanual || 0,
      data.usunvo || 1,
      data.usumod || 1,
      data.envia || 0
    ];
    
    const result: any = await this.databaseService.query(query, params);
    return this.getClassById(result.insertId);
  }

  async updateClass(id: number, data: any) {
    const query = `
      UPDATE tbclases 
      SET 
        clase = ?,
        nomclase = ?,
        controlhr = ?,
        limitectes = ?,
        cntlimite = ?,
        impticketasist = ?,
        activa = ?,
        cobinsc = ?,
        prinsc = ?,
        prsem = ?,
        prqna = ?,
        prmes = ?,
        prtrim = ?,
        prstre = ?,
        pranual = ?,
        descsem = ?,
        descqna = ?,
        descmes = ?,
        desctrim = ?,
        descstre = ?,
        descanual = ?,
        usumod = ?,
        fecmod = NOW(),
        envia = ?
      WHERE id = ?
    `;
    
    const params = [
      data.clase || 0,
      data.nomclase,
      data.controlhr || 0,
      data.limitectes || 0,
      data.cntlimite || 0,
      data.impticketasist || 0,
      data.activa !== undefined ? data.activa : 1,
      data.cobinsc || 0,
      data.prinsc || 0,
      data.prsem || 0,
      data.prqna || 0,
      data.prmes || 0,
      data.prtrim || 0,
      data.prstre || 0,
      data.pranual || 0,
      data.descsem || 0,
      data.descqna || 0,
      data.descmes || 0,
      data.desctrim || 0,
      data.descstre || 0,
      data.descanual || 0,
      data.usumod || 1,
      data.envia || 0,
      id
    ];
    
    await this.databaseService.query(query, params);
    return this.getClassById(id);
  }

  async deleteClass(id: number) {
    const query = `DELETE FROM tbclases WHERE id = ?`;
    await this.databaseService.query(query, [id]);
    return { deleted: true };
  }

  async toggleActive(id: number) {
    const query = `UPDATE tbclases SET activa = NOT activa, usumod = ?, fecmod = NOW() WHERE id = ?`;
    await this.databaseService.query(query, [1, id]);
    return this.getClassById(id);
  }
}
