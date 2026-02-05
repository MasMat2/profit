import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { DateUtils } from "../utils/date.utils";

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}
  
  async createPayment(
    membershipId: number,
    fechaInicio: Date) {
        
        const membership = await this.prisma.planes_clientes.findFirst({
            where: {
                id: membershipId,
            }
        });

        if (!membership) {
            throw new Error(`Membership with id ${membershipId} not found`);
        }

        const plan = await this.prisma.plans.findFirst({
            where: {
                id: membership.plan_id,
            }
        });

        if (!plan) {
            throw new Error(`Plan with id ${membership.plan_id} not found`);
        } 
               
        const nombre_mes = DateUtils.getMonthName(fechaInicio);
        const año = fechaInicio.getFullYear();
        const concepto = `Mensualidad ${nombre_mes} ${año} - ${plan.name}`;
        const fecha_inicio = new Date(fechaInicio);
        const fecha_fin = new Date(fechaInicio);
        if (plan.monthly_payment) {
            // add 31 days
            fecha_fin.setMonth(fecha_fin.getMonth() + 1);
        } else {
            fecha_fin.setDate(fecha_fin.getDate() + plan.duration);
        }

        await this.prisma.pagos.create({data: {
            planes_clientes_id: membershipId,
            pago_fecha: null,
            concepto: concepto,
            periodo_inicio: fecha_inicio,
            periodo_fin: fecha_fin,
            cantidad: plan.price,
            metodo_pago_id: null,
        }});
    
  }
}