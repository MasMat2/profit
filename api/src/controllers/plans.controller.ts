import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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

  @Post('api/plan/editar')
  update(@Body() updateDto: any) {
    return this.prismaService.plans.update({where: {id: updateDto.id}, data: updateDto});
  }

  @Get('api/plan/eliminar/:id')
  delete(@Param('id') id: string) {
    return this.prismaService.plans.delete({where: {id: Number(id)}});
  }

  @Get('api/plan/consultarPorCliente')
  consultarPorCliente(@Query() query: any) {
    return this.prismaService.planes_clientes.findMany({
      where: {client_id: Number(query.client_id)},
      include: {
        plans: true
      }
    });
  }

}
