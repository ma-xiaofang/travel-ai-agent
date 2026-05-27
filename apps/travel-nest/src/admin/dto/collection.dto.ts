import { IsOptional, IsString } from 'class-validator';

/** 创建/更新知识集合 */
export class CollectionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
