import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ClassesModule } from './classes/classes.module';
import { SociosModule } from './socios/socios.module';
import { MensualidadesModule } from './mensualidades/mensualidades.module';
import { DescuentosModule } from './descuentos/descuentos.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdministracionModule } from './administracion/administracion.module';
import { FormasPagoModule } from './formas-pago/formas-pago.module';
import { PuntoVentaModule } from './punto-venta/punto-venta.module';
import { RegistroTicketsModule } from './registro-tickets/registro-tickets.module';
import { EstadisticasModule } from './estadisticas/estadisticas.module';
import { AccesoClientesModule } from './acceso-clientes/acceso-clientes.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    AdministracionModule,
    FormasPagoModule,
    ClassesModule,
    SociosModule,
    MensualidadesModule,
    DescuentosModule,
    PuntoVentaModule,
    RegistroTicketsModule,
    AccesoClientesModule,
    EstadisticasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}