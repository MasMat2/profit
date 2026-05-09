import { Module } from '@nestjs/common';
import { MensualidadesController } from './mensualidades.controller';
import { MensualidadesService } from './mensualidades.service';

@Module({
  controllers: [MensualidadesController],
  providers: [MensualidadesService],
  exports: [MensualidadesService],
})
export class MensualidadesModule {}
