import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { ChatsModule } from './chats/chats.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './common/redis.module';

@Module({
  imports: [
    // ConfigModule을 전역으로 등록하고 .env 파일 자동 로드
    ConfigModule.forRoot({
      isGlobal: true, // 전역 모듈로 설정하여 다른 모듈에서도 사용 가능
      envFilePath: '.env', // .env 파일 경로
    }),
    // ConfigService를 사용하여 환경변수 주입
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGO_URI') ||
          'mongodb://localhost:27017/nestdb',
      }),
      inject: [ConfigService],
    }),
    RedisModule,
    UsersModule,
    ProductsModule,
    ChatsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
