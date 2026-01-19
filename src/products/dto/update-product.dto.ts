import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';
import { ProductStatusEnum } from '../constants/products.constants';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    description: '상품 제목',
    example: '수정된 제목',
  })
  title?: string;

  @ApiPropertyOptional({
    description: '상품 가격',
    example: 1000000,
    minimum: 0,
  })
  price?: number;

  @ApiPropertyOptional({
    description: '상품 상태',
    example: { status: ProductStatusEnum.RESERVED },
    enum: ProductStatusEnum,
  })
  status?: {
    status: ProductStatusEnum;
  };

  @ApiPropertyOptional({
    description: '상품 이미지 URL 배열',
    example: ['https://example.com/image1.jpg'],
    type: [String],
  })
  images?: string[];
}
