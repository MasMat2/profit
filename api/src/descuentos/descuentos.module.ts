import { Module } from '@nestjs/common';
import { DescuentosController } from './descuentos.controller';
import { DescuentosService } from './descuentos.service';

@Module({
  controllers: [DescuentosController],
  providers: [DescuentosService],
  exports: [DescuentosService],
})
export class DescuentosModule {}
