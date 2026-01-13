import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Model, Query } from 'mongoose';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { AuthService } from './auth.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { LoginDto } from './dto/login.dto';

// bcrypt 모킹
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let mockUserModel: jest.Mocked<Pick<Model<UserDocument>, 'findOne'>>;
  let mockJwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;
  let mockConfigService: jest.Mocked<Pick<ConfigService, 'get'>>;
  let mockRedisClient: jest.Mocked<Pick<Redis, 'setex'>>;

  beforeEach(async () => {
    // Mock UserModel
    mockUserModel = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Pick<Model<UserDocument>, 'findOne'>>;

    // Mock JwtService
    mockJwtService = {
      signAsync: jest.fn(),
    } as unknown as jest.Mocked<Pick<JwtService, 'signAsync'>>;

    // Mock ConfigService
    mockConfigService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<Pick<ConfigService, 'get'>>;

    // Mock Redis Client
    mockRedisClient = {
      setex: jest.fn(),
    } as unknown as jest.Mocked<Pick<Redis, 'setex'>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('login', () => {
    it('올바른 이메일과 비밀번호로 로그인 시 성공해야 함', async () => {
      // Given: 올바른 이메일과 비밀번호
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'correctPassword',
      };

      // Given: 사용자 객체
      const user = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        password: 'hashed_correct_password',
        nickname: '테스트유저',
        wishList: [],
        mannerTemperature: 36.5,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Given: findOne이 사용자를 반환
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      } as unknown as Query<UserDocument | null, UserDocument>);

      // Given: bcrypt.compare가 true를 반환 (비밀번호 일치)
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Given: JWT 토큰 생성 모킹
      const accessToken = 'access_token_string';
      const refreshToken = 'refresh_token_string';
      mockJwtService.signAsync
        .mockResolvedValueOnce(accessToken)
        .mockResolvedValueOnce(refreshToken);

      // Given: ConfigService 모킹
      mockConfigService.get
        .mockReturnValueOnce('7d') // JWT_REFRESH_EXPIRES_IN
        .mockReturnValueOnce(604800); // JWT_REFRESH_EXPIRES_IN_SECONDS

      // Given: Redis setex 모킹
      mockRedisClient.setex.mockResolvedValue('OK');

      // When: 로그인 메서드 호출
      const result = await service.login(loginDto);

      // Then: 올바른 응답이 반환되었는지 확인
      expect(result).toEqual({
        accessToken,
        refreshToken,
        user: {
          id: user._id.toString(),
          email: user.email,
          nickname: user.nickname,
        },
      });
    });

    it('존재하지 않는 이메일로 로그인 시도 시 UnauthorizedException을 던져야 함', async () => {
      // Given: 존재하지 않는 이메일
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      // Given: findOne이 null을 반환 (사용자를 찾지 못함)
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as unknown as Query<UserDocument | null, UserDocument>);

      // When & Then: UnauthorizedException이 발생해야 함
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );

      // Then: 비밀번호 검증은 호출되지 않아야 함
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('잘못된 비밀번호로 로그인 시도 시 UnauthorizedException을 던져야 함', async () => {
      // Given: 올바른 이메일과 잘못된 비밀번호
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      // Given: 사용자 객체 (해싱된 비밀번호 포함)
      const user = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        password: 'hashed_correct_password',
        nickname: '테스트유저',
        wishList: [],
        mannerTemperature: 36.5,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Given: findOne이 사용자를 반환
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      } as unknown as Query<UserDocument | null, UserDocument>);

      // Given: bcrypt.compare가 false를 반환 (비밀번호 불일치)
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // When & Then: UnauthorizedException이 발생해야 함
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );

      // Then: bcrypt.compare가 올바른 인자로 호출되었는지 확인
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        user.password,
      );
    });

    describe('토큰 발급', () => {
      it('로그인 성공 시 Access Token과 Refresh Token을 발급해야 함', async () => {
        // Given: 올바른 이메일과 비밀번호
        const loginDto: LoginDto = {
          email: 'test@example.com',
          password: 'correctPassword',
        };

        // Given: 사용자 객체
        const user = {
          _id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          password: 'hashed_correct_password',
          nickname: '테스트유저',
          wishList: [],
          mannerTemperature: 36.5,
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Given: findOne이 사용자를 반환
        mockUserModel.findOne.mockReturnValue({
          exec: jest.fn().mockResolvedValue(user),
        } as unknown as Query<UserDocument | null, UserDocument>);

        // Given: bcrypt.compare가 true를 반환 (비밀번호 일치)
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        // Given: JWT 토큰 생성 모킹
        const accessToken = 'access_token_string';
        const refreshToken = 'refresh_token_string';
        mockJwtService.signAsync
          .mockResolvedValueOnce(accessToken)
          .mockResolvedValueOnce(refreshToken);

        // Given: ConfigService 모킹
        mockConfigService.get
          .mockReturnValueOnce('7d') // JWT_REFRESH_EXPIRES_IN
          .mockReturnValueOnce(604800); // JWT_REFRESH_EXPIRES_IN_SECONDS

        // Given: Redis setex 모킹
        mockRedisClient.setex.mockResolvedValue('OK');

        // When: 로그인 메서드 호출
        const result = await service.login(loginDto);

        // Then: Access Token이 올바른 payload로 생성되었는지 확인
        expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(1, {
          sub: user._id.toString(),
          email: user.email,
        });

        // Then: Refresh Token이 올바른 payload와 옵션으로 생성되었는지 확인
        expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
          2,
          { sub: user._id.toString(), email: user.email },
          { expiresIn: '7d' },
        );

        // Then: Refresh Token이 Redis에 저장되었는지 확인
        expect(mockRedisClient.setex).toHaveBeenCalledWith(
          `refresh_token:${user._id.toString()}`,
          604800,
          refreshToken,
        );

        // Then: 응답에 Access Token과 Refresh Token이 포함되어 있는지 확인
        expect(result.accessToken).toBe(accessToken);
        expect(result.refreshToken).toBe(refreshToken);
      });

      it('JWT 토큰 생성 실패 시 에러를 던져야 함', async () => {
        // Given: 올바른 이메일과 비밀번호
        const loginDto: LoginDto = {
          email: 'test@example.com',
          password: 'correctPassword',
        };

        // Given: 사용자 객체
        const user = {
          _id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          password: 'hashed_correct_password',
          nickname: '테스트유저',
          wishList: [],
          mannerTemperature: 36.5,
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Given: findOne이 사용자를 반환
        mockUserModel.findOne.mockReturnValue({
          exec: jest.fn().mockResolvedValue(user),
        } as unknown as Query<UserDocument | null, UserDocument>);

        // Given: bcrypt.compare가 true를 반환 (비밀번호 일치)
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        // Given: JWT 토큰 생성 실패 모킹
        mockJwtService.signAsync.mockRejectedValueOnce(
          new Error('JWT signing failed'),
        );

        // When & Then: 에러가 발생해야 함
        await expect(service.login(loginDto)).rejects.toThrow('JWT signing failed');
      });

      it('Redis 저장 실패 시 에러를 던져야 함', async () => {
        // Given: 올바른 이메일과 비밀번호
        const loginDto: LoginDto = {
          email: 'test@example.com',
          password: 'correctPassword',
        };

        // Given: 사용자 객체
        const user = {
          _id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          password: 'hashed_correct_password',
          nickname: '테스트유저',
          wishList: [],
          mannerTemperature: 36.5,
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Given: findOne이 사용자를 반환
        mockUserModel.findOne.mockReturnValue({
          exec: jest.fn().mockResolvedValue(user),
        } as unknown as Query<UserDocument | null, UserDocument>);

        // Given: bcrypt.compare가 true를 반환 (비밀번호 일치)
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        // Given: JWT 토큰 생성 모킹
        const accessToken = 'access_token_string';
        const refreshToken = 'refresh_token_string';
        mockJwtService.signAsync
          .mockResolvedValueOnce(accessToken)
          .mockResolvedValueOnce(refreshToken);

        // Given: ConfigService 모킹
        mockConfigService.get
          .mockReturnValueOnce('7d') // JWT_REFRESH_EXPIRES_IN
          .mockReturnValueOnce(604800); // JWT_REFRESH_EXPIRES_IN_SECONDS

        // Given: Redis setex 실패 모킹
        mockRedisClient.setex.mockRejectedValueOnce(
          new Error('Redis connection failed'),
        );

        // When & Then: 에러가 발생해야 함
        await expect(service.login(loginDto)).rejects.toThrow(
          'Redis connection failed',
        );
      });

      it('ConfigService에서 설정값이 없을 때 기본값을 사용해야 함', async () => {
        // Given: 올바른 이메일과 비밀번호
        const loginDto: LoginDto = {
          email: 'test@example.com',
          password: 'correctPassword',
        };

        // Given: 사용자 객체
        const user = {
          _id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          password: 'hashed_correct_password',
          nickname: '테스트유저',
          wishList: [],
          mannerTemperature: 36.5,
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Given: findOne이 사용자를 반환
        mockUserModel.findOne.mockReturnValue({
          exec: jest.fn().mockResolvedValue(user),
        } as unknown as Query<UserDocument | null, UserDocument>);

        // Given: bcrypt.compare가 true를 반환 (비밀번호 일치)
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        // Given: JWT 토큰 생성 모킹
        const accessToken = 'access_token_string';
        const refreshToken = 'refresh_token_string';
        mockJwtService.signAsync
          .mockResolvedValueOnce(accessToken)
          .mockResolvedValueOnce(refreshToken);

        // Given: ConfigService가 undefined 반환 (설정값 없음)
        mockConfigService.get
          .mockReturnValueOnce(undefined) // JWT_REFRESH_EXPIRES_IN
          .mockReturnValueOnce(undefined); // JWT_REFRESH_EXPIRES_IN_SECONDS

        // Given: Redis setex 모킹
        mockRedisClient.setex.mockResolvedValue('OK');

        // When: 로그인 메서드 호출
        const result = await service.login(loginDto);

        // Then: Refresh Token이 기본값 '7d'로 생성되었는지 확인
        expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
          2,
          { sub: user._id.toString(), email: user.email },
          { expiresIn: '7d' },
        );

        // Then: Redis에 기본값 7일(604800초)로 저장되었는지 확인
        expect(mockRedisClient.setex).toHaveBeenCalledWith(
          `refresh_token:${user._id.toString()}`,
          7 * 24 * 60 * 60, // 기본 7일 (초 단위)
          refreshToken,
        );

        // Then: 응답이 정상적으로 반환되었는지 확인
        expect(result.accessToken).toBe(accessToken);
        expect(result.refreshToken).toBe(refreshToken);
      });
    });
  });
});
