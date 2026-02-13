import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PaymentsService } from '../services/payments.service';


@Controller()
export class ClientController {
  constructor(private readonly prismaService: PrismaService, private readonly paymentsService: PaymentsService) {}

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
      
      const membershipCreated = await this.prismaService.planes_clientes.create({data: plan});

      // Create payment

  
      
      await this.paymentsService.createPayment(
        membershipCreated.id,
        plan.fecha_inicio);

    }
  
    return client;
  }

  @Get('api/cliente/obtener-clientes')
  async obtenerClientes() {

    // obtener fecha_inicio membresia mas reciente con plan en categoria Inscripción
    const clients = await this.prismaService.clients.findMany({
      include: {
        planes_clientes: {
          where: {
            plans: {
              category: {
                id: 4 // Categoria Inscripción TODO: Hacerlo mas robusto
              }
            }
          },
          select: {
            fecha_inicio: true
          },
          orderBy: {
            fecha_inicio: 'desc'
          },
          take: 1  // Only get the most recent one
        }
      },
      orderBy: {
        id: 'desc'
      }
    });

    return clients.map(client => ({
        ...client,
        fecha_inscripcion: client.planes_clientes?.[0]?.fecha_inicio || null,
        planes_clientes: undefined // Remove nested structure
      }));
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
