import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 전역 유효성 검증 파이프 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성 제거
      forbidNonWhitelisted: true, // DTO에 정의되지 않은 속성이 있으면 에러
      transform: true, // 요청 데이터를 DTO 인스턴스로 자동 변환
    }),
  );

  // 2. Swagger 설정 (여기부터)
  const config = new DocumentBuilder()
    .setTitle('중고거래 마켓 API')
    .setDescription('TDD로 만드는 중고거래 서비스 API 문서입니다.')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // 'api' 주소로 접속하게 설정
  // (여기까지)

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
}
void bootstrap();
