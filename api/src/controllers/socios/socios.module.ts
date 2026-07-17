import { Module } from '@nestjs/common';
import { SociosController } from './socios.controller';
import { SociosService } from './socios.service';
import { DatabaseModule } from '../../database/database.module';
import { CajaModule } from '../caja/caja.module';

@Module({
  imports: [DatabaseModule, CajaModule],
  controllers: [SociosController],
  providers: [SociosService],
})
export class SociosModule {}
