import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdministracionModule } from './administracion/administracion.module';
import { PuntoVentaModule } from './punto-venta/punto-venta.module';
import { RegistroTicketsModule } from './registro-tickets/registro-tickets.module';

@Module({
  imports: [
    DatabaseModule,
    AdministracionModule,
    PuntoVentaModule,
    RegistroTicketsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}