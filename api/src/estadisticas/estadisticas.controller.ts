import { Controller, Get } from '@nestjs/common';
import { EstadisticasService } from './estadisticas.service';

@Controller('estadisticas')
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @Get('genero')
  getEstadisticaGenero() {
    return this.estadisticasService.getEstadisticaGenero();
  }

  @Get('edades')
  getEstadisticaEdades() {
    return this.estadisticasService.getEstadisticaEdades();
  }

  @Get('paquetes')
  getEstadisticaPaquetes() {
    return this.estadisticasService.getEstadisticaPaquetes();
  }

  @Get('inscripciones')
  getEstadisticaInscripciones() {
    return this.estadisticasService.getEstadisticaInscripciones();
  }

  @Get('saldo')
  getEstadisticaSaldo() {
    return this.estadisticasService.getEstadisticaSaldo();
  }

  @Get('deudas')
  getEstadisticaDeudas() {
    return this.estadisticasService.getEstadisticaDeudas();
  }

  @Get('pagos')
  getEstadisticaPagos() {
    return this.estadisticasService.getEstadisticaPagos();
  }

  @Get('membresias')
  getEstadisticaMembresias() {
    return this.estadisticasService.getEstadisticaMembresias();
  }

  @Get('ingresos')
  getEstadisticaIngresos() {
    return this.estadisticasService.getEstadisticaIngresos();
  }

  @Get('tipos-clientes')
  getEstadisticaTiposClientes() {
    return this.estadisticasService.getEstadisticaTiposClientes();
  }

  @Get('accesos')
  getEstadisticaAccesos() {
    return this.estadisticasService.getEstadisticaAccesos();
  }

  @Get('ventas-diarias')
  getVentasDiarias() {
    return this.estadisticasService.getVentasDiarias();
  }

  @Get('productos-vendidos')
  getProductosMasVendidos() {
    return this.estadisticasService.getProductosMasVendidos();
  }
}
