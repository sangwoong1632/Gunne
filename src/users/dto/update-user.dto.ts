import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    description: '사용자 이메일',
    example: 'user@example.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: '사용자 비밀번호',
    example: 'newPassword123',
    minLength: 8,
  })
  password?: string;

  @ApiPropertyOptional({
    description: '사용자 닉네임',
    example: '수정된닉네임',
  })
  nickname?: string;

  @ApiPropertyOptional({
    description: '사용자 주소',
  })
  address?: {
    city: string;
    district: string;
    street: string;
  };
}
