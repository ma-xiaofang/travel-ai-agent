import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

/** 创建/更新知识文档 */
export class DocumentDto {
  @IsString()
  collectionId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsIn([
    'GENERAL', 'ATTRACTION_GUIDE', 'ATTRACTION_FACT', 'VISA',
    'DESTINATION', 'TRANSPORT', 'ACCOMMODATION', 'FOOD',
    'CUSTOMS', 'SAFETY', 'CULTURE', 'POLICY',
  ])
  category?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  source?: string;

  @IsString()
  content: string;
}
