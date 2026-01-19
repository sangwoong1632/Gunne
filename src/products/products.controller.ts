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
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ProductDocument } from './schemas/product.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { ProductStatusEnum } from './constants/products.constants';

@ApiTags('상품')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * ProductDocument를 ProductResponseDto로 변환
   */
  private toResponseDto(product: ProductDocument): ProductResponseDto {
    const productObject =
      typeof product.toObject === 'function' ? product.toObject() : product;
    const productRecord = productObject as unknown as {
      _id: { toString: () => string } | string;
      title: string;
      price: number;
      status: { status: ProductStatusEnum | string };
      images: string[];
      sellerId: { toString: () => string } | string;
      createdAt?: Date;
      updatedAt?: Date;
    };

    return {
      id:
        typeof productRecord._id === 'string'
          ? productRecord._id
          : productRecord._id.toString(),
      title: productRecord.title,
      price: productRecord.price,
      status: {
        status: productRecord.status.status as ProductStatusEnum,
      },
      images: productRecord.images,
      sellerId:
        typeof productRecord.sellerId === 'string'
          ? productRecord.sellerId
          : productRecord.sellerId.toString(),
      createdAt: productRecord.createdAt,
      updatedAt: productRecord.updatedAt,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '상품 생성',
    description: '새로운 상품을 생성합니다. JWT 토큰 인증이 필요합니다. 판매자 ID는 토큰에서 자동으로 추출됩니다.',
  })
  @ApiBody({
    type: CreateProductDto,
    description: '생성할 상품 정보',
    examples: {
      example1: {
        summary: '기본 상품 생성',
        description: '필수 필드만 포함한 상품 생성 예제',
        value: {
          title: '아이폰 14 Pro',
          price: 1200000,
        },
      },
      example2: {
        summary: '전체 필드 포함 상품 생성',
        description: '모든 필드를 포함한 상품 생성 예제',
        value: {
          title: '아이폰 14 Pro',
          price: 1200000,
          status: {
            status: '판매중',
          },
          images: [
            'https://example.com/image1.jpg',
            'https://example.com/image2.jpg',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '상품 생성 성공',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '인증되지 않은 사용자 - JWT 토큰이 없거나 유효하지 않습니다.',
  })
  @ApiResponse({
    status: 400,
    description: '유효성 검증 실패 - 필수 필드(title, price)가 누락되었거나 형식이 올바르지 않습니다.',
  })
  async create(
    @Body() createProductDto: CreateProductDto,
    @Request() req: Request & { user: UserDocument },
  ): Promise<ProductResponseDto> {
    const createdProduct = await this.productsService.create(
      createProductDto,
      req.user._id.toString(),
    );
    return this.toResponseDto(createdProduct);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '모든 상품 조회',
    description: '등록된 모든 상품을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '상품 목록 조회 성공',
    type: [ProductResponseDto],
  })
  async findAll(): Promise<ProductResponseDto[]> {
    const products = await this.productsService.findAll();
    return products.map((product) => this.toResponseDto(product));
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '상품 조회',
    description: 'ID로 상품 정보를 조회합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '상품 ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: '상품 조회 성공',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '상품을 찾을 수 없음',
  })
  async findOne(@Param('id') id: string): Promise<ProductResponseDto> {
    const product = await this.productsService.findOne(id);
    return this.toResponseDto(product);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '상품 정보 수정',
    description: '상품 정보를 수정합니다. (판매자만 수정 가능)',
  })
  @ApiParam({
    name: 'id',
    description: '상품 ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: '상품 정보 수정 성공',
    type: ProductResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '상품을 찾을 수 없음',
  })
  @ApiResponse({
    status: 401,
    description: '인증되지 않은 사용자 또는 권한 없음',
  })
  @ApiResponse({
    status: 400,
    description: '유효성 검증 실패',
  })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req: Request & { user: UserDocument },
  ): Promise<ProductResponseDto> {
    const updatedProduct = await this.productsService.update(
      id,
      updateProductDto,
      req.user._id.toString(),
    );
    return this.toResponseDto(updatedProduct);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '상품 삭제',
    description: '상품을 삭제합니다. (판매자만 삭제 가능)',
  })
  @ApiParam({
    name: 'id',
    description: '상품 ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 204,
    description: '상품 삭제 성공',
  })
  @ApiResponse({
    status: 404,
    description: '상품을 찾을 수 없음',
  })
  @ApiResponse({
    status: 401,
    description: '인증되지 않은 사용자 또는 권한 없음',
  })
  async remove(
    @Param('id') id: string,
    @Request() req: Request & { user: UserDocument },
  ): Promise<void> {
    await this.productsService.remove(id, req.user._id.toString());
  }
}
