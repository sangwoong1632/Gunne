import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    description: '액세스 토큰',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJpYXQiOjE2MDAwMDAwMDB9.example',
  })
  accessToken: string;

  @ApiProperty({
    description: '리프레시 토큰',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJpYXQiOjE2MDAwMDAwMDB9.refresh',
  })
  refreshToken: string;

  @ApiProperty({
    description: '사용자 정보',
    example: {
      id: '507f1f77bcf86cd799439011',
      email: 'user@example.com',
      nickname: '테스트유저',
    },
  })
  user: {
    id: string;
    email: string;
    nickname: string;
  };
}
