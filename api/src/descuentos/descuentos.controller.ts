import { Controller, Get, Param, Query } from '@nestjs/common';
import { DescuentosService } from './descuentos.service';

@Controller('api/descuentos')
export class DescuentosController {
  constructor(private readonly descuentosService: DescuentosService) {}

  @Get('socio/:socioId')
  async getDescuentosBySocio(
    @Param('socioId') socioId: string,
    @Query('cancelado') cancelado?: string
  ) {
    return this.descuentosService.getDescuentosBySocio(+socioId, cancelado);
  }

  @Get(':id')
  async getDescuentoById(@Param('id') id: string) {
    return this.descuentosService.getDescuentoById(+id);
  }
}
