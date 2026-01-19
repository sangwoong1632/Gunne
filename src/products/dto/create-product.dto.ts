import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatusEnum } from '../constants/products.constants';

class ProductStatusDto {
  @ApiPropertyOptional({
    description: '상품 상태',
    example: ProductStatusEnum.FOR_SALE,
    enum: ProductStatusEnum,
  })
  @IsOptional()
  @IsEnum(ProductStatusEnum, {
    message: '상품 상태는 판매중, 예약중, 판매완료 중 하나여야 합니다.',
  })
  status?: ProductStatusEnum;
}

export class CreateProductDto {
  @ApiProperty({
    description: '상품 제목',
    example: '아이폰 14 Pro',
  })
  @IsString()
  @IsNotEmpty({ message: '제목은 필수입니다.' })
  title: string;

  @ApiProperty({
    description: '상품 가격',
    example: 1200000,
    minimum: 0,
  })
  @IsNumber({}, { message: '가격은 숫자여야 합니다.' })
  @Min(0, { message: '가격은 0 이상이어야 합니다.' })
  @IsNotEmpty({ message: '가격은 필수입니다.' })
  price: number;

  @ApiPropertyOptional({
    description: '상품 상태',
    type: ProductStatusDto,
    default: { status: '판매중' },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductStatusDto)
  status?: ProductStatusDto;

  @ApiPropertyOptional({
    description: '상품 이미지 URL 배열',
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
