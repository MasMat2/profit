import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { RegistroTicketsService } from './registro-tickets.service';
import { CobrarMensualidadDto } from './dto/cobrar-mensualidad.dto';

@Controller('registro-tickets')
export class RegistroTicketsController {
  constructor(private readonly registroTicketsService: RegistroTicketsService) {}

  @Get('mensualidades')
  getMensualidades(@Query('busqueda') busqueda?: string) {
    return this.registroTicketsService.getMensualidades(busqueda);
  }

  @Get('tickets')
  getTickets(@Query('busqueda') busqueda?: string) {
    return this.registroTicketsService.getTickets(busqueda);
  }

  @Post('cobrar-mensualidad')
  cobrarMensualidad(@Body() cobrarDto: CobrarMensualidadDto) {
    return this.registroTicketsService.cobrarMensualidad(cobrarDto);
  }
}
