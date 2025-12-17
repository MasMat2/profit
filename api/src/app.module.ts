import { Module } from '@nestjs/common';
import { CategoryController } from './controllers/category.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { PlansController } from './controllers/plans.controller';
import { ClientController } from './controllers/client.controller';
import { PaymentsController } from './controllers/payments.controller';
import { MembershipsController } from './controllers/memberships.controller';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [CategoryController, PlansController, ClientController, PaymentsController, MembershipsController],
  providers: [PrismaService],
})
export class AppModule {}
