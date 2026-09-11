import { Controller, Post, Param, ParseIntPipe } from '@nestjs/common';
import { AsistenciaService } from './asistencia.service';

@Controller('asistencia')
export class AsistenciaController {
  constructor(private readonly asistenciaService: AsistenciaService) {}

  @Post('acceso/:id')
  registrarAcceso(@Param('id', ParseIntPipe) id: number) {
    return this.asistenciaService.registrarAcceso(id);
  }
}
