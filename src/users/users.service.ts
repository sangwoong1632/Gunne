import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';
import {
  BCRYPT_SALT_ROUNDS,
  MONGO_DUPLICATE_KEY_ERROR_CODE,
  ERROR_MESSAGES,
} from './constants/user.constants';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  /**
   * 비밀번호를 해싱하는 헬퍼 메서드
   * create와 update에서 공통으로 사용
   */
  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  /**
   * MongoDB 에러를 NestJS 예외로 변환
   * duplicate key error는 ConflictException으로 변환
   */
  private handleMongoError(error: Error & { code?: number }): never {
    if (error.code === MONGO_DUPLICATE_KEY_ERROR_CODE) {
      throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
    }
    throw error;
  }

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    // DTO에서 유효성 검증이 완료된 상태로 도달
    try {
      // 비밀번호 해싱
      const hashedPassword = await this.hashPassword(createUserDto.password);

      // 사용자 생성 데이터 준비
      // 기본값(mannerTemperature, role)은 스키마에서 자동으로 설정됨
      const userData = {
        email: createUserDto.email,
        password: hashedPassword,
        nickname: createUserDto.nickname,
        address: createUserDto.address,
      };

      // 사용자 생성
      const createdUser = await this.userModel.create(userData);
      return createdUser;
    } catch (error: any) {
      this.handleMongoError(error);
    }
  }

  async findOne(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    try {
      // 비밀번호가 포함되어 있으면 해싱
      const updateData = { ...updateUserDto };
      if (updateData.password) {
        updateData.password = await this.hashPassword(updateData.password);
      }

      // 사용자 정보 수정
      const updatedUser = await this.userModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();

      if (!updatedUser) {
        throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      return updatedUser;
    } catch (error: any) {
      // NotFoundException은 그대로 전파
      if (error instanceof NotFoundException) {
        throw error;
      }
      // MongoDB 에러 처리
      this.handleMongoError(error);
    }
  }

  async remove(id: string): Promise<void> {
    const deletedUser = await this.userModel.findByIdAndDelete(id).exec();

    if (!deletedUser) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    // 삭제 성공 시 void 반환
  }
}
