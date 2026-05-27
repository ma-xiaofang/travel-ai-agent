import { IsOptional, IsString, MinLength } from 'class-validator';

export class ChatDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsString()
  @MinLength(1)
  message: string;
}

export class CreateSessionDto {
  @IsOptional()
  @IsString()
  title?: string;
}
