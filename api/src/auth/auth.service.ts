import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuthService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.getKysely();
  }

  async login(clave: string, password: string) {
    const usuario = await this.db
      .selectFrom('tbusuarios')
      .selectAll()
      .where('clave', '=', clave)
      .where('activo', '=', 1)
      .executeTakeFirst();

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = usuario.psw === password;

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const token = Buffer.from(JSON.stringify({
      id: usuario.id,
      usuario: usuario.usuario,
      clave: usuario.clave,
      nombre: usuario.nombre,
      admin: usuario.admin,
      timestamp: Date.now(),
    })).toString('base64');

    return {
      token,
      user: {
        id: usuario.id,
        usuario: usuario.usuario,
        clave: usuario.clave,
        nombre: usuario.nombre,
        email: usuario.email,
        admin: usuario.admin,
        perfil: usuario.perfil,
        foto: usuario.foto,
      }
    };
  }

  async validateToken(token: string) {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      return decoded;
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }

  async getUserById(id: number) {
    const usuario = await this.db
      .selectFrom('tbusuarios')
      .select(['id', 'usuario', 'clave', 'nombre', 'email', 'admin', 'perfil', 'foto'])
      .where('id', '=', id)
      .where('activo', '=', 1)
      .executeTakeFirst();

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return usuario;
  }
}
