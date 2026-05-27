import { Injectable } from '@nestjs/common';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { MessageRole } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MemoryService {
  private readonly maxHistory = 20;

  constructor(private readonly prisma: PrismaService) {}

  async getHistory(sessionId: string): Promise<BaseMessage[]> {
    const rows = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: this.maxHistory,
    });

    return rows.map((row) =>
      row.role === MessageRole.USER
        ? new HumanMessage(row.content)
        : new AIMessage(row.content),
    );
  }

  async addMessage(
    sessionId: string,
    role: MessageRole,
    content: string,
  ): Promise<void> {
    if (!content.trim()) return;

    await this.prisma.chatMessage.create({
      data: { sessionId, role, content },
    });

    const overflow = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      skip: this.maxHistory,
      select: { id: true },
    });

    if (overflow.length > 0) {
      await this.prisma.chatMessage.deleteMany({
        where: { id: { in: overflow.map((row) => row.id) } },
      });
    }

    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });
  }

  async clearHistory(sessionId: string): Promise<void> {
    await this.prisma.chatMessage.deleteMany({ where: { sessionId } });
  }

  async getSessionMessages(sessionId: string) {
    const rows = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((row, index) => ({
      index,
      role: row.role === MessageRole.USER ? 'user' : 'assistant',
      content: row.content,
      createdAt: row.createdAt,
    }));
  }
}
