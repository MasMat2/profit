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
  async create(@Body() clientDto: any) {
    const client = await this.prismaService.clients.create({data: clientDto.client});
  
    for (const plan of clientDto.plans) {
      // Fetch the plan details to get the duration
      const planDetails = await this.prismaService.plans.findUnique({
        where: { id: plan.plan_id }
      });
  
      if (!planDetails) {
        throw new Error(`Plan with id ${plan.plan_id} not found`);
      }
  
      plan.client_id = client.id;
      plan.fecha_inicio = new Date(plan.fecha_inicio);
  
      await this.prismaService.planes_clientes.create({data: plan});
    }
  
    return client;
  }

  @Get('api/cliente/obtener-clientes')
  obtenerClientes() {
    return this.prismaService.clients.findMany();
  }
 
  

}
