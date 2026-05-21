import { Controller, Get, Put, Body } from '@nestjs/common';
import { AdministracionService, UpdateParametrosDto } from './administracion.service';

@Controller('administracion')
export class AdministracionController {
  constructor(private readonly administracionService: AdministracionService) {}

  @Get('parametros')
  getParametros() {
    return this.administracionService.getParametros();
  }

  @Put('parametros')
  updateParametros(
    @Body() dto: UpdateParametrosDto,
  ) {
    return this.administracionService.updateParametros(dto);
  }
}
