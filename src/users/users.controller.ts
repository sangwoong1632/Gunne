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
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@ApiTags('users')
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
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '사용자 생성',
    description: '새로운 사용자를 생성합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '사용자 생성 성공',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: '이미 존재하는 이메일',
  })
  @ApiResponse({
    status: 400,
    description: '유효성 검증 실패',
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const createdUser = await this.usersService.create(createUserDto);
    return this.excludePassword(createdUser);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '사용자 조회',
    description: 'ID로 사용자 정보를 조회합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '사용자 ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 조회 성공',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '사용자를 찾을 수 없음',
  })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const foundUser = await this.usersService.findOne(id);
    return this.excludePassword(foundUser);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '사용자 정보 수정',
    description: '사용자 정보를 수정합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '사용자 ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 정보 수정 성공',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '사용자를 찾을 수 없음',
  })
  @ApiResponse({
    status: 409,
    description: '이미 존재하는 이메일',
  })
  @ApiResponse({
    status: 400,
    description: '유효성 검증 실패',
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const updatedUser = await this.usersService.update(id, updateUserDto);
    return this.excludePassword(updatedUser);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '사용자 삭제',
    description: '사용자 정보를 삭제합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '사용자 ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 204,
    description: '사용자 삭제 성공',
  })
  @ApiResponse({
    status: 404,
    description: '사용자를 찾을 수 없음',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}
