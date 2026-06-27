import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdministracionModule } from './controllers/administracion/administracion.module';
import { FormasPagoModule } from './controllers/formas-pago/formas-pago.module';
import { ClasesModule } from './controllers/clases/clases.module';

@Module({
  imports: [
    DatabaseModule,
    AdministracionModule,
    FormasPagoModule,
    ClasesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}