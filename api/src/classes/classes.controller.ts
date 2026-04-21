import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ClassesService } from './classes.service';

@Controller('api/classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  async getAllClasses() {
    return this.classesService.getAllClasses();
  }

  @Get('active')
  async getActiveClasses() {
    return this.classesService.getActiveClasses();
  }

  @Get(':id')
  async getClassById(@Param('id') id: string) {
    return this.classesService.getClassById(+id);
  }

  @Post()
  async createClass(@Body() data: any) {
    return this.classesService.createClass(data);
  }

  @Put(':id')
  async updateClass(@Param('id') id: string, @Body() data: any) {
    return this.classesService.updateClass(+id, data);
  }

  @Delete(':id')
  async deleteClass(@Param('id') id: string) {
    return this.classesService.deleteClass(+id);
  }

  @Put(':id/toggle-active')
  async toggleActive(@Param('id') id: string) {
    return this.classesService.toggleActive(+id);
  }
}
