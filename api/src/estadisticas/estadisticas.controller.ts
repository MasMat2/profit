import { Controller, Get, Query } from '@nestjs/common';
import { EstadisticasService } from './estadisticas.service';

@Controller('estadisticas')
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @Get('genero')
  getEstadisticaGenero(
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return this.estadisticasService.getEstadisticaGenero(fechaInicio, fechaFin);
  }

  @Get('edades')
  getEstadisticaEdades(
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return this.estadisticasService.getEstadisticaEdades(fechaInicio, fechaFin);
  }

  @Get('paquetes')
  getEstadisticaPaquetes(
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return this.estadisticasService.getEstadisticaPaquetes(fechaInicio, fechaFin);
  }

  @Get('inscripciones')
  getEstadisticaInscripciones(
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return this.estadisticasService.getEstadisticaInscripciones(fechaInicio, fechaFin);
  }

  @Get('saldo')
  getEstadisticaSaldo(
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return this.estadisticasService.getEstadisticaSaldo(fechaInicio, fechaFin);
  }

  @Get('deudas')
  getEstadisticaDeudas() {
    return this.estadisticasService.getEstadisticaDeudas();
  }

  @Get('pagos')
  getEstadisticaPagos(
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return this.estadisticasService.getEstadisticaPagos(fechaInicio, fechaFin);
  }

  @Get('membresias')
  getEstadisticaMembresias() {
    return this.estadisticasService.getEstadisticaMembresias();
  }

  @Get('tipos-clientes')
  getEstadisticaTiposClientes() {
    return this.estadisticasService.getEstadisticaTiposClientes();
  }

  @Get('accesos')
  getEstadisticaAccesos(
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return this.estadisticasService.getEstadisticaAccesos(fechaInicio, fechaFin);
  }

  @Get('tickets-global')
  getTicketsGlobal(
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return this.estadisticasService.getTicketsGlobal(fechaInicio, fechaFin);
  }
}
