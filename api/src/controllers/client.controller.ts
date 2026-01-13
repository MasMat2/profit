import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';



@Controller()
export class ClientController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get('api/cliente/consultar')
  consultarCliente(@Query() query: any) {
    return this.prismaService.clients.findUnique({where: {email: query.email}});
  }

  @Get('api/cliente/validar-acceso')
  validateAccess(@Query() query: any) {
    return this.prismaService.clients.findUnique({where: {email: query.email, dob: query.dob}});
  }

  @Post('api/cliente/agregar')
  async create(@Body() clientDto: any) {
    const client = await this.prismaService.clients.create({data: clientDto.client});
  
    for (const plan of clientDto.plans) {

  
      plan.client_id = client.id;
      plan.fecha_inicio = new Date(plan.fecha_inicio);
      
      const planCreated = await this.prismaService.planes_clientes.create({data: plan});


      // Create payment

      // Fetch the plan details to get the duration
      const planDetails = await this.prismaService.plans.findUnique({
        where: { id: plan.plan_id }
      });
  
      if (!planDetails) {
        throw new Error(`Plan with id ${plan.plan_id} not found`);
      }
      
      const mesesEspañol = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const nombre_mes = mesesEspañol[plan.fecha_inicio.getMonth()];
      const año = plan.fecha_inicio.getFullYear();
      const concepto = `Mensualidad ${nombre_mes} ${año} - ${planDetails.name}`;
      const fecha_inicio = new Date(plan.fecha_inicio);
      const fecha_fin = new Date(plan.fecha_inicio);
      if (planDetails.monthly_payment) {
        // add 1 month
        fecha_fin.setMonth(fecha_fin.getMonth() + 1);
      } else {
        fecha_fin.setDate(fecha_fin.getDate() + planDetails.duration);
      }

      await this.prismaService.pagos.create({data: {
        planes_clientes_id: planCreated.id,
        pago_fecha: null,
        concepto: concepto,
        periodo_inicio: fecha_inicio,
        periodo_fin: fecha_fin,
        cantidad: planDetails.price,
        metodo_pago_id: null,
      }});


    }
  
    return client;
  }

  @Get('api/cliente/obtener-clientes')
  obtenerClientes() {
    return this.prismaService.clients.findMany();
  }

  @Put('api/cliente/update')
  actualizarCliente(@Body() clientDto: any) {

    clientDto.dob = new Date(clientDto.dob);
    
    var updatedClient = this.prismaService.clients.update({
      where: { id: clientDto.id },
      data: clientDto
    });

    return updatedClient;
  }
 
  

}
