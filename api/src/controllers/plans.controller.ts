import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PrismaService } from '../prisma.service';


@Controller()
export class PlansController {
  constructor(private readonly prismaService: PrismaService) {}


  @Get('api/plan')
  plan() {
    return this.prismaService.plans.findMany();
  } 

  @Post('api/plan/agregar')
  create(@Body() planDto: any) {
    return this.prismaService.plans.create({data: planDto});
  }

}
