import {
  Controller,
  Get,
  Header,
  Post,
  Param,
  ParseIntPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AsistenciaService } from './asistencia.service';
import { ApiKeyGuard } from '../../common/api-key.guard';

/**
 * Hasta dónde llega el cuerpo de una respuesta de huellas. El kiosco la guarda y la devuelve en
 * `?marca=` del siguiente sondeo de cambios. Va en un header para que el cuerpo siga siendo
 * sólo líneas `socio,base64` y un acceso-service viejo lo lea igual que siempre.
 */
const HEADER_MARCA = 'X-Huellas-Marca';

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
  async listarHuellas(
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const { marca, cuerpo } = await this.asistenciaService.listarHuellas();
    res.setHeader(HEADER_MARCA, marca);
    return cuerpo;
  }

  /**
   * Sólo los socios cuyas huellas cambiaron desde la marca recibida, con todas sus huellas y el
   * mismo formato que arriba. Cuerpo vacío si no cambió nada, que es lo normal: el kiosco lo
   * pide cada pocos segundos.
   */
  @Get('huellas/cambios')
  @UseGuards(ApiKeyGuard)
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async listarCambiosHuellas(
    @Query('marca') marca: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const { marca: nueva, cuerpo } =
      await this.asistenciaService.listarCambiosHuellas(marca);
    res.setHeader(HEADER_MARCA, nueva);
    return cuerpo;
  }

  /**
   * Sólo socios dados de baja, mismo formato que arriba. El acceso-service la usa como segunda
   * pasada de `Identify` cuando la primera (contra activos) no encuentra nada, para poder avisar
   * `Socio inactivo` en vez de "huella no reconocida" sin que estas plantillas compitan con las
   * de un socio al corriente. Sin marca: ver {@link AsistenciaService.listarHuellasInactivas}.
   */
  @Get('huellas/inactivas')
  @UseGuards(ApiKeyGuard)
  @Header('Content-Type', 'text/plain; charset=utf-8')
  listarHuellasInactivas(): Promise<string> {
    return this.asistenciaService.listarHuellasInactivas();
  }
}
