import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductListResponseDto {
  @ApiProperty({
    description: '상품 ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: '상품 제목',
    example: '아이폰 14 Pro',
  })
  title: string;

  @ApiProperty({
    description: '상품 가격',
    example: 1200000,
  })
  price: number;

  @ApiPropertyOptional({
    description: '상품 대표 이미지 (이미지 배열의 첫 번째 이미지)',
    example: 'https://example.com/image1.jpg',
  })
  image?: string;
}
