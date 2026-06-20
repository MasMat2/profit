import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { MensualidadesService } from './mensualidades.service';

@Controller('mensualidades')
export class MensualidadesController {
  constructor(private readonly mensualidadesService: MensualidadesService) {}

  @Get('socio/:socioId')
  async getMensualidadesBySocio(
    @Param('socioId') socioId: string,
    @Query('pagado') pagado?: string,
    @Query('cancelado') cancelado?: string
  ) {
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
}
