import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from './query.dto.js';

/** 用户列表筛选 */
export class UserQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(['USER', 'ADMIN'])
  role?: string;
}
