import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kysely, MysqlDialect } from 'kysely'
import { createPool, Pool } from 'mysql2'
import { DB } from './database.types';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private db: Kysely<DB>;

  async onModuleInit() {
    
    this.pool = createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT ?? '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });


    this.db = new Kysely<DB>({
      dialect: new MysqlDialect({
        pool: this.pool,
      }),
    });
  }

  async onModuleDestroy() {
    await this.db.destroy();
  }

  getKysely() {
    return this.db;
  }
}