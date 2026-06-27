import { Module } from '@nestjs/common';
import { FormasPagoService } from './formas-pago.service';
import { DatabaseModule } from '../../database/database.module';
import { FormasPagoController } from './formas-pago.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [FormasPagoController],
  providers: [FormasPagoService],
})
export class FormasPagoModule {}

