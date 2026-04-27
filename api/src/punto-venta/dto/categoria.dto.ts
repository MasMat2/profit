export class CategoriaDto {
  id: number;
  nombre: string;
  descripcion?: string;
  icono?: string;
}

export class CrearCategoriaDto {
  nomcategoria: string;
  color?: string;
  enpantalla?: number;
  fotocat?: string;
}
