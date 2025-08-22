import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule {}
