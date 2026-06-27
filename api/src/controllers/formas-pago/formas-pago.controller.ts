import { Controller, Get, Put, Post, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { FormasPagoService, CreateFormaPagoDto, UpdateFormaPagoDto } from './formas-pago.service';

@Controller('formas-pago')
export class FormasPagoController {
  constructor(private readonly formasPagoService: FormasPagoService) {}

  @Get()
  getFormasPago() {
    return this.formasPagoService.getFormasPago();
  }

  @Post()
  createFormaPago(@Body() dto: CreateFormaPagoDto) {
    return this.formasPagoService.createFormaPago(dto);
  }

  @Put(':id')
  updateFormaPago(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFormaPagoDto,
  ) {
    return this.formasPagoService.updateFormaPago(id, dto);
  }

  @Delete(':id')
  deleteFormaPago(@Param('id', ParseIntPipe) id: number) {
    return this.formasPagoService.deleteFormaPago(id);
  }
}
