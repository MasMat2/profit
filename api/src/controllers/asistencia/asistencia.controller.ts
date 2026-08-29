import {
  Controller,
  Get,
  Header,
  Post,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AsistenciaService } from './asistencia.service';
import { ApiKeyGuard } from '../../common/api-key.guard';

@Controller('asistencia')
export class AsistenciaController {
  constructor(private readonly asistenciaService: AsistenciaService) {}

  @Post('acceso/:id')
  registrarAcceso(@Param('id', ParseIntPipe) id: number) {
    return this.asistenciaService.registrarAcceso(id);
  }

  /**
   * Templates de huella para el acceso-service del kiosco: texto plano, una línea por huella
   * (`socio,base64`). El Content-Type explícito es necesario porque Nest devuelve text/html
   * por defecto cuando el handler retorna un string.
   *
   * Son datos biométricos: va protegido por llave compartida (x-acceso-key) porque el kiosco
   * no tiene sesión de usuario.
   */
  @Get('huellas')
  @UseGuards(ApiKeyGuard)
  @Header('Content-Type', 'text/plain; charset=utf-8')
  listarHuellas() {
    return this.asistenciaService.listarHuellas();
  }
}
