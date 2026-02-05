import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { UsersService, User, CreateUserDto, UpdateUserDto } from '../services/users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getUsers() {
    try {
      const users = await this.usersService.getUsers();
      return users;
    } catch (error) {
      throw new HttpException('Error al obtener usuarios', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    try {
      const userId = parseInt(id);
      const user = await this.usersService.getUserById(userId);
      if (!user) {
        throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
      }
      return user;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error al obtener usuario', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('search/:term')
  async searchUsers(@Param('term') term: string) {
    try {
      const users = await this.usersService.searchUsers(term);
      return users;
    } catch (error) {
      throw new HttpException('Error al buscar usuarios', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  async createUser(@Body() data: CreateUserDto) {
    try {
      const user = await this.usersService.createUser(data);
      return user;
    } catch (error) {
      throw new HttpException('Error al crear usuario', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() data: UpdateUserDto) {
    try {
      const userId = parseInt(id);
      const user = await this.usersService.updateUser(userId, data);
      return user;
    } catch (error) {
      throw new HttpException('Error al actualizar usuario', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    try {
      const userId = parseInt(id);
      const user = await this.usersService.deleteUser(userId);
      return user;
    } catch (error) {
      throw new HttpException('Error al eliminar usuario', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}