import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AdminSessionService } from './session.service.js';
import { SessionQueryDto } from './dto/index.js';

/** 会话观测 — 仅 ADMIN，只读 */
@Controller('api/admin/sessions')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class SessionController {
  constructor(private readonly sessionService: AdminSessionService) {}

  @Get()
  listSessions(@Query() query: SessionQueryDto) {
    return this.sessionService.listSessions(query);
  }

  @Get(':id')
  getSessionDetail(@Param('id') id: string) {
    return this.sessionService.getSessionDetail(id);
  }
}
