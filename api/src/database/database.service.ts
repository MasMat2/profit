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
      // El default de mysql2 es utf8mb4, que no existe antes de MySQL 5.5.3. La base local de
      // sucursal es 5.1.40, así que el handshake tiene que pedir utf8 — que además es lo que
      // hace BDK en cada conexión (`SET NAMES utf8`). Las columnas son latin1; para texto BMP
      // la conversión es idéntica, y `CAST(huella AS BINARY)` no depende del charset.
      charset: 'utf8',
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