import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'; // 추가
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema'; // 추가
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    // 이 모듈에서 User 스키마를 쓴다고 등록
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    // AuthModule import (순환 참조 방지를 위해 forwardRef 사용)
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
