import { Controller, Get } from '@nestjs/common';
import { RegistroTicketsService } from './registro-tickets.service';

@Controller('registro-tickets')
export class RegistroTicketsController {
  constructor(private readonly registroTicketsService: RegistroTicketsService) {}

  @Get('mensualidades')
  getMensualidades() {
    return this.registroTicketsService.getMensualidades();
  }

  @Get('tickets')
  getTickets() {
    return this.registroTicketsService.getTickets();
  }
}
