import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { CategoryController } from './controllers/category.controller';
import { PlansController } from './controllers/plans.controller';
import { ClientController } from './controllers/client.controller';
import { PaymentsController } from './controllers/payments.controller';
import { MembershipsController } from './controllers/memberships.controller';
import { BusinessInfoController } from './controllers/business-info.controller';
import { BusinessInfoService } from './services/business-info.service';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [CategoryController, PlansController, ClientController, PaymentsController, MembershipsController, BusinessInfoController, UsersController],
  providers: [PrismaService, BusinessInfoService, UsersService],
})
export class AppModule {}
