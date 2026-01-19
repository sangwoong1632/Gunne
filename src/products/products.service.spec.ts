import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductsService } from './products.service';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductStatusEnum } from './constants/products.constants';

describe('ProductsService', () => {
  let service: ProductsService;

  // Mock ProductModel - 필요한 메서드만 모킹
  const mockProductModel = {
    create: jest.fn<Promise<ProductDocument>, [unknown]>(),
  } as unknown as jest.Mocked<Pick<Model<ProductDocument>, 'create'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new product', async () => {
      // Given: 상품 생성 DTO
      const createProductDto: CreateProductDto = {
        title: '아이폰 14 Pro',
        price: 1200000,
        status: {
          status: ProductStatusEnum.FOR_SALE,
        },
        images: ['https://example.com/image1.jpg'],
      };

      const sellerId = '507f1f77bcf86cd799439011';

      // Given: 생성된 상품 객체 (MongoDB에서 반환될 형태)
      const createdProduct = {
        _id: '507f1f77bcf86cd799439012',
        title: createProductDto.title,
        price: createProductDto.price,
        status: createProductDto.status,
        images: createProductDto.images,
        sellerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Given: 모델의 create 메서드가 생성된 상품을 반환하도록 모킹
      // @ts-expect-error - Mongoose Model.create의 복잡한 타입 때문에 타입 단언 필요
      mockProductModel.create.mockResolvedValue(createdProduct);

      // When: 상품 생성 메서드 호출
      const result = await service.create(createProductDto, sellerId);

      // Then: create 메서드가 호출되었는지 확인
      expect(mockProductModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: createProductDto.title,
          price: createProductDto.price,
          status: createProductDto.status,
          images: createProductDto.images,
          sellerId,
        }),
      );

      // Then: 생성된 상품이 반환되어야 함
      expect(result).toEqual(createdProduct);
    });

    it('should throw error when title is missing', async () => {
      // Given: 제목이 없는 DTO
      const createProductDto = {
        price: 1200000,
        status: {
          status: ProductStatusEnum.FOR_SALE,
        },
      } as CreateProductDto;

      const sellerId = '507f1f77bcf86cd799439011';

      // Given: MongoDB 필수 필드 에러
      const validationError = new Error('Product validation failed: title: Path `title` is required.');
      // @ts-expect-error - Mongoose Model.create의 복잡한 타입 때문에 타입 단언 필요
      mockProductModel.create.mockRejectedValue(validationError);

      // When & Then: 필수 필드 누락으로 인한 에러 발생
      await expect(service.create(createProductDto, sellerId)).rejects.toThrow();
      expect(mockProductModel.create).toHaveBeenCalled();
    });

    it('should throw error when price is missing', async () => {
      // Given: 가격이 없는 DTO
      const createProductDto = {
        title: '아이폰 14 Pro',
        status: {
          status: ProductStatusEnum.FOR_SALE,
        },
      } as CreateProductDto;

      const sellerId = '507f1f77bcf86cd799439011';

      // Given: MongoDB 필수 필드 에러
      const validationError = new Error('Product validation failed: price: Path `price` is required.');
      // @ts-expect-error - Mongoose Model.create의 복잡한 타입 때문에 타입 단언 필요
      mockProductModel.create.mockRejectedValue(validationError);

      // When & Then: 필수 필드 누락으로 인한 에러 발생
      await expect(service.create(createProductDto, sellerId)).rejects.toThrow();
      expect(mockProductModel.create).toHaveBeenCalled();
    });

    it('should handle database connection errors', async () => {
      // Given: 정상적인 DTO
      const createProductDto: CreateProductDto = {
        title: '아이폰 14 Pro',
        price: 1200000,
        status: {
          status: ProductStatusEnum.FOR_SALE,
        },
        images: ['https://example.com/image1.jpg'],
      };

      const sellerId = '507f1f77bcf86cd799439011';

      // Given: 데이터베이스 연결 에러
      const dbError = new Error('Database connection failed');
      // @ts-expect-error - Mongoose Model.create의 복잡한 타입 때문에 타입 단언 필요
      mockProductModel.create.mockRejectedValue(dbError);

      // When & Then: DB 에러가 전파되어야 함
      await expect(service.create(createProductDto, sellerId)).rejects.toThrow(
        'Database connection failed',
      );
      expect(mockProductModel.create).toHaveBeenCalled();
    });

    it('should create product without optional fields (status, images)', async () => {
      // Given: 선택적 필드 없이 상품 생성 (status, images 없음)
      const createProductDto: CreateProductDto = {
        title: '아이폰 14 Pro',
        price: 1200000,
      };

      const sellerId = '507f1f77bcf86cd799439011';

      // Given: 생성된 상품 객체 (기본값이 적용된 형태)
      const createdProduct = {
        _id: '507f1f77bcf86cd799439013',
        title: createProductDto.title,
        price: createProductDto.price,
        status: {
          status: ProductStatusEnum.FOR_SALE, // 기본값
        },
        images: [], // 기본값
        sellerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Given: 모델의 create 메서드가 생성된 상품을 반환하도록 모킹
      // @ts-expect-error - Mongoose Model.create의 복잡한 타입 때문에 타입 단언 필요
      mockProductModel.create.mockResolvedValue(createdProduct);

      // When: 상품 생성
      const result = await service.create(createProductDto, sellerId);

      // Then: 선택적 필드 없이도 생성 가능해야 함
      expect(result).toEqual(createdProduct);
      expect(mockProductModel.create).toHaveBeenCalled();
    });
  });
});
