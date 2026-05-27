import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AgentService } from './agent.service.js';
import { ChatDto, CreateSessionDto } from './dto/chat.dto.js';
import { MemoryService } from '../memory/memory.service.js';
import { SessionService } from '../session/session.service.js';
import { ToolsService } from '../tools/tools.service.js';
import { TavilyService } from '../tavily/tavily.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import type { AuthUser } from '../auth/auth-user.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

@Controller('api/agent')
@UseGuards(RolesGuard)
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly memoryService: MemoryService,
    private readonly sessionService: SessionService,
    private readonly toolsService: ToolsService,
    private readonly config: ConfigService,
    private readonly tavilyService: TavilyService,
  ) {}

  @Post('chat/stream')
  async streamChat(
    @CurrentUser() user: AuthUser,
    @Body() body: ChatDto,
    @Res() res: Response,
  ) {
    const { sessionId, message } = body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      for await (const chunk of this.agentService.streamChat(
        user.userId,
        message,
        sessionId,
      )) {
        if (chunk.type === 'text') {
          res.write(
            `data: ${JSON.stringify({ type: 'text', content: chunk.content })}\n\n`,
          );
        } else if (chunk.type === 'reasoning') {
          res.write(
            `data: ${JSON.stringify({ type: 'reasoning', content: chunk.content })}\n\n`,
          );
        } else if (chunk.type === 'session') {
          res.write(
            `data: ${JSON.stringify({ type: 'session', sessionId: chunk.sessionId })}\n\n`,
          );
        }
      }
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (error: any) {
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`,
      );
    } finally {
      res.end();
    }
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  chat(@CurrentUser() user: AuthUser, @Body() body: ChatDto) {
    return this.agentService.chat(user.userId, body.message, body.sessionId);
  }

  @Post('sessions')
  async createSession(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateSessionDto,
  ) {
    const session = await this.sessionService.ensureSession(
      undefined,
      user.userId,
      body.title,
    );
    return {
      sessionId: session.id,
      userId: session.userId,
      title: session.title,
    };
  }

  @Get('sessions')
  listSessions(@CurrentUser() user: AuthUser) {
    return this.sessionService.listByUserId(user.userId);
  }

  @Get('history/:sessionId')
  async getHistory(
    @CurrentUser() user: AuthUser,
    @Param('sessionId') sessionId: string,
  ) {
    await this.sessionService.assertSessionOwner(sessionId, user.userId);
    const messages = await this.memoryService.getSessionMessages(sessionId);
    return { sessionId, count: messages.length, messages };
  }

  @Delete('history/:sessionId')
  async clearHistory(
    @CurrentUser() user: AuthUser,
    @Param('sessionId') sessionId: string,
  ) {
    await this.sessionService.assertSessionOwner(sessionId, user.userId);
    await this.memoryService.clearHistory(sessionId);
    return { success: true, message: `会话 ${sessionId} 的消息已清除` };
  }

  @Get('tools')
  getTools() {
    return { tools: this.toolsService.getToolMetadata() };
  }

  @Public()
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: '旅途 AI 旅行规划助手',
      llmProvider: 'deepseek',
      model: this.config.get<string>('DEEPSEEK_MODEL', 'deepseek-v4-flash'),
      webSearch: this.tavilyService.enabled ? 'tavily' : 'disabled',
      time: new Date().toISOString(),
    };
  }
}
