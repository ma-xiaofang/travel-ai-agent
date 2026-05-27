import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller.js';
import { AgentService } from './agent.service.js';
import { ToolsModule } from '../tools/tools.module.js';
import { SessionModule } from '../session/session.module.js';
import { TavilyModule } from '../tavily/tavily.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule, ToolsModule, SessionModule, TavilyModule],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
