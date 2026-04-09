import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';

@Controller('api/payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  async getAllPaymentMethods() {
    return this.paymentMethodsService.getAllPaymentMethods();
  }

  @Get(':id')
  async getPaymentMethodById(@Param('id') id: string) {
    return this.paymentMethodsService.getPaymentMethodById(parseInt(id));
  }

  @Post()
  async createPaymentMethod(@Body() data: any) {
    return this.paymentMethodsService.createPaymentMethod(data);
  }

  @Put(':id')
  async updatePaymentMethod(@Param('id') id: string, @Body() data: any) {
    return this.paymentMethodsService.updatePaymentMethod(parseInt(id), data);
  }

  @Delete(':id')
  async deletePaymentMethod(@Param('id') id: string) {
    return this.paymentMethodsService.deletePaymentMethod(parseInt(id));
  }
}
