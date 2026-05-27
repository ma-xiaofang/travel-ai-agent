import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/** 仪表盘统计服务 */
@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalDocs, indexedDocs, processingDocs, failedDocs,
      todayDocs, totalSessions, totalMessages,
    ] = await Promise.all([
      this.prisma.knowledgeDocument.count(),
      this.prisma.knowledgeDocument.count({ where: { status: 'INDEXED' } }),
      this.prisma.knowledgeDocument.count({ where: { status: 'PROCESSING' } }),
      this.prisma.knowledgeDocument.count({ where: { status: 'FAILED' } }),
      this.prisma.knowledgeDocument.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.chatSession.count(),
      this.prisma.chatMessage.count(),
    ]);

    return {
      totalDocs, indexedDocs, processingDocs, failedDocs,
      todayDocs, totalSessions, totalMessages,
    };
  }
}
