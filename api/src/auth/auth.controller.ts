import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { clave?: string; usuario?: string; identifier?: string; password?: string }) {
    return this.authService.login({
      identifier: (body.clave ?? body.usuario ?? body.identifier) as any,
      password: body.password,
    });
  }
}
