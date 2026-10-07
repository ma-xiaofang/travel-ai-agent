import { Injectable } from '@nestjs/common';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { MessageRole, Prisma } from '../../generated/prisma/client.js';
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

  /**
   * 写入一条消息，并裁剪超出 maxHistory 的旧消息。
   *
   * @returns 新建消息的 ID；内容为空（不落库）时返回 null
   */
  async addMessage(
    sessionId: string,
    role: MessageRole,
    content: string,
    artifact?: unknown,
  ): Promise<string | null> {
    if (!content.trim()) return null;

    const created = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role,
        content,
        // Prisma Json 字段不接受 undefined，null/缺省时落库为 DbNull
        artifact:
          artifact == null ? undefined : (artifact as Prisma.InputJsonValue),
      },
      select: { id: true },
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

    return created.id;
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
      id: row.id,
      role: row.role === MessageRole.USER ? 'user' : 'assistant',
      content: row.content,
      artifact: row.artifact ?? null,
      createdAt: row.createdAt,
    }));
  }

  /** 按 ID 查询消息归属信息（供编辑前校验会话归属） */
  async getMessage(messageId: string) {
    return this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, sessionId: true, role: true },
    });
  }

  /** 覆盖助手消息上的结构化结果（行程卡编辑保存） */
  async updateMessageArtifact(
    messageId: string,
    artifact: unknown,
  ): Promise<void> {
    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { artifact: artifact as Prisma.InputJsonValue },
    });
  }
}
