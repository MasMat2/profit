import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { SociosService } from './socios.service';

@Controller('socios')
export class SociosController {
  constructor(private readonly sociosService: SociosService) {}

  @Get()
  async getAllSocios(
    @Query('search') search?: string,
    @Query('estatus') estatus?: string,
    @Query('becado') becado?: string
  ) {
    return this.sociosService.getAllSocios(search, estatus, becado);
  }

  @Get(':id')
  async getSocioById(@Param('id') id: string) {
    return this.sociosService.getSocioById(+id);
  }

  @Post()
  async createSocio(@Body() data: any) {
    return this.sociosService.createSocio(data);
  }

  @Put(':id')
  async updateSocio(@Param('id') id: string, @Body() data: any) {
    return this.sociosService.updateSocio(+id, data);
  }

  @Delete(':id')
  async deleteSocio(@Param('id') id: string) {
    return this.sociosService.deleteSocio(+id);
  }

  @Get(':id/huella')
  async getHuellaBySocio(@Param('id') id: string) {
    return this.sociosService.getHuellaBySocio(+id);
  }

  @Post(':id/huella')
  async guardarHuella(@Param('id') id: string, @Body() huellaData: any) {
    return this.sociosService.guardarHuella(+id, huellaData);
  }

  @Delete(':id/huella')
  async eliminarHuella(@Param('id') id: string) {
    return this.sociosService.eliminarHuella(+id);
  }

  @Post(':socioId/reactivar')
  async reactivarSocio(
    @Param('socioId') socioId: string,
    @Body('usuarioId') usuarioId: number,
    @Body('claseId') claseId?: number
  ) {
    console.log(`🎯 Controller recibido - socioId: ${socioId}, usuarioId: ${usuarioId}, claseId: ${claseId}`);
    console.log(`🎯 Body completo:`, { usuarioId, claseId });
    return this.sociosService.reactivarSocio(+socioId, usuarioId, claseId);
  }

  @Post(':socioId/baja')
  async darDeBajaSocio(
    @Param('socioId') socioId: string,
    @Body('usuarioId') usuarioId: number
  ) {
    return this.sociosService.darDeBajaSocio(+socioId, usuarioId);
  }

  @Put(':socioId/cambiar-clase')
  async cambiarClaseSocio(
    @Param('socioId') socioId: string,
    @Body() data: { 
      usuarioId: number; 
      nuevaClaseId: number;
      nuevoImporte: number;
    }
  ) {
    return this.sociosService.cambiarClaseSocio(+socioId, data.usuarioId, data.nuevaClaseId, data.nuevoImporte);
  }

  @Get(':socioId/logs')
  async getLogsBySocio(@Param('socioId') socioId: string) {
    return this.sociosService.getLogsBySocio(+socioId);
  }
}
