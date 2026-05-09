import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ClassesModule } from './classes/classes.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdministracionModule } from './administracion/administracion.module';
import { FormasPagoModule } from './formas-pago/formas-pago.module';

@Module({
  imports: [
    DatabaseModule,
    AdministracionModule,
    FormasPagoModule,
    ClassesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}