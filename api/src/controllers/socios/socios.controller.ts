import { Controller, Get } from '@nestjs/common';
import { SociosService } from './socios.service';

@Controller('socios')
export class SociosController {
  constructor(private readonly sociosService: SociosService) {}

  @Get()
  getAllSocios() {
    return this.sociosService.getAllSocios();
  }
}
