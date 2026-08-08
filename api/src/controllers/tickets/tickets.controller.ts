import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ListarTicketsQuery, TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  getTickets(@Query() query: ListarTicketsQuery) {
    return this.ticketsService.getTickets(query);
  }

  @Get('mensualidad/:idmens')
  getTicketMensualidad(@Param('idmens', ParseIntPipe) idmens: number) {
    return this.ticketsService.getTicketMensualidad(idmens);
  }
}
