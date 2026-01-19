/**
 * 상품 관련 상수 정의
 * 단일 소스 원칙: 모든 상수는 여기서 정의하고 스키마와 서비스에서 참조
 */

// 상품 상태 Enum (타입 안전성과 자동완성 제공)
export enum ProductStatusEnum {
  FOR_SALE = '판매중',
  RESERVED = '예약중',
  SOLD_OUT = '판매완료',
}

// 상품 기본값 (스키마에서 참조)
export const DEFAULT_PRODUCT_STATUS = ProductStatusEnum.FOR_SALE;

// MongoDB 에러 코드
export const MONGO_DUPLICATE_KEY_ERROR_CODE = 11000;

// 에러 메시지
export const ERROR_MESSAGES = {
  PRODUCT_NOT_FOUND: '상품을 찾을 수 없습니다.',
  UNAUTHORIZED: '권한이 없습니다.',
} as const;
