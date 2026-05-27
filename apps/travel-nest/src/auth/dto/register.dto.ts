import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  Max,
  Matches,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { Gender } from '../../../generated/prisma/enums.js';
import { AtLeastOneOf } from '../../common/validators/at-least-one-of.validator.js';

/** 用户注册请求 — 邮箱与手机号至少填一个 */
export class RegisterDto {
  /** 邮箱 */
  @AtLeastOneOf(['email', 'phone'], { message: '邮箱和手机号至少填写一个' })
  @IsOptional()
  @ValidateIf((o) => o.email != null && o.email !== '')
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  /** 用户名 */
  @IsString()
  @MinLength(2, { message: '用户名至少2个字符' })
  @MaxLength(32, { message: '用户名最多32个字符' })
  username: string;

  /** 密码 */
  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  @MaxLength(16, { message: '密码最多16个字符' })
  password: string;

  /** 手机号 */
  @IsOptional()
  @ValidateIf((o) => o.phone != null && o.phone !== '')
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;

  /** 昵称 */
  @IsOptional()
  @IsString()
  @MinLength(2, { message: '昵称至少2个字符' })
  @MaxLength(32, { message: '昵称最多32个字符' })
  nickName?: string;

  /** 性别 */
  @IsOptional()
  @IsEnum(Gender, { message: '性别取值无效' })
  gender?: Gender;

  /** 年龄 */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(150)
  age?: number;
}
