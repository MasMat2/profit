import { Body, Controller, Get, Post } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prismaService: PrismaService) {}


  @Get('api/category')
  category() {
    return this.prismaService.category.findMany();
  }


  @Post('api/category/create')
  create(@Body() createDto: any) {
    return this.prismaService.category.create({data: createDto});
  }
}
