import { IsString } from 'class-validator';

/** 刷新令牌请求 */
export class RefreshDto {
  @IsString()
  refreshToken: string;
}
