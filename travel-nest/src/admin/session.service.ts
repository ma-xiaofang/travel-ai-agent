import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MemoryService } from '../memory/memory.service.js';
import { MessageRole } from '../../generated/prisma/client.js';
import type { MessageQueryDto, SessionQueryDto } from './dto/index.js';

/** 管理后台 — 会话只读观测 */
@Injectable()
export class AdminSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memoryService: MemoryService,
  ) {}

  async listSessions(query: SessionQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ChatSessionWhereInput = {};

    if (query.userId) {
      where.userId = { contains: query.userId, mode: 'insensitive' };
    }
    if (query.keyword) {
      where.OR = [
        { title: { contains: query.keyword, mode: 'insensitive' } },
        { userId: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.chatSession.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.chatSession.count({ where }),
    ]);

    const userLabels = await this.resolveUserLabels(
      rows.map((row) => row.userId),
    );

    return {
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        userId: row.userId,
        userLabel: userLabels.get(row.userId) ?? row.userId,
        messageCount: row._count.messages,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  async listMessages(query: MessageQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ChatMessageWhereInput = {};

    if (query.sessionId) {
      where.sessionId = query.sessionId;
    }
    if (query.role) {
      where.role = query.role as MessageRole;
    }
    if (query.keyword) {
      where.content = { contains: query.keyword, mode: 'insensitive' };
    }
    if (query.userId) {
      where.session = {
        userId: { contains: query.userId, mode: 'insensitive' },
      };
    }

    const [rows, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          sessionId: true,
          role: true,
          content: true,
          createdAt: true,
          session: {
            select: { title: true, userId: true },
          },
        },
      }),
      this.prisma.chatMessage.count({ where }),
    ]);

    const userLabels = await this.resolveUserLabels(
      rows.map((row) => row.session.userId),
    );

    return {
      items: rows.map((row) => ({
        id: row.id,
        sessionId: row.sessionId,
        sessionTitle: row.session.title,
        userId: row.session.userId,
        userLabel: userLabels.get(row.session.userId) ?? row.session.userId,
        role: row.role === MessageRole.USER ? 'user' : 'assistant',
        content: row.content,
        createdAt: row.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  async getSessionDetail(sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });
    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    const userLabels = await this.resolveUserLabels([session.userId]);
    const messages = await this.memoryService.getSessionMessages(sessionId);

    return {
      session: {
        id: session.id,
        title: session.title,
        userId: session.userId,
        userLabel: userLabels.get(session.userId) ?? session.userId,
        messageCount: session._count.messages,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      messages,
    };
  }

  private async resolveUserLabels(userIds: string[]) {
    const uniqueIds = [...new Set(userIds)];
    const registeredIds = uniqueIds.filter((id) => !id.startsWith('user_'));
    const map = new Map<string, string>();

    for (const id of uniqueIds) {
      if (id.startsWith('user_')) {
        map.set(id, `访客 · ${id}`);
      }
    }

    if (registeredIds.length === 0) {
      return map;
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: registeredIds } },
      select: { id: true, username: true, nickName: true, email: true },
    });

    for (const user of users) {
      map.set(
        user.id,
        user.nickName ?? user.username ?? user.email ?? user.id,
      );
    }

    for (const id of registeredIds) {
      if (!map.has(id)) {
        map.set(id, id);
      }
    }

    return map;
  }
}
