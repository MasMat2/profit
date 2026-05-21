import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Categoria {
  id: number;
  nombre: string;
  color?: string;
}

export interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  categoriaId: number;
  imagen?: string;
}

export interface Cliente {
  id: number;
  nombre: string;
  apellido?: string;
  nombreCompleto?: string;
}

export interface ItemVenta {
  producto: Producto;
  cantidad: number;
  subtotal: number;
}

export interface VentaDTO {
  clienteId?: number;
  productos: {
    productoId: number;
    cantidad: number;
    precio: number;
    subtotal: number;
  }[];
  formaPago: string;
  total: number;
  descuento: number;
  abonado: number;
  cambio: number;
  referencia?: string;
  comentarios?: string;
}

export interface CategoriaDTO {
  nomcategoria: string;
  color?: string;
  enpantalla: number;
}

export interface ProductoDTO {
  nomproducto: string;
  categoria: number;
  venta: number;
  existencia: number;
  costo: number;
  foto?: string;
  enpantalla: number;
}

@Injectable({
  providedIn: 'root'
})
export class PuntoVentaService {
  private apiUrl = '/punto-venta';

  constructor(private http: HttpClient) {}

  getCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.apiUrl}/categorias`);
  }

  createCategoria(dto: CategoriaDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}/categorias`, dto);
  }

  deleteCategoria(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/categorias/${id}`);
  }

  getProductos(categoriaId?: number): Observable<Producto[]> {
    const url = categoriaId 
      ? `${this.apiUrl}/productos?categoria=${categoriaId}`
      : `${this.apiUrl}/productos`;
    return this.http.get<Producto[]>(url);
  }

  createProducto(dto: ProductoDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}/productos`, dto);
  }

  updateProducto(id: number, dto: Partial<ProductoDTO>): Observable<any> {
    return this.http.put(`${this.apiUrl}/productos/${id}`, dto);
  }

  deleteProducto(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/productos/${id}`);
  }

  getClientes(busqueda?: string): Observable<Cliente[]> {
    const url = busqueda
      ? `${this.apiUrl}/clientes?busqueda=${encodeURIComponent(busqueda)}`
      : `${this.apiUrl}/clientes`;
    return this.http.get<Cliente[]>(url);
  }

  registrarVenta(venta: VentaDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}/ventas`, venta);
  }
}
