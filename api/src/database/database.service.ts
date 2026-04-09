import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import { Kysely, MysqlDialect } from 'kysely'
import { createPool } from 'mysql2'

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private connection: mysql.Connection;
  private dialect: MysqlDialect;

  async onModuleInit() {
    this.connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT ?? '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    // this.dialect = new MysqlDialect({
    //   pool: createPool({
    //     database: process.env.DB_NAME,
    //     host: process.env.DB_HOST || 'localhost',
    //     user: process.env.DB_USER,
    //     password: process.env.DB_PASSWORD,
    //     port: parseInt(process.env.DB_PORT ?? '3306'),
    //     connectionLimit: 10,
    //   })
    // })

    // const db = new Kysely<Database>({
    //   dialect: this.dialect,
    // })
  }

  async onModuleDestroy() {
    await this.connection.end();
  }

  async query(sql: string, params?: any[]) {
    const [rows] = await this.connection.query(sql, params);
    return rows;
  }

  getConnection() {
    return this.connection;
  }
}