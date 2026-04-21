import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { SociosService } from './socios.service';

@Controller('api/socios')
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
}
