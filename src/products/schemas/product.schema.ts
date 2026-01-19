import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  ProductStatusEnum,
  DEFAULT_PRODUCT_STATUS,
} from '../constants/products.constants';

export type ProductDocument = HydratedDocument<Product>;

// 상품 상태를 위한 서브 스키마 (예: 판매중, 예약중, 판매완료)
@Schema({ _id: false })
export class ProductStatus {
  @Prop({
    type: String,
    enum: Object.values(ProductStatusEnum),
    default: DEFAULT_PRODUCT_STATUS,
  })
  status: ProductStatusEnum;
}

// 메인 상품 스키마
@Schema({ timestamps: true }) // createdAt, updatedAt 자동 생성
export class Product {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  price: number;

  // 상태 정보 (embedded document)
  @Prop({
    type: ProductStatus,
    default: () => ({ status: DEFAULT_PRODUCT_STATUS }),
  })
  status: ProductStatus;

  // 이미지 URL 배열
  @Prop({ type: [String], default: [] })
  images: string[];

  // 판매자 ID (User 참조)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sellerId: Types.ObjectId;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
