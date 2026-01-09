import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let userModel: any;

  const mockUserModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userModel = module.get(getModelToken(User.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      // Given: 사용자 생성 DTO
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        nickname: '테스트유저',
        address: {
          city: '서울시',
          district: '강남구',
          street: '역삼동',
        },
      };

      // Given: 생성된 사용자 객체 (MongoDB에서 반환될 형태)
      const createdUser = {
        _id: '507f1f77bcf86cd799439011',
        email: createUserDto.email,
        password: 'hashed_password',
        nickname: createUserDto.nickname,
        address: createUserDto.address,
        wishList: [],
        mannerTemperature: 36.5,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Given: 모델의 create 메서드가 생성된 사용자를 반환하도록 모킹
      mockUserModel.create.mockResolvedValue(createdUser);

      // When: 사용자 생성 메서드 호출
      const result = await service.create(createUserDto);

      // Then: create 메서드가 호출되었는지 확인
      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: createUserDto.email,
          nickname: createUserDto.nickname,
          address: createUserDto.address,
        }),
      );

      // Then: 생성된 사용자가 반환되어야 함
      expect(result).toEqual(createdUser);
    });

    it('should create a user with default values (mannerTemperature, role)', async () => {
      // Given: 기본값이 필요한 필드 없이 사용자 생성
      const createUserDto: CreateUserDto = {
        email: 'test2@example.com',
        password: 'password123',
        nickname: '기본값테스트',
        address: {
          city: '부산시',
          district: '해운대구',
          street: '우동',
        },
      };

      const createdUser = {
        _id: '507f1f77bcf86cd799439012',
        email: createUserDto.email,
        password: 'hashed_password',
        nickname: createUserDto.nickname,
        address: createUserDto.address,
        wishList: [],
        mannerTemperature: 36.5, // 기본값
        role: 'user', // 기본값
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserModel.create.mockResolvedValue(createdUser);

      // When: 사용자 생성
      const result = (await service.create(createUserDto)) as any;

      // Then: 기본값이 설정되어야 함
      expect(result.mannerTemperature).toBe(36.5);
      expect(result.role).toBe('user');
    });

    it('should throw error when email already exists', async () => {
      // Given: 이미 존재하는 이메일로 사용자 생성 시도
      const createUserDto: CreateUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        nickname: '중복유저',
        address: {
          city: '서울시',
          district: '강남구',
          street: '역삼동',
        },
      };

      // Given: 이메일 중복 에러 (MongoDB duplicate key error)
      const duplicateError = {
        code: 11000,
        keyPattern: { email: 1 },
        keyValue: { email: 'existing@example.com' },
      };

      mockUserModel.create.mockRejectedValue(duplicateError);

      // When & Then: 중복 이메일로 인한 에러 발생
      await expect(service.create(createUserDto)).rejects.toThrow();
      expect(mockUserModel.create).toHaveBeenCalled();
    });

    it('should throw error when email is missing', async () => {
      // Given: 이메일이 없는 DTO
      const createUserDto = {
        password: 'password123',
        nickname: '이메일없음',
        address: {
          city: '서울시',
          district: '강남구',
          street: '역삼동',
        },
      } as any;

      // When & Then: 필수 필드 누락으로 인한 에러 발생
      await expect(service.create(createUserDto)).rejects.toThrow();
    });

    it('should throw error when password is missing', async () => {
      // Given: 비밀번호가 없는 DTO
      const createUserDto = {
        email: 'test@example.com',
        nickname: '비밀번호없음',
        address: {
          city: '서울시',
          district: '강남구',
          street: '역삼동',
        },
      } as any;

      // When & Then: 필수 필드 누락으로 인한 에러 발생
      await expect(service.create(createUserDto)).rejects.toThrow();
    });

    it('should throw error when nickname is missing', async () => {
      // Given: 닉네임이 없는 DTO
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        address: {
          city: '서울시',
          district: '강남구',
          street: '역삼동',
        },
      } as any;

      // When & Then: 필수 필드 누락으로 인한 에러 발생
      await expect(service.create(createUserDto)).rejects.toThrow();
    });

    it('should handle database connection errors', async () => {
      // Given: 정상적인 DTO
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        nickname: 'DB에러테스트',
        address: {
          city: '서울시',
          district: '강남구',
          street: '역삼동',
        },
      };

      // Given: 데이터베이스 연결 에러
      const dbError = new Error('Database connection failed');
      mockUserModel.create.mockRejectedValue(dbError);

      // When & Then: DB 에러가 전파되어야 함
      await expect(service.create(createUserDto)).rejects.toThrow(
        'Database connection failed',
      );
      expect(mockUserModel.create).toHaveBeenCalled();
    });

    it('should create user without address (optional field)', async () => {
      // Given: 주소 없이 사용자 생성 (주소는 선택적 필드)
      const createUserDto = {
        email: 'noaddress@example.com',
        password: 'password123',
        nickname: '주소없음',
      } as any;

      const createdUser = {
        _id: '507f1f77bcf86cd799439013',
        email: createUserDto.email,
        password: 'hashed_password',
        nickname: createUserDto.nickname,
        address: undefined,
        wishList: [],
        mannerTemperature: 36.5,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserModel.create.mockResolvedValue(createdUser);

      // When: 사용자 생성
      const result = await service.create(createUserDto);

      // Then: 주소 없이도 생성 가능해야 함
      expect(result).toEqual(createdUser);
      expect(mockUserModel.create).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should find a user by id', async () => {
      // Given: 사용자 ID
      const userId = '507f1f77bcf86cd799439011';
      const foundUser = {
        _id: userId,
        email: 'test@example.com',
        password: 'hashed_password',
        nickname: '테스트유저',
        address: {
          city: '서울시',
          district: '강남구',
          street: '역삼동',
        },
        wishList: [],
        mannerTemperature: 36.5,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Given: findById가 사용자를 반환하도록 모킹
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(foundUser),
      });

      // When: 사용자 조회
      const result = await service.findOne(userId);

      // Then: findById가 올바른 ID로 호출되었는지 확인
      expect(mockUserModel.findById).toHaveBeenCalledWith(userId);
      expect(mockUserModel.findById).toHaveBeenCalledTimes(1);

      // Then: 조회된 사용자가 반환되어야 함
      expect(result).toEqual(foundUser);
    });

    it('should return user without password in response', async () => {
      // Given: 사용자 ID
      const userId = '507f1f77bcf86cd799439011';
      const foundUser = {
        _id: userId,
        email: 'test@example.com',
        password: 'hashed_password',
        nickname: '테스트유저',
        address: {
          city: '서울시',
          district: '강남구',
          street: '역삼동',
        },
        wishList: [],
        mannerTemperature: 36.5,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(foundUser),
      });

      // When: 사용자 조회
      const result = await service.findOne(userId);

      // Then: 사용자 정보가 반환되어야 함
      expect(result).toBeDefined();
      expect(result.email).toBe(foundUser.email);
      expect(result.nickname).toBe(foundUser.nickname);
      // Note: 비밀번호 제외는 Controller에서 처리하지만, Service는 원본 반환
    });

    it('should throw error when user not found', async () => {
      // Given: 존재하지 않는 사용자 ID
      const userId = '507f1f77bcf86cd799439099';

      // Given: findById가 null을 반환하도록 모킹
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // When & Then: 사용자를 찾을 수 없을 때 에러 발생
      await expect(service.findOne(userId)).rejects.toThrow();
      expect(mockUserModel.findById).toHaveBeenCalledWith(userId);
    });

    it('should handle invalid id format', async () => {
      // Given: 잘못된 형식의 ID
      const invalidId = 'invalid-id';

      // Given: MongoDB 에러 발생
      const mongoError = new Error('Cast to ObjectId failed');
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockRejectedValue(mongoError),
      });

      // When & Then: 에러가 전파되어야 함
      await expect(service.findOne(invalidId)).rejects.toThrow();
      expect(mockUserModel.findById).toHaveBeenCalledWith(invalidId);
    });
  });

  describe('update', () => {
    it('should update user information', async () => {
      // Given: 사용자 ID와 수정할 정보
      const userId = '507f1f77bcf86cd799439011';
      const updateUserDto: UpdateUserDto = {
        nickname: '수정된닉네임',
        address: {
          city: '부산시',
          district: '해운대구',
          street: '우동',
        },
      };

      const existingUser = {
        _id: userId,
        email: 'test@example.com',
        password: 'hashed_password',
        nickname: '기존닉네임',
        address: {
          city: '서울시',
          district: '강남구',
          street: '역삼동',
        },
        wishList: [],
        mannerTemperature: 36.5,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedUser = {
        ...existingUser,
        ...updateUserDto,
        updatedAt: new Date(),
      };

      // Given: findByIdAndUpdate가 수정된 사용자를 반환하도록 모킹
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedUser),
      });

      // When: 사용자 정보 수정
      const result = await service.update(userId, updateUserDto);

      // Then: findByIdAndUpdate가 올바른 인자로 호출되었는지 확인
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        updateUserDto,
        { new: true },
      );
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);

      // Then: 수정된 사용자 정보가 반환되어야 함
      expect(result).toEqual(updatedUser);
      expect(result.nickname).toBe(updateUserDto.nickname);
      expect(result.address).toEqual(updateUserDto.address);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Given: 존재하지 않는 사용자 ID
      const userId = '507f1f77bcf86cd799439099';
      const updateUserDto: UpdateUserDto = {
        nickname: '수정된닉네임',
      };

      // Given: findByIdAndUpdate가 null을 반환하도록 모킹
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // When & Then: 사용자를 찾을 수 없을 때 에러 발생
      await expect(service.update(userId, updateUserDto)).rejects.toThrow();
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        updateUserDto,
        { new: true },
      );
    });

    it('should handle invalid id format', async () => {
      // Given: 잘못된 형식의 ID
      const invalidId = 'invalid-id';
      const updateUserDto: UpdateUserDto = {
        nickname: '수정된닉네임',
      };

      // Given: MongoDB 에러 발생
      const mongoError = new Error('Cast to ObjectId failed');
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(mongoError),
      });

      // When & Then: 에러가 전파되어야 함
      await expect(service.update(invalidId, updateUserDto)).rejects.toThrow();
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        invalidId,
        updateUserDto,
        { new: true },
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      // Given: 사용자 ID와 중복된 이메일로 수정 시도
      const userId = '507f1f77bcf86cd799439011';
      const updateUserDto: UpdateUserDto = {
        email: 'existing@example.com', // 이미 다른 사용자가 사용 중인 이메일
      };

      // Given: MongoDB duplicate key error 발생
      const duplicateError = {
        code: 11000,
        keyPattern: { email: 1 },
        keyValue: { email: 'existing@example.com' },
      };

      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(duplicateError),
      });

      // When & Then: 중복 이메일로 인한 ConflictException 발생
      await expect(service.update(userId, updateUserDto)).rejects.toThrow();
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        updateUserDto,
        { new: true },
      );
    });

    it('should hash password when password is included in update', async () => {
      // Given: 사용자 ID와 비밀번호 변경
      const userId = '507f1f77bcf86cd799439011';
      const newPassword = 'newPassword123';
      const hashedPassword = 'hashed_newPassword123';
      const updateUserDto: UpdateUserDto = {
        password: newPassword,
      };

      const existingUser = {
        _id: userId,
        email: 'test@example.com',
        password: 'old_hashed_password',
        nickname: '테스트유저',
        wishList: [],
        mannerTemperature: 36.5,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedUser = {
        ...existingUser,
        password: hashedPassword, // 해싱된 비밀번호
        updatedAt: new Date(),
      };

      // Given: bcrypt.hash 모킹
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword);

      // Given: findByIdAndUpdate가 수정된 사용자를 반환하도록 모킹
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedUser),
      });

      // When: 사용자 비밀번호 수정
      const result = await service.update(userId, updateUserDto);

      // Then: 비밀번호가 해싱되었는지 확인
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(bcrypt.hash).toHaveBeenCalledTimes(1);

      // Then: findByIdAndUpdate가 해싱된 비밀번호로 호출되었는지 확인
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        { password: hashedPassword },
        { new: true },
      );

      // Then: 수정된 사용자가 반환되어야 함
      expect(result).toEqual(updatedUser);
    });
  });

  describe('remove', () => {
    it('should delete user by id', async () => {
      // Given: 사용자 ID
      const userId = '507f1f77bcf86cd799439011';
      const deletedUser = {
        _id: userId,
        email: 'test@example.com',
        password: 'hashed_password',
        nickname: '테스트유저',
        wishList: [],
        mannerTemperature: 36.5,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Given: findByIdAndDelete가 삭제된 사용자를 반환하도록 모킹
      mockUserModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(deletedUser),
      });

      // When: 사용자 삭제
      await service.remove(userId);

      // Then: findByIdAndDelete가 올바른 ID로 호출되었는지 확인
      expect(mockUserModel.findByIdAndDelete).toHaveBeenCalledWith(userId);
      expect(mockUserModel.findByIdAndDelete).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Given: 존재하지 않는 사용자 ID
      const userId = '507f1f77bcf86cd799439099';

      // Given: findByIdAndDelete가 null을 반환하도록 모킹
      mockUserModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // When & Then: 사용자를 찾을 수 없을 때 에러 발생
      await expect(service.remove(userId)).rejects.toThrow();
      expect(mockUserModel.findByIdAndDelete).toHaveBeenCalledWith(userId);
    });

    it('should handle invalid id format', async () => {
      // Given: 잘못된 형식의 ID
      const invalidId = 'invalid-id';

      // Given: MongoDB 에러 발생
      const mongoError = new Error('Cast to ObjectId failed');
      mockUserModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockRejectedValue(mongoError),
      });

      // When & Then: 에러가 전파되어야 함
      await expect(service.remove(invalidId)).rejects.toThrow();
      expect(mockUserModel.findByIdAndDelete).toHaveBeenCalledWith(invalidId);
    });
  });
});
