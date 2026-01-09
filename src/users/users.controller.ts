import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * UserDocument에서 비밀번호를 제외한 UserResponseDto로 변환
   * Mongoose 문서인 경우 toObject() 사용, 일반 객체인 경우 그대로 사용
   */
  private excludePassword(user: any): UserResponseDto {
    const userObject =
      typeof user.toObject === 'function' ? user.toObject() : user;
    const { password, ...userResponse } = userObject;
    return userResponse as unknown as UserResponseDto;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED) // 201 Created 상태 코드 명시
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const createdUser = await this.usersService.create(createUserDto);
    return this.excludePassword(createdUser);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const foundUser = await this.usersService.findOne(id);
    return this.excludePassword(foundUser);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
