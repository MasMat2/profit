import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PrismaService } from '../prisma.service';


@Controller()
export class ClientController {
  constructor(private readonly prismaService: PrismaService) {}


  @Post('api/cliente/agregar')
  create(@Body() clientDto: any) {
    return this.prismaService.clients.create({data: clientDto});
  }

 
  

}
