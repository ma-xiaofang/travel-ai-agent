import { IsEnum, IsIn, IsOptional, IsString, Max } from 'class-validator';
import { Type } from 'class-transformer';

/** 分页查询参数 */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Max(100)
  pageSize?: number = 20;
}

/** 文档列表筛选 */
export class DocumentQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  collectionId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PROCESSING', 'INDEXED', 'FAILED'])
  status?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}

/** 会话列表筛选 */
export class SessionQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}

/** 消息列表筛选 */
export class MessageQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsIn(['USER', 'ASSISTANT'])
  role?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}
