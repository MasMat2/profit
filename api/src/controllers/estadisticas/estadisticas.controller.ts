import { Controller, Get, Query } from '@nestjs/common';
import {
  EstadisticasService,
  PeriodoQuery,
  RangoQuery,
  SociosQuery,
} from './estadisticas.service';

@Controller('estadisticas')
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @Get('genero')
  getGenero(@Query() query: SociosQuery) {
    return this.estadisticasService.getGenero(query);
  }

  @Get('ingresos')
  getIngresos(@Query() query: PeriodoQuery) {
    return this.estadisticasService.getIngresos(query);
  }

  @Get('altas-bajas')
  getAltasBajas(@Query() query: PeriodoQuery) {
    return this.estadisticasService.getAltasBajas(query);
  }

  @Get('socios-por-clase')
  getSociosPorClase(@Query() query: SociosQuery) {
    return this.estadisticasService.getSociosPorClase(query);
  }

  @Get('formas-pago')
  getFormasPago(@Query() query: RangoQuery) {
    return this.estadisticasService.getFormasPago(query);
  }

  @Get('adeudos')
  getAdeudos() {
    return this.estadisticasService.getAdeudos();
  }

  @Get('asistencias')
  getAsistencias(@Query() query: RangoQuery) {
    return this.estadisticasService.getAsistencias(query);
  }
}
