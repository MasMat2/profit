import { Body, Controller, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { CambiarClaseDto, CreateSocioDto, SociosService, UpdateSocioDto } from './socios.service';

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
}
