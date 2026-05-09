import { Controller, Get, Post, Body, Param, Delete, Query, Put } from '@nestjs/common';
import { PuntoVentaService } from './punto-venta.service';
import { VentaDto } from './dto/venta.dto';
import { CrearCategoriaDto } from './dto/categoria.dto';
import { CrearProductoDto } from './dto/producto.dto';

@Controller('punto-venta')
export class PuntoVentaController {
  constructor(private readonly puntoVentaService: PuntoVentaService) {}

  @Get('categorias')
  getCategorias() {
    return this.puntoVentaService.getCategorias();
  }

  @Post('categorias')
  crearCategoria(@Body() dto: CrearCategoriaDto) {
    return this.puntoVentaService.crearCategoria(dto);
  }

  @Delete('categorias/:id')
  eliminarCategoria(@Param('id') id: string) {
    return this.puntoVentaService.eliminarCategoria(+id);
  }

  @Get('productos')
  getTodosLosProductos() {
    return this.puntoVentaService.getTodosLosProductos();
  }

  @Get('productos/categoria/:categoriaId')
  getProductosPorCategoria(@Param('categoriaId') categoriaId: string) {
    return this.puntoVentaService.getProductosPorCategoria(+categoriaId);
  }

  @Post('productos')
  crearProducto(@Body() dto: CrearProductoDto) {
    return this.puntoVentaService.crearProducto(dto);
  }

  @Put('productos/:id')
  actualizarProducto(@Param('id') id: string, @Body() dto: CrearProductoDto) {
    return this.puntoVentaService.actualizarProducto(+id, dto);
  }

  @Delete('productos/:id')
  eliminarProducto(@Param('id') id: string) {
    return this.puntoVentaService.eliminarProducto(+id);
  }

  @Get('clientes')
  getClientes(@Query('busqueda') busqueda?: string) {
    return this.puntoVentaService.getClientes(busqueda);
  }

  @Post('ventas')
  registrarVenta(@Body() venta: VentaDto) {
    return this.puntoVentaService.registrarVenta(venta);
  }

  @Get('ventas')
  getVentas() {
    return this.puntoVentaService.getVentas();
  }
}
