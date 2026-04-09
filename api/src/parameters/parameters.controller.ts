import { Controller, Get, Put, Body } from '@nestjs/common';
import { ParametersService } from './parameters.service';

@Controller('api/parameters')
export class ParametersController {
  constructor(private readonly parametersService: ParametersService) {}

  @Get()
  async getParameters() {
    return this.parametersService.getParameters();
  }

  @Put()
  async updateParameters(@Body() data: any) {
    return this.parametersService.updateParameters(data);
  }
}
