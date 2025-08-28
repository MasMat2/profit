import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PrismaService } from '../prisma.service';


@Controller()
export class CategoryController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get('api/category')
  category() {
    return this.prismaService.category.findMany();
  }


  @Post('api/category/agregar')
  create(@Body() createDto: any) {
    return this.prismaService.category.create({data: createDto});
  }

  @Post('api/category/editar')
  update(@Body() updateDto: any) {
    return this.prismaService.category.update({where: {id: updateDto.id}, data: updateDto});
  }

  @Get('api/category/eliminar/:id')
  delete(@Param('id') id: string) {
    return this.prismaService.category.delete({where: {id: Number(id)}});
  }

}
