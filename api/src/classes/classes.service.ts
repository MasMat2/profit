import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ClassesService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.getKysely();
  }

  async getAllClasses() {
    return this.db
      .selectFrom('tbclases')
      .selectAll()
      .orderBy('nomclase')
      .execute();
  }

  async getActiveClasses() {
    return this.db
      .selectFrom('tbclases')
      .selectAll()
      .where('activa', '=', 1)
      .orderBy('nomclase')
      .execute();
  }

  async getClassById(id: number) {
    return this.db
      .selectFrom('tbclases')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst() ?? null;
  }

  async createClass(data: any) {
    const result = await this.db
      .insertInto('tbclases')
      .values({
        clase: data.clase ?? 0,
        nomclase: data.nomclase,
        controlhr: data.controlhr ?? 0,
        limitectes: data.limitectes ?? 0,
        cntlimite: data.cntlimite ?? 0,
        impticketasist: data.impticketasist ?? 0,
        activa: data.activa !== undefined ? data.activa : 1,
        cobinsc: data.cobinsc ?? 0,
        prinsc: data.prinsc ?? 0,
        prsem: data.prsem ?? 0,
        prqna: data.prqna ?? 0,
        prmes: data.prmes ?? 0,
        prtrim: data.prtrim ?? 0,
        prstre: data.prstre ?? 0,
        pranual: data.pranual ?? 0,
        descsem: data.descsem ?? 0,
        descqna: data.descqna ?? 0,
        descmes: data.descmes ?? 0,
        desctrim: data.desctrim ?? 0,
        descstre: data.descstre ?? 0,
        descanual: data.descanual ?? 0,
        usunvo: data.usunvo ?? 1,
        fecnvo: sql`NOW()`,
        usumod: data.usumod ?? 1,
        fecmod: sql`NOW()`,
        envia: data.envia ?? 0,
      })
      .executeTakeFirstOrThrow();

    return this.getClassById(Number(result.insertId));
  }

  async updateClass(id: number, data: any) {
    await this.db
      .updateTable('tbclases')
      .set({
        clase: data.clase ?? 0,
        nomclase: data.nomclase,
        controlhr: data.controlhr ?? 0,
        limitectes: data.limitectes ?? 0,
        cntlimite: data.cntlimite ?? 0,
        impticketasist: data.impticketasist ?? 0,
        activa: data.activa !== undefined ? data.activa : 1,
        cobinsc: data.cobinsc ?? 0,
        prinsc: data.prinsc ?? 0,
        prsem: data.prsem ?? 0,
        prqna: data.prqna ?? 0,
        prmes: data.prmes ?? 0,
        prtrim: data.prtrim ?? 0,
        prstre: data.prstre ?? 0,
        pranual: data.pranual ?? 0,
        descsem: data.descsem ?? 0,
        descqna: data.descqna ?? 0,
        descmes: data.descmes ?? 0,
        desctrim: data.desctrim ?? 0,
        descstre: data.descstre ?? 0,
        descanual: data.descanual ?? 0,
        usumod: data.usumod ?? 1,
        fecmod: sql`NOW()`,
        envia: data.envia ?? 0,
      })
      .where('id', '=', id)
      .execute();

    return this.getClassById(id);
  }

  async deleteClass(id: number) {
    await this.db
      .deleteFrom('tbclases')
      .where('id', '=', id)
      .execute();

    return { deleted: true };
  }

  async toggleActive(id: number) {
    await this.db
      .updateTable('tbclases')
      .set({
        activa: sql`NOT activa`,
        usumod: 1,
        fecmod: sql`NOW()`,
      })
      .where('id', '=', id)
      .execute();

    return this.getClassById(id);
  }
}
