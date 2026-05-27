import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { AtLeastOneOf } from '../../common/validators/at-least-one-of.validator.js';

/** 用户登录请求 — 用户名/邮箱/手机号至少填一个 */
export class LoginDto {
  @AtLeastOneOf(['username', 'email', 'phone'], {
    message: '用户名、邮箱和手机号至少填写一个',
  })
  @IsOptional()
  @ValidateIf((o) => o.username != null && o.username !== '')
  @IsString()
  username?: string;

  @IsOptional()
  @ValidateIf((o) => o.email != null && o.email !== '')
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @IsOptional()
  @ValidateIf((o) => o.phone != null && o.phone !== '')
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;

  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  password: string;
}
