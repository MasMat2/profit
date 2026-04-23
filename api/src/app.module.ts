import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { SociosModule } from './socios/socios.module';
import { MensualidadesModule } from './mensualidades/mensualidades.module';
import { DescuentosModule } from './descuentos/descuentos.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    DatabaseModule,
    SociosModule,
    MensualidadesModule,
    DescuentosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}