import { Module } from '@nestjs/common';
import { RegistroTicketsController } from './registro-tickets.controller';
import { RegistroTicketsService } from './registro-tickets.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [RegistroTicketsController],
  providers: [RegistroTicketsService],
  exports: [RegistroTicketsService]
})
export class RegistroTicketsModule {}
