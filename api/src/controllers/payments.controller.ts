import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';


@Controller()
export class PaymentsController {
  constructor(private readonly prismaService: PrismaService) {}


  @Get('api/payment/consultarPorCliente')
  consultarPorCliente(@Query() query: any) {
    return this.prismaService.pagos.findMany({
      where: {
        planes_clientes: {
          client_id: Number(query.client_id)
        }
      },
      include: {
        planes_clientes: {
          include: {
            plans: true
          }
        }, 
        metodos_pago: {
          select: {
            metodo: true
          }
        }
      },
      orderBy: {
        id: 'desc'
      }
    });
  }


  @Get('api/payment/consultarMetodosPago')
  consultarMetodosPago() {
    return this.prismaService.metodos_pago.findMany();
  }

}
