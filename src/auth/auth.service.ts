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
import { AuthResponseDto } from './dto/auth-response.dto';
import { ERROR_MESSAGES } from './constants/auth.constants';

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
  private async validateUser(
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
   * JWT 토큰 생성 (Access Token, Refresh Token)
   * @param user 사용자 문서
   * @returns Access Token과 Refresh Token
   */
  private async generateTokens(user: UserDocument): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = { sub: user._id.toString(), email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshTokenExpiresIn = (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d') as StringValue;
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
    const refreshTokenKey = `refresh_token:${userId}`;
    const refreshTokenExpiry = this.configService.get<number>(
      'JWT_REFRESH_EXPIRES_IN_SECONDS',
    ) || 7 * 24 * 60 * 60; // 기본 7일 (초 단위)

    await this.redisClient.setex(
      refreshTokenKey,
      refreshTokenExpiry,
      refreshToken,
    );
  }

  /**
   * 로그인 처리
   * 이메일과 비밀번호를 검증하고 JWT 토큰을 발급합니다.
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // 1. 사용자 검증
    const user = await this.validateUser(
      loginDto.email,
      loginDto.password,
    );

    // 2. JWT 토큰 생성
    const { accessToken, refreshToken } = await this.generateTokens(user);

    // 3. Refresh Token을 Redis에 저장
    await this.saveRefreshToken(user._id.toString(), refreshToken);

    // 4. 응답 반환
    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        nickname: user.nickname,
      },
    };
  }

  /**
   * Refresh Token으로 새로운 Access Token 발급
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      // 1. Refresh Token 검증
      const payload = await this.jwtService.verifyAsync(refreshToken);

      // 2. Redis에서 Refresh Token 확인
      const refreshTokenKey = `refresh_token:${payload.sub}`;
      const storedToken = await this.redisClient.get(refreshTokenKey);

      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
      }

      // 3. 새로운 Access Token 생성
      const newPayload = { sub: payload.sub, email: payload.email };
      const accessToken = await this.jwtService.signAsync(newPayload);

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
    }
  }

  /**
   * 로그아웃 처리
   * Redis에서 Refresh Token을 삭제합니다.
   */
  async logout(userId: string): Promise<void> {
    const refreshTokenKey = `refresh_token:${userId}`;
    await this.redisClient.del(refreshTokenKey);
  }
}
