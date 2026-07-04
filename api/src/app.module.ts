import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AdministracionModule } from './controllers/administracion/administracion.module';
import { FormasPagoModule } from './controllers/formas-pago/formas-pago.module';
import { ClasesModule } from './controllers/clases/clases.module';
import { AsistenciaModule } from './controllers/asistencia/asistencia.module';
import { SociosModule } from './controllers/socios/socios.module';

@Module({
  imports: [
    DatabaseModule,
    AdministracionModule,
    FormasPagoModule,
    ClasesModule,
    AsistenciaModule,
    SociosModule,
  ],
})
export class AppModule {}