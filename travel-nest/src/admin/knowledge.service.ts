import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import type { KnowledgeCategory } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RagService } from '../rag/rag.service.js';
import { KnowledgeCategoryDto } from '../rag/dto/load-documents.dto.js';
import { CollectionDto, DocumentDto, DocumentQueryDto } from './dto/index.js';

/** 知识库管理服务 — 集合/文档/分块 CRUD */
@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ragService: RagService,
  ) {}

  // ─── 集合 ──────────────────────────────────────────

  listCollections() {
    return this.prisma.knowledgeCollection.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { documents: true } } },
    });
  }

  getCollection(id: string) {
    return this.prisma.knowledgeCollection.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { documents: true } } },
    }).catch(() => { throw new NotFoundException('集合不存在'); });
  }

  createCollection(dto: CollectionDto) {
    return this.prisma.knowledgeCollection.create({
      data: { name: dto.name, description: dto.description },
    });
  }

  async updateCollection(id: string, dto: CollectionDto) {
    await this.assertCollectionExists(id);
    return this.prisma.knowledgeCollection.update({
      where: { id },
      data: { name: dto.name, description: dto.description },
    });
  }

  async deleteCollection(id: string) {
    const col = await this.prisma.knowledgeCollection.findUnique({
      where: { id },
      include: { _count: { select: { documents: true } } },
    });
    if (!col) throw new NotFoundException('集合不存在');
    if (col._count.documents > 0) {
      throw new BadRequestException('集合下存在文档，无法删除');
    }
    return this.prisma.knowledgeCollection.delete({ where: { id } });
  }

  // ─── 文档 ──────────────────────────────────────────

  async listDocuments(query: DocumentQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.KnowledgeDocumentWhereInput = {};

    if (query.collectionId) where.collectionId = query.collectionId;
    if (query.category) where.category = query.category as any;
    if (query.status) where.status = query.status as any;
    if (query.keyword) {
      where.title = { contains: query.keyword, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.knowledgeDocument.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.knowledgeDocument.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async getDocument(id: string) {
    const doc = await this.prisma.knowledgeDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('文档不存在');
    return doc;
  }

  createDocument(dto: DocumentDto) {
    return this.prisma.knowledgeDocument.create({
      data: {
        collectionId: dto.collectionId,
        title: dto.title,
        category: (dto.category as KnowledgeCategory) ?? 'GENERAL',
        tags: dto.tags ?? [],
        source: dto.source,
        content: dto.content,
        status: 'DRAFT',
      },
    });
  }

  async updateDocument(id: string, dto: DocumentDto) {
    await this.assertDocumentExists(id);
    return this.prisma.knowledgeDocument.update({
      where: { id },
      data: {
        collectionId: dto.collectionId,
        title: dto.title,
        category: dto.category as KnowledgeCategory | undefined,
        tags: dto.tags,
        source: dto.source,
        content: dto.content,
      },
    });
  }

  async deleteDocument(id: string) {
    await this.assertDocumentExists(id);
    return this.prisma.knowledgeDocument.delete({ where: { id } });
  }

  /** 触发 RAG 入库（分块 + 向量），重新入库时先清理旧数据 */
  async indexDocument(id: string) {
    const doc = await this.prisma.knowledgeDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('文档不存在');
    if (doc.status === 'PROCESSING') {
      throw new BadRequestException('文档正在处理中');
    }

    await this.prisma.knowledgeDocument.update({
      where: { id },
      data: { status: 'PROCESSING', errorMessage: null },
    });

    await this.ragService.deleteDocumentVectors(id);
    await this.prisma.knowledgeChunk.deleteMany({ where: { documentId: id } });

    try {
      const result = await this.ragService.loadDocuments({
        documents: [{
          id: doc.id,
          title: doc.title ?? undefined,
          content: doc.content,
          category: doc.category as unknown as KnowledgeCategoryDto,
          tags: (doc.tags as unknown as string[]) ?? [],
          source: doc.source ?? undefined,
        }],
        collectionName: undefined,
      });

      return { status: 'INDEXED', chunkCount: result.totalChunks, result };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '入库失败';
      await this.prisma.knowledgeDocument.update({
        where: { id },
        data: { status: 'FAILED', errorMessage: message },
      });
      throw new BadRequestException(message);
    }
  }

  // ─── 分块 ──────────────────────────────────────────

  async listChunks(documentId: string) {
    await this.assertDocumentExists(documentId);
    return this.prisma.knowledgeChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
      select: {
        id: true,
        chunkIndex: true,
        content: true,
        embeddingId: true,
        metadata: true,
        createdAt: true,
      },
    });
  }

  // ─── 辅助 ──────────────────────────────────────────

  private async assertCollectionExists(id: string) {
    const c = await this.prisma.knowledgeCollection.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('集合不存在');
  }

  private async assertDocumentExists(id: string) {
    const d = await this.prisma.knowledgeDocument.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('文档不存在');
  }
}
