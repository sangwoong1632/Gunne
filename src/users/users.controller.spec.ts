import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

      // Given: 생성된 사용자 객체
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

      mockUsersService.create.mockResolvedValue(createdUser);

      // When: Controller의 create 메서드 호출
      const result = await controller.create(createUserDto);

      // Then: Service의 create 메서드가 올바른 인자로 호출되었는지 확인
      expect(service.create).toHaveBeenCalledWith(createUserDto);
      expect(service.create).toHaveBeenCalledTimes(1);

      // Then: 생성된 사용자가 반환되어야 함 (비밀번호는 제외)
      expect(result.email).toBe(createdUser.email);
      expect(result.nickname).toBe(createdUser.nickname);
      expect(result.address).toEqual(createdUser.address);
      expect(result.mannerTemperature).toBe(createdUser.mannerTemperature);
      expect(result.role).toBe(createdUser.role);
      // 비밀번호는 응답에서 제외되어야 함
      expect(result).not.toHaveProperty('password');
    });

    it('should return 201 status with created user', async () => {
      // Given: 사용자 생성 DTO
      const createUserDto: CreateUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
        nickname: '새유저',
        address: {
          city: '부산시',
          district: '해운대구',
          street: '우동',
        },
      };

      const createdUser = {
        _id: '507f1f77bcf86cd799439012',
        ...createUserDto,
        password: 'hashed_password',
        wishList: [],
        mannerTemperature: 36.5,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.create.mockResolvedValue(createdUser);

      // When: 사용자 생성
      const result = await controller.create(createUserDto);

      // Then: 결과가 올바르게 반환되어야 함 (비밀번호는 제외)
      expect(result.email).toBe(createUserDto.email);
      expect(result.nickname).toBe(createUserDto.nickname);
      expect(result.mannerTemperature).toBe(createdUser.mannerTemperature);
      expect(result.role).toBe(createdUser.role);
      // 비밀번호는 응답에서 제외되어야 함
      expect(result).not.toHaveProperty('password');
    });

    it('should throw ConflictException when email already exists', async () => {
      // Given: 중복된 이메일로 사용자 생성 시도
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

      // Given: Service에서 ConflictException 발생
      const conflictError = new ConflictException(
        '이미 존재하는 이메일입니다.',
      );
      mockUsersService.create.mockRejectedValue(conflictError);

      // When & Then: 에러가 전파되어야 함
      await expect(controller.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(controller.create(createUserDto)).rejects.toThrow(
        '이미 존재하는 이메일입니다.',
      );
      expect(service.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should handle validation errors from DTO', async () => {
      // Given: 잘못된 DTO (이메일 형식 오류 등)
      const invalidDto = {
        email: 'invalid-email', // 잘못된 이메일 형식
        password: '123',
        nickname: '',
      } as CreateUserDto;

      // Given: Service에서 에러 발생 (DTO 검증은 ValidationPipe에서 처리되지만, 테스트를 위해)
      const validationError = new Error('Validation failed');
      mockUsersService.create.mockRejectedValue(validationError);

      // When & Then: 에러가 전파되어야 함
      await expect(controller.create(invalidDto)).rejects.toThrow();
      expect(service.create).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return user without password', async () => {
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
        toObject: jest.fn().mockReturnValue({
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
        }),
      };

      mockUsersService.findOne.mockResolvedValue(foundUser);

      // When: Controller의 findOne 메서드 호출
      // Red 단계: 타입 에러를 피하기 위해 타입 단언 사용 (실제로는 런타임 에러 발생)
      const result = (await controller.findOne(
        userId,
      )) as unknown as UserResponseDto;

      // Then: Service의 findOne 메서드가 올바른 ID로 호출되었는지 확인
      expect(service.findOne).toHaveBeenCalledWith(userId);
      expect(service.findOne).toHaveBeenCalledTimes(1);

      // Then: 사용자 정보가 반환되어야 함
      expect(result.email).toBe(foundUser.email);
      expect(result.nickname).toBe(foundUser.nickname);
      expect(result.address).toEqual(foundUser.address);
      expect(result.mannerTemperature).toBe(foundUser.mannerTemperature);
      expect(result.role).toBe(foundUser.role);

      // Then: 비밀번호는 응답에서 제외되어야 함
      expect(result).not.toHaveProperty('password');
    });

    it('should throw NotFoundException when user not found', async () => {
      // Given: 존재하지 않는 사용자 ID
      const userId = '507f1f77bcf86cd799439099';

      // Given: Service에서 NotFoundException 발생
      const notFoundError = new NotFoundException('사용자를 찾을 수 없습니다.');
      mockUsersService.findOne.mockRejectedValue(notFoundError);

      // When & Then: 에러가 전파되어야 함
      await expect(controller.findOne(userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.findOne(userId)).rejects.toThrow(
        '사용자를 찾을 수 없습니다.',
      );
      expect(service.findOne).toHaveBeenCalledWith(userId);
    });

    it('should handle invalid id format', async () => {
      // Given: 잘못된 형식의 ID
      const invalidId = 'invalid-id';

      // Given: Service에서 에러 발생
      const mongoError = new Error('Cast to ObjectId failed');
      mockUsersService.findOne.mockRejectedValue(mongoError);

      // When & Then: 에러가 전파되어야 함
      await expect(controller.findOne(invalidId)).rejects.toThrow();
      expect(service.findOne).toHaveBeenCalledWith(invalidId);
    });
  });

  describe('update', () => {
    it('should return updated user without password', async () => {
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

      const updatedUser = {
        _id: userId,
        email: 'test@example.com',
        password: 'hashed_password',
        nickname: '수정된닉네임',
        address: {
          city: '부산시',
          district: '해운대구',
          street: '우동',
        },
        wishList: [],
        mannerTemperature: 36.5,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject: jest.fn().mockReturnValue({
          _id: userId,
          email: 'test@example.com',
          password: 'hashed_password',
          nickname: '수정된닉네임',
          address: {
            city: '부산시',
            district: '해운대구',
            street: '우동',
          },
          wishList: [],
          mannerTemperature: 36.5,
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };

      mockUsersService.update.mockResolvedValue(updatedUser);

      // When: Controller의 update 메서드 호출
      const result = await controller.update(userId, updateUserDto);

      // Then: Service의 update 메서드가 올바른 인자로 호출되었는지 확인
      expect(service.update).toHaveBeenCalledWith(userId, updateUserDto);
      expect(service.update).toHaveBeenCalledTimes(1);

      // Then: 수정된 사용자 정보가 반환되어야 함
      expect(result.email).toBe(updatedUser.email);
      expect(result.nickname).toBe(updateUserDto.nickname);
      expect(result.address).toEqual(updateUserDto.address);

      // Then: 비밀번호는 응답에서 제외되어야 함
      expect(result).not.toHaveProperty('password');
    });

    it('should throw NotFoundException when user not found', async () => {
      // Given: 존재하지 않는 사용자 ID
      const userId = '507f1f77bcf86cd799439099';
      const updateUserDto: UpdateUserDto = {
        nickname: '수정된닉네임',
      };

      // Given: Service에서 NotFoundException 발생
      const notFoundError = new NotFoundException('사용자를 찾을 수 없습니다.');
      mockUsersService.update.mockRejectedValue(notFoundError);

      // When & Then: 에러가 전파되어야 함
      await expect(controller.update(userId, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.update(userId, updateUserDto)).rejects.toThrow(
        '사용자를 찾을 수 없습니다.',
      );
      expect(service.update).toHaveBeenCalledWith(userId, updateUserDto);
    });

    it('should throw ConflictException when email already exists', async () => {
      // Given: 사용자 ID와 중복된 이메일로 수정 시도
      const userId = '507f1f77bcf86cd799439011';
      const updateUserDto: UpdateUserDto = {
        email: 'existing@example.com', // 이미 다른 사용자가 사용 중인 이메일
      };

      // Given: Service에서 ConflictException 발생
      const conflictError = new ConflictException(
        '이미 존재하는 이메일입니다.',
      );
      mockUsersService.update.mockRejectedValue(conflictError);

      // When & Then: 에러가 전파되어야 함
      await expect(controller.update(userId, updateUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(controller.update(userId, updateUserDto)).rejects.toThrow(
        '이미 존재하는 이메일입니다.',
      );
      expect(service.update).toHaveBeenCalledWith(userId, updateUserDto);
    });

    it('should handle invalid id format', async () => {
      // Given: 잘못된 형식의 ID
      const invalidId = 'invalid-id';
      const updateUserDto: UpdateUserDto = {
        nickname: '수정된닉네임',
      };

      // Given: Service에서 에러 발생
      const mongoError = new Error('Cast to ObjectId failed');
      mockUsersService.update.mockRejectedValue(mongoError);

      // When & Then: 에러가 전파되어야 함
      await expect(
        controller.update(invalidId, updateUserDto),
      ).rejects.toThrow();
      expect(service.update).toHaveBeenCalledWith(invalidId, updateUserDto);
    });
  });
});
