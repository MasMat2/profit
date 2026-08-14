import { Module } from '@nestjs/common';
import { EstadisticasController } from './estadisticas.controller';
import { EstadisticasService } from './estadisticas.service';
import { DatabaseModule } from '../../database/database.module';
import { FormasPagoModule } from '../formas-pago/formas-pago.module';

@Module({
  imports: [DatabaseModule, FormasPagoModule],
  controllers: [EstadisticasController],
  providers: [EstadisticasService],
})
export class EstadisticasModule {}
