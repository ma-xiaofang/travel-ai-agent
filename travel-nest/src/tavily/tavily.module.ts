import { Module } from '@nestjs/common';
import { TavilyService } from './tavily.service.js';

@Module({
  providers: [TavilyService],
  exports: [TavilyService],
})
export class TavilyModule {}
