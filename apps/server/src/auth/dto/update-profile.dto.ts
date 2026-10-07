import { IsString, MaxLength } from 'class-validator';

/** 当前登录用户修改自己的资料（目前仅头像） */
export class UpdateProfileDto {
  @IsString()
  @MaxLength(500)
  avatar!: string;
}