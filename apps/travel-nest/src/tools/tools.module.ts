import { Module } from '@nestjs/common';
import { RagModule } from '../rag/rag.module.js';
import { SessionModule } from '../session/session.module.js';
import { TavilyModule } from '../tavily/tavily.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ToolsController } from './tools.controller.js';
import { ToolsService } from './tools.service.js';

@Module({
  imports: [AuthModule, SessionModule, RagModule, TavilyModule],
  controllers: [ToolsController],
  providers: [ToolsService],
  exports: [ToolsService],
})
export class ToolsModule {}
