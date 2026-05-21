import { Body, Controller, Get, Put } from '@nestjs/common';
import { ClasesService, UpdateClaseDto } from './clases.service';

@Controller('clases')
export class ClasesController {
  constructor(private readonly clasesService: ClasesService) {}

  @Get()
  getAllClases() {
    return this.clasesService.getAllClases();
  }

  @Put()
  updateClase(@Body() body: UpdateClaseDto) {
    return this.clasesService.updateClase(body);
  }

}
