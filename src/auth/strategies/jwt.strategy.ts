import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';

// JWT Payload 타입 정의
interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super({
      // 헤더에서 토큰 추출: Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // JWT Secret Key
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key',
      // 토큰 만료 시간 무시 여부 (기본값: false)
      ignoreExpiration: false,
    });
  }

  /**
   * Passport JWT Strategy의 validate 메서드
   * JWT 토큰이 검증된 후 호출됨
   * @param payload JWT Payload (sub: userId, email: userEmail)
   * @returns 사용자 문서
   * @throws UnauthorizedException 사용자를 찾을 수 없을 경우
   */
  async validate(payload: JwtPayload): Promise<UserDocument> {
    // Payload에서 사용자 ID 추출
    const userId = payload.sub;

    // 사용자 조회
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }
}
