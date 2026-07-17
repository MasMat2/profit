import { Body, Controller, Get, Post } from '@nestjs/common';
import { CajaService } from './caja.service';

@Controller('caja')
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Get('estado')
  getEstado() {
    return this.cajaService.getEstado();
  }

  @Post('abrir')
  abrir() {
    return this.cajaService.abrir();
  }

  @Post('cerrar')
  cerrar(@Body() body: { obs?: string }) {
    return this.cajaService.cerrar(body?.obs);
  }

  @Get('cortes')
  getCortes() {
    return this.cajaService.getCortes();
  }
}
