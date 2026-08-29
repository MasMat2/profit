import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Protege los endpoints que consume el servicio de acceso del kiosco.
 *
 * El kiosco no tiene sesión de usuario, así que se autentica con una llave compartida
 * (ACCESO_API_KEY) en el header x-acceso-key.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.ACCESO_API_KEY;

    if (!expected) {
      this.logger.error(
        'ACCESO_API_KEY no está configurada; se rechaza la petición.',
      );
      throw new UnauthorizedException();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header('x-acceso-key');

    if (provided !== expected) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
