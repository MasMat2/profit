import { Body, Controller, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { CambiarClaseDto, CreateSocioDto, PagarMensualidadDto, SociosService, UpdateSocioDto } from './socios.service';

@Controller('socios')
export class SociosController {
  constructor(private readonly sociosService: SociosService) {}

  @Get()
  getAllSocios() {
    return this.sociosService.getAllSocios();
  }

  @Get(':id')
  getSocioById(@Param('id', ParseIntPipe) id: number) {
    return this.sociosService.getSocioById(id);
  }

  @Post()
  createSocio(@Body() body: CreateSocioDto) {
    return this.sociosService.createSocio(body);
  }

  @Put(':id')
  updateSocio(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateSocioDto) {
    return this.sociosService.updateSocio(id, body);
  }

  @Post(':id/cambiar-clase')
  cambiarClase(@Param('id', ParseIntPipe) id: number, @Body() body: CambiarClaseDto) {
    return this.sociosService.cambiarClase(id, body);
  }

  @Get(':id/mensualidades')
  getMensualidades(@Param('id', ParseIntPipe) id: number) {
    return this.sociosService.getMensualidades(id);
  }

  @Get(':id/logs')
  getLogs(@Param('id', ParseIntPipe) id: number) {
    return this.sociosService.getLogs(id);
  }

  @Post(':id/pagar-mensualidad')
  pagarMensualidad(@Param('id', ParseIntPipe) id: number, @Body() body: PagarMensualidadDto) {
    return this.sociosService.pagarMensualidad(id, body);
  }
}
