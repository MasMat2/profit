export class ProductoDto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
  categoriaId: number;
  imagen?: string;
}

export class CrearProductoDto {
  nomproducto: string;
  categoria: number;
  venta: number;
  existencia?: number;
  costo?: number;
  foto?: string;
  enpantalla?: number;
}
