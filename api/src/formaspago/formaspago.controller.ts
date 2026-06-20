import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { FormaspagoService } from './formaspago.service';

@Controller('formaspago')
export class FormaspagoController {
  constructor(private readonly formaspagoService: FormaspagoService) {}

  @Get()
  async getFormasPago() {
    return this.formaspagoService.getFormasPago();
  }

  @Get('exportar')
  async exportarFormasPago(@Res() res: Response) {
    try {
      const exportData = await this.formaspagoService.exportarFormasPago();
      
      // Convertir datos a CSV
      const csvContent = this.convertToCSV(exportData.datos);
      
      // Configurar headers para descarga
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${exportData.nombreArchivo}"`);
      
      // Enviar el archivo CSV
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ message: 'Error al exportar formas de pago', error: error.message });
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    // Obtener headers
    const headers = Object.keys(data[0]);
    
    // Crear CSV
    const csvRows = [
      headers.join(','), // Headers
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escapar comillas y envolver en comillas si contiene comas o comillas
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  }
}
