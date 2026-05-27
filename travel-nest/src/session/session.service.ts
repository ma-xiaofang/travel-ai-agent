import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  /** 确保会话存在且属于当前用户；无 sessionId 或无效时创建新会话 */
  async ensureSession(
    sessionId: string | undefined,
    userId: string,
    title?: string,
  ) {
    if (sessionId) {
      const existing = await this.prisma.chatSession.findUnique({
        where: { id: sessionId },
      });
      if (existing) {
        if (existing.userId !== userId) {
          throw new ForbiddenException('无权访问该会话');
        }
        return existing;
      }
    }

    return this.prisma.chatSession.create({
      data: { userId, title: title?.trim() || undefined },
    });
  }

  /** 校验会话归属，失败时抛出 403/404 */
  async assertSessionOwner(sessionId: string, userId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('会话不存在');
    }
    if (session.userId !== userId) {
      throw new ForbiddenException('无权访问该会话');
    }
    return session;
  }

  /** 更新会话标题（由 Agent Tool 调用，调用方需已校验 session 归属） */
  async updateTitle(sessionId: string, title: string) {
    const normalized = title.trim().slice(0, 50);
    if (!normalized) {
      return { updated: false, title: null };
    }

    const session = await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { title: normalized },
      select: { id: true, title: true },
    });

    return { updated: true, title: session.title };
  }

  /** 按用户列出会话（历史侧栏用） */
  async listByUserId(userId: string, limit = 20) {
    return this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });
  }
}
