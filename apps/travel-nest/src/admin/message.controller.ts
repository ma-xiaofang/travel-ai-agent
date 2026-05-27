import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AdminSessionService } from './session.service.js';
import { MessageQueryDto } from './dto/index.js';

/** 消息管理 — 仅 ADMIN，只读 */
@Controller('api/admin/messages')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class MessageController {
  constructor(private readonly sessionService: AdminSessionService) {}

  @Get()
  listMessages(@Query() query: MessageQueryDto) {
    return this.sessionService.listMessages(query);
  }
}
