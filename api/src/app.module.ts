import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ClassesModule } from './classes/classes.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    DatabaseModule,
    ClassesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}