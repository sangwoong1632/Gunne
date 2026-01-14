import {
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import type { StringValue } from 'ms';
import { User, UserDocument } from '../users/schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import {
  ERROR_MESSAGES,
  JWT_DEFAULT_REFRESH_EXPIRES_IN,
  JWT_DEFAULT_REFRESH_EXPIRES_IN_SECONDS,
  REDIS_KEY_PATTERNS,
} from './constants/auth.constants';

// JWT Payload 타입 정의
interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject('REDIS_CLIENT') private redisClient: Redis,
  ) {}

  /**
   * 사용자 검증 (이메일과 비밀번호)
   * @param email 사용자 이메일
   * @param password 사용자 비밀번호
   * @returns 검증된 사용자 문서
   * @throws UnauthorizedException 이메일 또는 비밀번호가 올바르지 않을 경우
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<UserDocument> {
    // 1. 이메일로 사용자 찾기
    const user = await this.userModel.findOne({ email }).exec();

    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // 2. 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    return user;
  }

  /**
   * JWT Payload 생성
   * @param user 사용자 문서
   * @returns JWT Payload
   */
  private createJwtPayload(user: UserDocument): JwtPayload {
    return {
      sub: user._id.toString(),
      email: user.email,
    };
  }

  /**
   * JWT 토큰 생성 (Access Token, Refresh Token)
   * @param user 사용자 문서
   * @returns Access Token과 Refresh Token
   */
  private async generateTokens(user: UserDocument): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = this.createJwtPayload(user);
    const accessToken = await this.jwtService.signAsync(payload);
    
    const refreshTokenExpiresIn = (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || 
      JWT_DEFAULT_REFRESH_EXPIRES_IN) as StringValue;
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: refreshTokenExpiresIn,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Refresh Token을 Redis에 저장
   * @param userId 사용자 ID
   * @param refreshToken Refresh Token
   */
  private async saveRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const refreshTokenKey = REDIS_KEY_PATTERNS.REFRESH_TOKEN(userId);
    const refreshTokenExpiry = this.configService.get<number>(
      'JWT_REFRESH_EXPIRES_IN_SECONDS',
    ) || JWT_DEFAULT_REFRESH_EXPIRES_IN_SECONDS;

    await this.redisClient.setex(
      refreshTokenKey,
      refreshTokenExpiry,
      refreshToken,
    );
  }

  /**
   * 사용자 정보를 응답 DTO 형식으로 변환
   * @param user 사용자 문서
   * @returns 사용자 응답 객체
   */
  private createUserResponse(user: UserDocument): {
    id: string;
    email: string;
    nickname: string;
  } {
    return {
      id: user._id.toString(),
      email: user.email,
      nickname: user.nickname,
    };
  }

  /**
   * 로그인 처리
   * 이메일과 비밀번호를 검증하고 JWT 토큰을 발급합니다.
   * @returns Access Token, Refresh Token, 사용자 정보
   */
  async login(loginDto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      nickname: string;
    };
  }> {
    // 1. 사용자 검증
    const user = await this.validateUser(
      loginDto.email,
      loginDto.password,
    );

    // 2. JWT 토큰 생성
    const { accessToken, refreshToken } = await this.generateTokens(user);

    // 3. Refresh Token을 Redis에 저장
    await this.saveRefreshToken(user._id.toString(), refreshToken);

    // 4. 응답 반환 (Refresh Token은 Controller에서 Cookie로 설정)
    return {
      accessToken,
      refreshToken,
      user: this.createUserResponse(user),
    };
  }

  /**
   * Refresh Token 검증 및 Redis 확인
   * @param refreshToken Refresh Token
   * @returns 검증된 JWT Payload
   * @throws UnauthorizedException Refresh Token이 유효하지 않을 경우
   */
  private async validateRefreshToken(refreshToken: string): Promise<JwtPayload> {
    // 1. Refresh Token 검증
    const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);

    // 2. Redis에서 Refresh Token 확인
    const refreshTokenKey = REDIS_KEY_PATTERNS.REFRESH_TOKEN(payload.sub);
    const storedToken = await this.redisClient.get(refreshTokenKey);

    if (!storedToken || storedToken !== refreshToken) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    return payload;
  }

  /**
   * Refresh Token으로 새로운 Access Token 및 Refresh Token 발급 (Rotation)
   * 이전 Refresh Token은 무효화하고 새로운 Refresh Token을 발급합니다.
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      // 1. Refresh Token 검증 및 Redis 확인
      const payload = await this.validateRefreshToken(refreshToken);

      // 2. 사용자 조회 (새 Refresh Token 생성을 위해)
      const user = await this.userModel.findById(payload.sub).exec();
      if (!user) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
      }

      // 3. 이전 Refresh Token 무효화 (Redis에서 삭제)
      const oldRefreshTokenKey = REDIS_KEY_PATTERNS.REFRESH_TOKEN(payload.sub);
      await this.redisClient.del(oldRefreshTokenKey);

      // 4. 새로운 Access Token 및 Refresh Token 생성
      const { accessToken, refreshToken: newRefreshToken } =
        await this.generateTokens(user);

      // 5. 새로운 Refresh Token을 Redis에 저장
      await this.saveRefreshToken(user._id.toString(), newRefreshToken);

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      // JWT 검증 실패 또는 Redis 확인 실패 시 동일한 에러 메시지 반환
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
    }
  }

  /**
   * 로그아웃 처리
   * Redis에서 Refresh Token을 삭제합니다.
   */
  async logout(userId: string): Promise<void> {
    const refreshTokenKey = REDIS_KEY_PATTERNS.REFRESH_TOKEN(userId);
    await this.redisClient.del(refreshTokenKey);
  }
}
