import { Module } from '@nestjs/common';
import { AccesoClientesController } from './acceso-clientes.controller';
import { AccesoClientesService } from './acceso-clientes.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AccesoClientesController],
  providers: [AccesoClientesService],
})
export class AccesoClientesModule {}
