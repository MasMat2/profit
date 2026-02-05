import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface User {
  id?: number;
  usuario: string;
  nombre: string;
  puesto: string;
  email: string;
  telefono?: string | null;
  pc?: string | null;
  rol?: string | null;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export interface CreateUserDto {
  usuario: string;
  nombre: string;
  puesto: string;
  email: string;
  telefono?: string | null;
  pc?: string | null;
  rol?: string | null;
}

export interface UpdateUserDto {
  usuario?: string;
  nombre?: string;
  puesto?: string;
  email?: string;
  telefono?: string | null;
  pc?: string | null;
  rol?: string | null;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getUsers(): Promise<User[]> {
    const users = await this.prisma.users.findMany({
      orderBy: { created_at: 'desc' }
    });
    return users as User[];
  }

  async getUserById(id: number): Promise<User | null> {
    const user = await this.prisma.users.findUnique({
      where: { id }
    });
    return user as User | null;
  }

  async searchUsers(term: string): Promise<User[]> {
    const users = await this.prisma.users.findMany({
      where: {
        OR: [
          { usuario: { contains: term, mode: 'insensitive' } },
          { nombre: { contains: term, mode: 'insensitive' } },
          { puesto: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } }
        ]
      },
      orderBy: { created_at: 'desc' }
    });
    return users as User[];
  }

  async createUser(data: CreateUserDto): Promise<User> {
    const user = await this.prisma.users.create({
      data: {
        ...data,
        id: undefined,
      }
    });
    return user as User;
  }

  async updateUser(id: number, data: UpdateUserDto): Promise<User> {
    const user = await this.prisma.users.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date(),
      }
    });
    return user as User;
  }

  async deleteUser(id: number): Promise<User> {
    const user = await this.prisma.users.delete({
      where: { id }
    });
    return user as User;
  }
}