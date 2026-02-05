import { Controller, Get, Put, Body, HttpException, HttpStatus } from '@nestjs/common';
import { BusinessInfoService, BusinessInfo } from '../services/business-info.service';

@Controller('business-info')
export class BusinessInfoController {
  constructor(private readonly businessInfoService: BusinessInfoService) {}

  @Get()
  async getBusinessInfo() {
    try {
      const info = await this.businessInfoService.getBusinessInfo();
      return info;
    } catch (error) {
      throw new HttpException('Error al obtener información del negocio', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put()
  async updateBusinessInfo(@Body() data: Partial<BusinessInfo>) {
    try {
      const updatedInfo = await this.businessInfoService.updateBusinessInfo(data);
      return updatedInfo;
    } catch (error) {
      throw new HttpException('Error al actualizar información del negocio', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
