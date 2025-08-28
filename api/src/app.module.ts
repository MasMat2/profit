import { Module } from '@nestjs/common';
import { CategoryController } from './controllers/category.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { PlansController } from './controllers/plans.controller';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [CategoryController, PlansController],
  providers: [PrismaService],
})
export class AppModule {}
