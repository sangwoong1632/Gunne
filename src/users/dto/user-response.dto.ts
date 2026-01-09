import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Types } from 'mongoose';

// 비밀번호를 제외한 사용자 응답 DTO
export class UserResponseDto {
  @ApiProperty({
    description: '사용자 ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: Types.ObjectId | string;

  @ApiProperty({
    description: '사용자 이메일',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: '사용자 닉네임',
    example: '홍길동',
  })
  nickname: string;

  @ApiPropertyOptional({
    description: '사용자 주소',
    example: {
      city: '서울시',
      district: '강남구',
      street: '역삼동',
    },
  })
  address?: {
    city: string;
    district: string;
    street: string;
  };

  @ApiProperty({
    description: '찜한 상품 목록',
    example: [],
    type: [String],
  })
  wishList: Types.ObjectId[] | string[];

  @ApiProperty({
    description: '매너온도',
    example: 36.5,
  })
  mannerTemperature: number;

  @ApiProperty({
    description: '사용자 역할',
    example: 'user',
    enum: ['user', 'admin'],
  })
  role: string;

  @ApiPropertyOptional({
    description: '생성일',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt?: Date;

  @ApiPropertyOptional({
    description: '수정일',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt?: Date;
}
