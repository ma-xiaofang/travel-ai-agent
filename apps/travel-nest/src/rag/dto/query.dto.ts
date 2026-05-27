import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryDto {
  @IsString()
  question: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number;
}
