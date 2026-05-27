import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Gender, Role } from '../../../generated/prisma/client.js';

/** 管理员编辑用户信息 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickName?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
