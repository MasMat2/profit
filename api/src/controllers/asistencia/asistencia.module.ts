import { Module } from '@nestjs/common';
import { AsistenciaController } from './asistencia.controller';
import { AsistenciaService } from './asistencia.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AsistenciaController],
  providers: [AsistenciaService],
})
export class AsistenciaModule {}
