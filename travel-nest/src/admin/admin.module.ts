import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller.js';
import { StatsService } from './stats.service.js';
import { KnowledgeController } from './knowledge.controller.js';
import { KnowledgeService } from './knowledge.service.js';
import { SessionController } from './session.controller.js';
import { MessageController } from './message.controller.js';
import { AdminSessionService } from './session.service.js';
import { AdminUsersController } from './users.controller.js';
import { AdminUsersService } from './users.service.js';
import { RagModule } from '../rag/rag.module.js';

/** 管理后台模块 — 知识库运营、仪表盘统计、用户管理（仅 ADMIN） */
@Module({
  imports: [RagModule],
  controllers: [
    StatsController,
    KnowledgeController,
    SessionController,
    MessageController,
    AdminUsersController,
  ],
  providers: [StatsService, KnowledgeService, AdminSessionService, AdminUsersService],
})
export class AdminModule {}
