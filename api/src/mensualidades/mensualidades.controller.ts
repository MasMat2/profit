import { Controller, Get, Param, Query, Post, Body, Put } from '@nestjs/common';
import { MensualidadesService } from './mensualidades.service';

@Controller('mensualidades')
export class MensualidadesController {
  constructor(private readonly mensualidadesService: MensualidadesService) {}

  @Get('socio/:socioId')
  async getMensualidadesBySocio(
    @Param('socioId') socioId: string,
    @Query('pagado') pagado?: string,
    @Query('cancelado') cancelado?: string,
    @Query('generarFuturas') generarFuturas?: string
  ) {
    // Si se solicita generar mensualidades futuras, hacerlo primero
    if (generarFuturas === '1') {
      await this.mensualidadesService.generarMensualidadesFuturas(+socioId);
    }
    return this.mensualidadesService.getMensualidadesBySocio(+socioId, pagado, cancelado);
  }

  @Get(':id')
  async getMensualidadById(@Param('id') id: string) {
    return this.mensualidadesService.getMensualidadById(+id);
  }

  @Post('cobrar')
  async cobrarMensualidad(@Body() cobroData: {
    idMens: number;
    formaPago: number;
    descuento: number;
    referencia: string;
    motivoDescuento: string;
    usuarioId: number;
  }) {
    return this.mensualidadesService.cobrarMensualidad(cobroData);
  }

  @Put(':id/fecha')
  async actualizarFechaMensualidad(
    @Param('id') id: string,
    @Body() data: {
      fecha: string;
      usuarioId: number;
    }
  ) {
    return this.mensualidadesService.actualizarFechaMensualidad(+id, data.fecha, data.usuarioId);
  }
}
