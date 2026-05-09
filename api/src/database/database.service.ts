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
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      connectTimeout: 60000,
      maxIdle: 10,
      idleTimeout: 60000,
    });

    this.pool.on('error', (err) => {
      console.error('Error inesperado en el pool de conexiones MySQL:', err);
    });

    this.pool.on('connection', (connection) => {
      console.log('Nueva conexión establecida al pool MySQL');
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