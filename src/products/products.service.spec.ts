import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Query } from 'mongoose';
import { ProductsService } from './products.service';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductStatusEnum } from './constants/products.constants';

describe('ProductsService', () => {
  let service: ProductsService;

  // Mock ProductModel - 필요한 메서드만 모킹
  const mockProductModel = {
    create: jest.fn<Promise<ProductDocument>, [unknown]>(),
    find: jest.fn(),
    findById: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<Model<ProductDocument>, 'create' | 'find' | 'findById'>
  >;

  /**
   * Mock Mongoose Query의 반환값을 생성하는 헬퍼 함수
   * Mongoose의 복잡한 타입을 처리하기 위한 헬퍼
   * @param document 상품 문서 또는 null (일반 객체도 허용)
   * @param shouldReject 에러를 발생시킬지 여부 (기본값: false)
   * @param error 에러 객체 또는 에러 형태의 객체 (shouldReject가 true일 때 사용)
   * @returns Mock Query 객체
   */
  const createMockQueryResult = (
    document: ProductDocument | null | Record<string, unknown>,
    shouldReject = false,
    error?: Error | Record<string, unknown>,
  ): Query<ProductDocument | null, ProductDocument> => {
    const execMock = shouldReject && error
      ? jest.fn().mockRejectedValue(error)
      : jest.fn().mockResolvedValue(document as ProductDocument | null);
    
    return {
      exec: execMock,
    } as unknown as Query<ProductDocument | null, ProductDocument>;
  };

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
  });

  describe('findAll', () => {
    it('should return all products', async () => {
      // Given: 여러 상품 데이터
      const products = [
        {
          _id: '507f1f77bcf86cd799439011',
          title: '아이폰 14 Pro',
          price: 1200000,
          status: {
            status: ProductStatusEnum.FOR_SALE,
          },
          images: ['https://example.com/image1.jpg'],
          sellerId: '507f1f77bcf86cd799439010',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: '507f1f77bcf86cd799439012',
          title: '갤럭시 S23',
          price: 1000000,
          status: {
            status: ProductStatusEnum.FOR_SALE,
          },
          images: ['https://example.com/image2.jpg'],
          sellerId: '507f1f77bcf86cd799439013',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Given: find 메서드가 상품 배열을 반환하도록 모킹
      mockProductModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(products),
      } as unknown as Query<ProductDocument[], ProductDocument>);

      // When: 모든 상품 조회
      const result = await service.findAll();

      // Then: find 메서드가 호출되었는지 확인
      expect(mockProductModel.find).toHaveBeenCalled();
      expect(mockProductModel.find).toHaveBeenCalledTimes(1);

      // Then: 모든 상품이 반환되어야 함
      expect(result).toEqual(products);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no products exist', async () => {
      // Given: 상품이 없는 경우
      const emptyProducts: ProductDocument[] = [];

      // Given: find 메서드가 빈 배열을 반환하도록 모킹
      mockProductModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(emptyProducts),
      } as unknown as Query<ProductDocument[], ProductDocument>);

      // When: 모든 상품 조회
      const result = await service.findAll();

      // Then: find 메서드가 호출되었는지 확인
      expect(mockProductModel.find).toHaveBeenCalled();
      expect(mockProductModel.find).toHaveBeenCalledTimes(1);

      // Then: 빈 배열이 반환되어야 함
      expect(result).toEqual(emptyProducts);
      expect(result).toHaveLength(0);
    });

    it('should handle database connection errors', async () => {
      // Given: 데이터베이스 연결 에러
      const dbError = new Error('Database connection failed');
      mockProductModel.find.mockReturnValue({
        exec: jest.fn().mockRejectedValue(dbError),
      } as unknown as Query<ProductDocument[], ProductDocument>);

      // When & Then: DB 에러가 전파되어야 함
      await expect(service.findAll()).rejects.toThrow(
        'Database connection failed',
      );
      expect(mockProductModel.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      // Given: 상품 ID
      const productId = '507f1f77bcf86cd799439011';
      const product = {
        _id: productId,
        title: '아이폰 14 Pro',
        price: 1200000,
        status: {
          status: ProductStatusEnum.FOR_SALE,
        },
        images: ['https://example.com/image1.jpg'],
        sellerId: '507f1f77bcf86cd799439010',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Given: findById가 상품을 반환하도록 모킹
      mockProductModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(product),
      } as unknown as Query<ProductDocument | null, ProductDocument>);

      // When: ID로 상품 조회
      const result = await service.findOne(productId);

      // Then: findById가 올바른 ID로 호출되었는지 확인
      expect(mockProductModel.findById).toHaveBeenCalledWith(productId);
      expect(mockProductModel.findById).toHaveBeenCalledTimes(1);

      // Then: 조회된 상품이 반환되어야 함
      expect(result).toEqual(product);
    });

    it('should throw NotFoundException when product not found', async () => {
      // Given: 존재하지 않는 상품 ID
      const productId = '507f1f77bcf86cd799439099';

      // Given: findById가 null을 반환하도록 모킹
      mockProductModel.findById.mockReturnValue(createMockQueryResult(null));

      // When & Then: 상품을 찾을 수 없을 때 에러 발생
      await expect(service.findOne(productId)).rejects.toThrow();
      expect(mockProductModel.findById).toHaveBeenCalledWith(productId);
    });

    it('should handle invalid id format', async () => {
      // Given: 잘못된 형식의 ID
      const invalidId = 'invalid-id';

      // Given: MongoDB 에러 발생
      const mongoError = new Error('Cast to ObjectId failed');
      mockProductModel.findById.mockReturnValue(createMockQueryResult(null, true, mongoError));

      // When & Then: 에러가 전파되어야 함
      await expect(service.findOne(invalidId)).rejects.toThrow();
      expect(mockProductModel.findById).toHaveBeenCalledWith(invalidId);
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
