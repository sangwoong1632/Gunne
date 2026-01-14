import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email', // 기본값은 'username'이지만 이메일을 사용
      passwordField: 'password',
    });
  }

  /**
   * Passport Local Strategy의 validate 메서드
   * @param email 사용자 이메일 (usernameField로 설정됨)
   * @param password 사용자 비밀번호
   * @returns 검증된 사용자 문서
   * @throws UnauthorizedException 인증 실패 시
   */
  async validate(email: string, password: string): Promise<UserDocument> {
    // validateUser에서 이미 UnauthorizedException을 던지므로 그대로 전달
    return await this.authService.validateUser(email, password);
  }
}
