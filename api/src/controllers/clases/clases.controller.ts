import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ClasesService, CreateClaseDto, UpdateClaseDto } from './clases.service';

@Controller('clases')
export class ClasesController {
  constructor(private readonly clasesService: ClasesService) {}

  @Get()
  getAllClases() {
    return this.clasesService.getAllClases();
  }

  @Post()
  createClase(@Body() body: CreateClaseDto) {
    return this.clasesService.createClase(body);
  }

  @Put()
  updateClase(@Body() body: UpdateClaseDto) {
    return this.clasesService.updateClase(body);
  }

}
