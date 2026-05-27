import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export enum KnowledgeCategoryDto {
  GENERAL = 'GENERAL',
  ATTRACTION_GUIDE = 'ATTRACTION_GUIDE',
  ATTRACTION_FACT = 'ATTRACTION_FACT',
  VISA = 'VISA',
  DESTINATION = 'DESTINATION',
  TRANSPORT = 'TRANSPORT',
  ACCOMMODATION = 'ACCOMMODATION',
  FOOD = 'FOOD',
  CUSTOMS = 'CUSTOMS',
  SAFETY = 'SAFETY',
  CULTURE = 'CULTURE',
  POLICY = 'POLICY',
}

export class DocumentItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsEnum(KnowledgeCategoryDto)
  category?: KnowledgeCategoryDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class LoadDocumentsDto {
  @IsOptional()
  @IsString()
  collectionName?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentItemDto)
  documents: DocumentItemDto[];
}
