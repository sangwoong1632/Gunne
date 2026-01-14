import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Authentication Guard
 * JWT 토큰을 사용한 인증에 사용
 * JwtStrategy를 사용하여 토큰을 검증하고 사용자를 조회합니다.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
