import { Module } from '@nestjs/common';
import { FormaspagoController } from './formaspago.controller';
import { FormaspagoService } from './formaspago.service';

@Module({
  controllers: [FormaspagoController],
  providers: [FormaspagoService],
  exports: [FormaspagoService],
})
export class FormaspagoModule {}
