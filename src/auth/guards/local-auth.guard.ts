import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Local Authentication Guard
 * 이메일과 비밀번호를 사용한 로그인 인증에 사용
 * LocalStrategy를 사용하여 사용자를 검증합니다.
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
