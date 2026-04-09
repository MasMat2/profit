import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ParametersModule } from './parameters/parameters.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    DatabaseModule,
    ParametersModule,
    PaymentMethodsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}