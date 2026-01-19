import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductDocument } from './schemas/product.schema';
import { ERROR_MESSAGES } from './constants/products.constants';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  /**
   * MongoDB 에러를 NestJS 예외로 변환
   */
  private handleMongoError(error: Error & { code?: number }): never {
    throw error;
  }

  /**
   * 상품 생성
   * @param createProductDto 상품 생성 DTO
   * @param sellerId 판매자 ID
   * @returns 생성된 상품 문서
   */
  async create(
    createProductDto: CreateProductDto,
    sellerId: string,
  ): Promise<ProductDocument> {
    // DTO에서 유효성 검증이 완료된 상태로 도달
    try {
      // 상품 생성 데이터 준비
      // 기본값(status, images)은 스키마에서 자동으로 설정됨
      const productData = {
        ...createProductDto,
        sellerId,
      };

      // 상품 생성
      const createdProduct = await this.productModel.create(productData);
      return createdProduct;
    } catch (error) {
      // MongoDB 에러 처리
      this.handleMongoError(error as Error & { code?: number });
    }
  }

  /**
   * 모든 상품 조회
   * @returns 상품 문서 배열
   */
  async findAll(): Promise<ProductDocument[]> {
    return await this.productModel.find().exec();
  }

  /**
   * ID로 상품 조회
   * @param id 상품 ID
   * @returns 상품 문서
   * @throws NotFoundException 상품을 찾을 수 없을 경우
   */
  async findOne(id: string): Promise<ProductDocument> {
    // 1. ID로 상품 조회
    const product = await this.productModel.findById(id).exec();

    // 2. 상품이 존재하지 않으면 예외 발생
    if (!product) {
      throw new NotFoundException(ERROR_MESSAGES.PRODUCT_NOT_FOUND);
    }

    // 3. 조회된 상품 반환
    return product;
  }

  /**
   * 판매자 ID로 상품 조회
   * @param sellerId 판매자 ID
   * @returns 상품 문서 배열
   */
  async findBySellerId(sellerId: string): Promise<ProductDocument[]> {
    return await this.productModel.find({ sellerId }).exec();
  }

  /**
   * 상품 정보 수정
   * @param id 상품 ID
   * @param updateProductDto 수정할 상품 정보
   * @param userId 요청한 사용자 ID (권한 확인용)
   * @returns 수정된 상품 문서
   * @throws NotFoundException 상품을 찾을 수 없을 경우
   * @throws UnauthorizedException 권한이 없을 경우
   */
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    userId: string,
  ): Promise<ProductDocument> {
    try {
      // 상품 조회
      const product = await this.productModel.findById(id).exec();

      if (!product) {
        throw new NotFoundException(ERROR_MESSAGES.PRODUCT_NOT_FOUND);
      }

      // 권한 확인 (판매자만 수정 가능)
      if (product.sellerId.toString() !== userId) {
        throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED);
      }

      // 상품 정보 수정
      const updatedProduct = await this.productModel
        .findByIdAndUpdate(id, updateProductDto, { new: true })
        .exec();

      if (!updatedProduct) {
        throw new NotFoundException(ERROR_MESSAGES.PRODUCT_NOT_FOUND);
      }

      return updatedProduct;
    } catch (error) {
      // NotFoundException과 UnauthorizedException은 그대로 전파
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      // MongoDB 에러 처리
      this.handleMongoError(error as Error & { code?: number });
    }
  }

  /**
   * 상품 삭제
   * @param id 상품 ID
   * @param userId 요청한 사용자 ID (권한 확인용)
   * @throws NotFoundException 상품을 찾을 수 없을 경우
   * @throws UnauthorizedException 권한이 없을 경우
   */
  async remove(id: string, userId: string): Promise<void> {
    // 상품 조회
    const product = await this.productModel.findById(id).exec();

    if (!product) {
      throw new NotFoundException(ERROR_MESSAGES.PRODUCT_NOT_FOUND);
    }

    // 권한 확인 (판매자만 삭제 가능)
    if (product.sellerId.toString() !== userId) {
      throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED);
    }

    await this.productModel.findByIdAndDelete(id).exec();
  }
}
