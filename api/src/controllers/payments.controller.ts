import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PaymentsService } from '../services/payments.service';


@Controller()
export class PaymentsController {
  constructor(private readonly prismaService: PrismaService, private readonly paymentsService: PaymentsService) {}


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

  @Post('api/payment/guardarPago')
  async guardarPago(@Body() paymentInfo: any) {
    // consultar ultimo pago del plan
    // asignar fecha de pago y metodo de pago
    const pago = await this.prismaService.pagos.findFirst({
      where: {
        planes_clientes_id: paymentInfo.membership_id,
        pago_fecha: null
      }
    });

    if (pago) {
      pago.pago_fecha = new Date();
      pago.metodo_pago_id = paymentInfo.method;
      await this.prismaService.pagos.update({
        where: {
          id: pago.id
        },
        data: pago
      });

      // Si es mensual, crear el pago siguiente
      const membership = await this.prismaService.planes_clientes.findUnique({
        where: { id: pago.planes_clientes_id },
        include: {
          plans: true
        }
      });

      if(membership?.plans.monthly_payment) {

        const fecha_inicio = new Date(pago.periodo_fin);
        fecha_inicio.setDate(fecha_inicio.getDate() + 1);

        await this.paymentsService.createPayment(
          pago.planes_clientes_id,
          fecha_inicio
        );
      }


    }

    return;
    
  }


  @Get('api/payment/consultarMetodosPago')
  consultarMetodosPago() {
    return this.prismaService.metodos_pago.findMany();
  }

}
