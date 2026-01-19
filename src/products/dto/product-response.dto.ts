import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatusEnum } from '../constants/products.constants';

class ProductStatusResponseDto {
  @ApiProperty({
    description: '상품 상태',
    example: ProductStatusEnum.FOR_SALE,
    enum: ProductStatusEnum,
  })
  status: ProductStatusEnum;
}

export class ProductResponseDto {
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

  @ApiProperty({
    description: '상품 상태',
    type: ProductStatusResponseDto,
  })
  status: ProductStatusResponseDto;

  @ApiProperty({
    description: '상품 이미지 URL 배열',
    example: ['https://example.com/image1.jpg'],
    type: [String],
  })
  images: string[];

  @ApiProperty({
    description: '판매자 ID',
    example: '507f1f77bcf86cd799439011',
  })
  sellerId: string;

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
