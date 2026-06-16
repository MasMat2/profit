export class CobrarMensualidadDto {
  idmens: number;
  monto: number;
  formaPago: string;
  formaPagoId?: number | null;
  referencia?: string;
  comentarios?: string;
}
