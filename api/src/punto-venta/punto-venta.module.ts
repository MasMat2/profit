import { Module } from '@nestjs/common';
import { PuntoVentaController } from './punto-venta.controller';
import { PuntoVentaService } from './punto-venta.service';

@Module({
  controllers: [PuntoVentaController],
  providers: [PuntoVentaService],
  exports: [PuntoVentaService]
})
export class PuntoVentaModule {}
