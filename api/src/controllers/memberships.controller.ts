import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';


@Controller()
export class MembershipsController {
  constructor(private readonly prismaService: PrismaService) {}


  @Get('api/membership/consultarPorCliente')
  consultarPorCliente(@Query() query: any) {
    return this.prismaService.planes_clientes.findMany({
      where: {client_id: Number(query.client_id)},
      include: {
        plans: true
      }
    });
  }

}
