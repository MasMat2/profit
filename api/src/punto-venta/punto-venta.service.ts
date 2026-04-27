import { Injectable } from '@nestjs/common';
import { CategoriaDto, CrearCategoriaDto } from './dto/categoria.dto';
import { ProductoDto, CrearProductoDto } from './dto/producto.dto';
import { VentaDto } from './dto/venta.dto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PuntoVentaService {
  constructor(private readonly db: DatabaseService) {}
  private iconosPorDefecto: { [key: string]: string} = {
    'suplementos': 'fas fa-capsules',
    'bebidas': 'fas fa-bottle-water',
    'accesorios': 'fas fa-dumbbell',
    'snacks': 'fas fa-cookie-bite',
    'ropa': 'fas fa-tshirt',
    'default': 'fas fa-box'
  };

  private ventas: VentaDto[] = [];

  async getCategorias(): Promise<CategoriaDto[]> {
    const categorias = await this.db.getKysely()
      .selectFrom('tbcategorias')
      .select(['id', 'nomcategoria', 'categoria', 'fotocat'])
      .where('enpantalla', '=', 1)
      .execute();

    return categorias.map(cat => ({
      id: cat.id,
      nombre: cat.nomcategoria,
      icono: this.obtenerIcono(cat.nomcategoria.toLowerCase()),
      descripcion: ''
    }));
  }

  async crearCategoria(dto: CrearCategoriaDto): Promise<{ success: boolean; id: number }> {
    try {
      const maxCat = await this.db.getKysely()
        .selectFrom('tbcategorias')
        .select(({ fn }) => fn.max('categoria').as('maxcat'))
        .executeTakeFirst();

      const nuevaCategoria = (maxCat?.maxcat ? Number(maxCat.maxcat) : 0) + 1;

      const result = await this.db.getKysely()
        .insertInto('tbcategorias')
        .values({
          categoria: nuevaCategoria,
          nomcategoria: dto.nomcategoria,
          color: dto.color || '#F97316',
          enpantalla: dto.enpantalla ?? 1,
          principal: 0,
          fotocat: dto.fotocat || '',
          envia: 0,
          fecnvo: new Date(),
          fecmod: new Date(),
          usumod: 1,
          usunvo: 1
        })
        .executeTakeFirstOrThrow();

      return {
        success: true,
        id: Number(result.insertId)
      };
    } catch (error) {
      console.error('Error al crear categoría:', error);
      throw error;
    }
  }

  async getProductosPorCategoria(categoriaId: number): Promise<ProductoDto[]> {
    const productos = await this.db.getKysely()
      .selectFrom('tbproductos')
      .select(['id', 'nomproducto', 'categoria', 'venta', 'existencia', 'foto', 'activo'])
      .where('activo', '=', 1)
      .where('categoria', '=', categoriaId)
      .where('enpantalla', '=', 1)
      .execute();

    return productos.map(prod => ({
      id: prod.id,
      nombre: prod.nomproducto,
      precio: Number(prod.venta),
      stock: Number(prod.existencia),
      categoriaId: prod.categoria,
      imagen: prod.foto || '📦'
    }));
  }

  async getTodosLosProductos(): Promise<ProductoDto[]> {
    const productos = await this.db.getKysely()
      .selectFrom('tbproductos')
      .select(['id', 'nomproducto', 'categoria', 'venta', 'existencia', 'foto', 'activo'])
      .where('activo', '=', 1)
      .where('enpantalla', '=', 1)
      .execute();

    return productos.map(prod => ({
      id: prod.id,
      nombre: prod.nomproducto,
      precio: Number(prod.venta),
      stock: Number(prod.existencia),
      categoriaId: prod.categoria,
      imagen: prod.foto || '📦'
    }));
  }

  async crearProducto(dto: CrearProductoDto): Promise<{ success: boolean; id: number }> {
    try {
      const maxProd = await this.db.getKysely()
        .selectFrom('tbproductos')
        .select(({ fn }) => fn.max('producto').as('maxprod'))
        .executeTakeFirst();

      const nuevoProducto = (maxProd?.maxprod ? Number(maxProd.maxprod) : 0) + 1;

      const result = await this.db.getKysely()
        .insertInto('tbproductos')
        .values({
          producto: nuevoProducto,
          nomproducto: dto.nomproducto,
          categoria: dto.categoria,
          venta: dto.venta,
          costo: dto.costo || 0,
          existencia: dto.existencia || 0,
          foto: dto.foto || '',
          enpantalla: dto.enpantalla ?? 1,
          activo: 1,
          geniva: 0,
          combo: 0,
          almacen: 1,
          pantalla: 0,
          posicion: 0,
          visitas: 0,
          paqvisitas: 0,
          plazocred: 0,
          minimo: 0,
          maximo: 0,
          exinicorte: 0,
          porcieps: 0,
          unidad: 1,
          codigob: '',
          cveprodserv: '',
          envia: 0,
          fecnvo: new Date(),
          fecmod: new Date(),
          usumod: 1,
          usunvo: 1
        })
        .executeTakeFirstOrThrow();

      return {
        success: true,
        id: Number(result.insertId)
      };
    } catch (error) {
      console.error('Error al crear producto:', error);
      throw error;
    }
  }

  async getClientes(): Promise<Array<{ id: number; nombreCompleto: string }>> {
    try {
      const socios = await this.db.getKysely()
        .selectFrom('tbsocios')
        .select(['id', 'nomsocio', 'activo'])
        .where('activo', '=', 1)
        .orderBy('nomsocio', 'asc')
        .limit(100)
        .execute();

      console.log(`Clientes encontrados: ${socios.length}`);

      return socios.map(socio => ({
        id: socio.id,
        nombreCompleto: socio.nomsocio
      }));
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      throw error;
    }
  }

  private obtenerIcono(categoria: string): string {
    for (const [key, value] of Object.entries(this.iconosPorDefecto)) {
      if (categoria.includes(key)) {
        return value;
      }
    }
    return this.iconosPorDefecto.default;
  }

  async registrarVenta(venta: VentaDto): Promise<{ success: boolean; ventaId: number; mensaje: string; clienteNombre?: string }> {
    const ventaId = this.ventas.length + 1;
    this.ventas.push({ ...venta });

    // Actualizar stock de productos en la base de datos
    for (const item of venta.productos) {
      const { sql } = await import('kysely');
      await this.db.getKysely()
        .updateTable('tbproductos')
        .set({
          existencia: sql`existencia - ${item.cantidad}`
        })
        .where('id', '=', item.productoId)
        .execute();
    }

    // Obtener nombre del cliente si existe
    let clienteNombre: string | undefined;
    if (venta.clienteId) {
      const cliente = await this.db.getKysely()
        .selectFrom('tbsocios')
        .select('nomsocio')
        .where('id', '=', venta.clienteId)
        .executeTakeFirst();
      
      clienteNombre = cliente?.nomsocio;
    }

    return {
      success: true,
      ventaId,
      mensaje: 'Venta registrada exitosamente',
      clienteNombre
    };
  }

  getVentas(): VentaDto[] {
    return this.ventas;
  }
}
