import { Module } from '@nestjs/common';
import { RegistroTicketsController } from './registro-tickets.controller';
import { RegistroTicketsService } from './registro-tickets.service';

@Module({
  controllers: [RegistroTicketsController],
  providers: [RegistroTicketsService],
  exports: [RegistroTicketsService]
})
export class RegistroTicketsModule {}
