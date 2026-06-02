import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { AsistenciaService } from './asistencia.service';

@Controller('asistencia')
export class AsistenciaController {
  constructor(private readonly asistenciaService: AsistenciaService) {}

  @Get('socio/:id')
  getSocioAcceso(@Param('id', ParseIntPipe) id: number) {
    return this.asistenciaService.getSocioAcceso(id);
  }
}
