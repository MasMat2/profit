import { Controller, Post, Body, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { clave: string; password: string }) {
    return this.authService.login(body.clave, body.password);
  }

  @Get('validate')
  async validate(@Headers('authorization') authHeader: string) {
    if (!authHeader) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    const token = authHeader.replace('Bearer ', '');
    return this.authService.validateToken(token);
  }

  @Get('me')
  async getCurrentUser(@Headers('authorization') authHeader: string) {
    if (!authHeader) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded: any = await this.authService.validateToken(token);
    return this.authService.getUserById(decoded.id);
  }
}
