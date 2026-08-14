import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { DatabaseModule } from '../../database/database.module';
import { FormasPagoModule } from '../formas-pago/formas-pago.module';

@Module({
  imports: [DatabaseModule, FormasPagoModule],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
