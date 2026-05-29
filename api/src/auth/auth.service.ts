import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.getKysely();
  }

  async login(body: { identifier?: string; password?: string }) {
    const identifier = (body.identifier ?? '').trim();
    const password = body.password ?? '';

    if (!identifier || !password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const user = await this.db
      .selectFrom('tbusuarios')
      .select([
        'id',
        'usuario',
        'nombre',
        'email',
        'clave',
        'psw',
        'admin',
        'activo',
      ])
      .where('activo', '=', 1)
      .where(eb =>
        eb.or([
          eb('clave', '=', identifier),
          eb('email', '=', identifier),
        ]),
      )
      .executeTakeFirst();

    if (!user) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const stored = user.psw ?? '';

    const ok = stored.startsWith('$2')
      ? bcrypt.compareSync(password, stored)
      : password === stored;

    if (!ok) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
    const expiresIn = process.env.JWT_EXPIRES_IN || '8h';

    const token = jwt.sign(
      {
        sub: user.id,
        usuario: user.usuario,
        nombre: user.nombre,
        email: user.email,
        admin: user.admin,
      },
      secret,
      { expiresIn },
    );

    return {
      token,
      user: {
        id: user.id,
        usuario: user.usuario,
        nombre: user.nombre,
        email: user.email,
        admin: user.admin,
      },
    };
  }
}
