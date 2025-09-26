import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';



@Controller()
export class ClientController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get('api/cliente/validar-acceso')
  validateAccess(@Query() query: any) {
    return this.prismaService.clients.findUnique({where: {email: query.email, dob: query.dob}});
  }

  @Post('api/cliente/agregar')
  create(@Body() clientDto: any) {
    return this.prismaService.clients.create({data: clientDto});
  }

 
  

}
