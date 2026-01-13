import type { StringValue } from 'ms';

// 인증 관련 에러 메시지
export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
  INVALID_REFRESH_TOKEN: '유효하지 않은 리프레시 토큰입니다.',
} as const;

// JWT 토큰 관련 상수
export const JWT_DEFAULT_REFRESH_EXPIRES_IN = '14d' as const satisfies StringValue;
export const JWT_DEFAULT_REFRESH_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60; // 7일 (초 단위)

// Redis 키 패턴
export const REDIS_KEY_PATTERNS = {
  REFRESH_TOKEN: (userId: string) => `refresh_token:${userId}`,
} as const;
