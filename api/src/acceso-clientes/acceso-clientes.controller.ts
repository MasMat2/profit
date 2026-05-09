import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { AccesoClientesService } from './acceso-clientes.service';

@Controller('acceso-clientes')
export class AccesoClientesController {
  constructor(private readonly accesoClientesService: AccesoClientesService) {}

  @Post('verificar-huella')
  async verificarHuella(@Body() body: { huella: string }) {
    const cliente = await this.accesoClientesService.verificarHuella(body.huella);
    
    if (!cliente) {
      return {
        success: false,
        message: 'Socio no encontrado'
      };
    }

    const asistencia = await this.accesoClientesService.registrarAsistencia(cliente.id);
    
    return {
      success: true,
      message: 'Acceso permitido',
      cliente,
      asistencia
    };
  }

  @Get('cliente/:id')
  async buscarCliente(@Param('id') id: string) {
    const cliente = await this.accesoClientesService.buscarClientePorId(parseInt(id));
    
    if (!cliente) {
      return {
        success: false,
        message: 'Socio no encontrado'
      };
    }

    return {
      success: true,
      cliente
    };
  }
}
