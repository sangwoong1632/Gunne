import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
  Req,
  HttpException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import {
  JWT_DEFAULT_REFRESH_EXPIRES_IN_SECONDS,
} from './constants/auth.constants';
import { UserDocument } from '../users/schemas/user.schema';

@ApiTags('인증')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '로그인',
    description: '이메일과 비밀번호로 로그인합니다. Refresh Token은 Cookie로 설정됩니다.',
  })
  @ApiResponse({
    status: 200,
    description: '로그인 성공',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패 - 이메일 또는 비밀번호가 올바르지 않습니다.',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { accessToken, refreshToken, user } = await this.authService.login(
      loginDto,
    );

    // Refresh Token을 Cookie로 설정
    const refreshTokenExpiry =
      this.configService.get<number>('JWT_REFRESH_EXPIRES_IN_SECONDS') ||
      JWT_DEFAULT_REFRESH_EXPIRES_IN_SECONDS;

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, // XSS 공격 방지
      secure: process.env.NODE_ENV === 'production', // HTTPS에서만 전송
      sameSite: 'strict', // CSRF 공격 방지
      maxAge: refreshTokenExpiry * 1000, // 밀리초 단위
      path: '/', // 모든 경로에서 사용 가능
    });

    // Access Token은 Response Body로 반환
    return {
      accessToken,
      user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Access Token 및 Refresh Token 갱신',
    description:
      'Refresh Token을 사용하여 새로운 Access Token과 Refresh Token을 발급합니다. (Refresh Token Rotation)',
  })
  @ApiResponse({
    status: 200,
    description: '토큰 갱신 성공',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          example:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJpYXQiOjE2MDAwMDAwMDB9.example',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '유효하지 않은 Refresh Token입니다.',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    // Cookie에서 Refresh Token 추출
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new HttpException(
        'Refresh Token이 없습니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Refresh Token으로 새 Access Token 및 Refresh Token 발급 (Rotation)
    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refreshAccessToken(refreshToken);

    // 새로운 Refresh Token을 Cookie로 설정
    const refreshTokenExpiry =
      this.configService.get<number>('JWT_REFRESH_EXPIRES_IN_SECONDS') ||
      JWT_DEFAULT_REFRESH_EXPIRES_IN_SECONDS;

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true, // XSS 공격 방지
      secure: process.env.NODE_ENV === 'production', // HTTPS에서만 전송
      sameSite: 'strict', // CSRF 공격 방지
      maxAge: refreshTokenExpiry * 1000, // 밀리초 단위
      path: '/', // 모든 경로에서 사용 가능
    });

    // Access Token은 Response Body로 반환
    return { accessToken };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({
    summary: '로그아웃',
    description: '로그아웃하여 Refresh Token을 삭제합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '로그아웃 성공',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: '로그아웃되었습니다.',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '인증되지 않은 사용자입니다.',
  })
  async logout(
    @Req() req: Request & { user: UserDocument },
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    // Redis에서 Refresh Token 삭제
    await this.authService.logout(req.user._id.toString());

    // Cookie에서 Refresh Token 삭제
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return { message: '로그아웃되었습니다.' };
  }
}
