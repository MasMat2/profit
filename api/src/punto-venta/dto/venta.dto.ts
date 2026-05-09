export class VentaDto {
  clienteId?: number;
  productos: VentaProductoDto[];
  formaPago: string;
  total: number;
  descuento?: number;
  abonado?: number;
  cambio?: number;
  referencia?: string;
  comentarios?: string;
}

export class VentaProductoDto {
  productoId: number;
  cantidad: number;
  precio: number;
  subtotal: number;
}
