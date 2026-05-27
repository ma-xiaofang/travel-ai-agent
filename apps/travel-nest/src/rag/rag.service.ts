import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { createChatModel } from '../llm/create-chat-model.js';
import { VECTOR_STORE_SERVICE } from './vector-store.interface.js';
import type { VectorStoreService } from './vector-store.interface.js';
import type { LoadDocumentsDto } from './dto/index.js';

@Injectable()
export class RagService {
  private readonly llm = createChatModel(0.3);

  private readonly splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
    separators: ['\n\n', '\n', '。', '！', '？', ' ', ''],
  });

  constructor(
    @Inject(VECTOR_STORE_SERVICE)
    private readonly vectorStoreService: VectorStoreService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 加载文档：分块 → 写入 PGVector → 同步 Prisma 知识表。
   */
  async loadDocuments(dto: LoadDocumentsDto) {
    const collectionName =
      dto.collectionName ??
      this.configService.get<string>('RAG_COLLECTION_NAME') ??
      'travel-knowledge-base';

    const collection = await this.prisma.knowledgeCollection.upsert({
      where: { name: collectionName },
      create: { name: collectionName },
      update: {},
    });

    const results: {
      documentId: string;
      status: string;
      chunkCount?: number;
      error?: string;
    }[] = [];

    let totalChunks = 0;

    for (const doc of dto.documents) {
      const documentId = doc.id ?? randomUUID();

      await this.prisma.knowledgeDocument.upsert({
        where: { id: documentId },
        create: {
          id: documentId,
          collectionId: collection.id,
          title: doc.title,
          content: doc.content,
          source: doc.source,
          category: doc.category ?? 'GENERAL',
          tags: doc.tags ?? [],
          status: 'PROCESSING',
          createdBy: dto.createdBy,
        },
        update: {
          title: doc.title,
          content: doc.content,
          source: doc.source,
          category: doc.category ?? 'GENERAL',
          tags: doc.tags ?? [],
          status: 'PROCESSING',
          createdBy: dto.createdBy,
          errorMessage: null,
        },
      });

      try {
        const splitDocs = await this.splitter.createDocuments(
          [doc.content],
          [
            {
              source: doc.source ?? doc.title ?? documentId,
              docId: documentId,
              collectionId: collection.id,
              category: doc.category ?? 'GENERAL',
            },
          ],
        );

        const langchainDocs: Document[] = [];
        const chunkRows: {
          id: string;
          documentId: string;
          chunkIndex: number;
          content: string;
          metadata: Record<string, unknown>;
        }[] = [];

        splitDocs.forEach((chunk, index) => {
          const chunkId = randomUUID();
          chunkRows.push({
            id: chunkId,
            documentId,
            chunkIndex: index,
            content: chunk.pageContent,
            metadata: {
              ...(chunk.metadata as Record<string, unknown>),
              chunkId,
              chunkIndex: index,
            },
          });
          langchainDocs.push(
            new Document({
              pageContent: chunk.pageContent,
              metadata: {
                source: doc.source ?? doc.title ?? documentId,
                docId: documentId,
                chunkId,
                chunkIndex: index,
                collectionId: collection.id,
                category: doc.category ?? 'GENERAL',
              },
            }),
          );
        });

        const embeddingIds =
          await this.vectorStoreService.addDocuments(langchainDocs);

        if (chunkRows.length > 0) {
          // 按索引位置关联：embeddingIds[i] 对应 langchainDocs[i].metadata.chunkId
          const chunkIdToEmbeddingId = new Map<string, string>();
          for (let i = 0; i < langchainDocs.length && i < embeddingIds.length; i++) {
            const cId = langchainDocs[i].metadata?.chunkId as string | undefined;
            if (cId && embeddingIds[i]) {
              chunkIdToEmbeddingId.set(cId, embeddingIds[i]);
            }
          }

          await this.prisma.knowledgeChunk.createMany({
            data: chunkRows.map((row) => ({
              id: row.id,
              documentId: row.documentId,
              chunkIndex: row.chunkIndex,
              content: row.content,
              embeddingId: chunkIdToEmbeddingId.get(row.id) ?? null,
              metadata: row.metadata as Prisma.InputJsonValue,
            })),
          });
        }

        await this.prisma.knowledgeDocument.update({
          where: { id: documentId },
          data: {
            status: 'INDEXED',
            chunkCount: chunkRows.length,
            errorMessage: null,
          },
        });

        totalChunks += chunkRows.length;
        results.push({
          documentId,
          status: 'INDEXED',
          chunkCount: chunkRows.length,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : '文档入库失败';
        await this.prisma.knowledgeDocument.update({
          where: { id: documentId },
          data: { status: 'FAILED', errorMessage: message },
        });
        results.push({ documentId, status: 'FAILED', error: message });
      }
    }

    const successCount = results.filter((r) => r.status === 'INDEXED').length;

    return {
      collectionName,
      collectionId: collection.id,
      originalDocs: dto.documents.length,
      successDocs: successCount,
      totalChunks,
      results,
      message: `已入库 ${successCount}/${dto.documents.length} 篇文档（共 ${totalChunks} 个块）`,
    };
  }

  /** 删除指定文档在向量库中的全部块 */
  async deleteDocumentVectors(docId: string): Promise<void> {
    await this.vectorStoreService.deleteByDocId(docId);
  }

  /** 优先从 Prisma 分块表取正文，避免向量库 document 列编码异常 */
  private async resolveChunkContent(
    pageContent: string,
    chunkId?: string,
  ): Promise<string> {
    if (!chunkId) return pageContent;
    const chunk = await this.prisma.knowledgeChunk.findUnique({
      where: { id: chunkId },
      select: { content: true },
    });
    return chunk?.content ?? pageContent;
  }

  /** 纯向量检索，不调用大模型 */
  async searchVectorStore(query: string, topK = 4) {
    const docs = await this.vectorStoreService.similaritySearch(query, topK);
    return Promise.all(
      docs.map(async (doc) => ({
        content: await this.resolveChunkContent(
          doc.pageContent,
          doc.metadata?.chunkId as string | undefined,
        ),
        metadata: doc.metadata,
      })),
    );
  }

  /** RAG 问答：检索 + 基于资料生成回答 */
  async query(question: string, topK = 3) {
    const retrieved = await this.vectorStoreService.similaritySearchWithScore(
      question,
      topK,
    );

    const maxDistance =
      parseFloat(
        this.configService.get<string>('RAG_MAX_DISTANCE') ?? '0.65',
      ) || 0.65;

    const filtered = retrieved.filter(([, score]) => score <= maxDistance);

    if (!filtered.length) {
      return {
        question,
        answer: '知识库中没有找到相关内容！',
        sources: [],
      };
    }

    const context = filtered
      .map(([doc], i) => `[${i + 1}] ${doc.pageContent}`)
      .join('\n\n');

    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `你是「旅途」旅行知识库问答助手，严格基于知识库资料回答。
规则：
1. 只根据参考资料回答，不能使用资料外的知识
2. 资料中没有相关信息，回答「知识库中暂无相关内容」
3. 回答简洁准确，使用中文
参考资料：
{context}`,
      ],
      ['human', '{question}'],
    ]);

    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());
    const answer = await chain.invoke({ context, question });

    const sources = await Promise.all(
      filtered.map(async ([doc, score]) => ({
        content: await this.resolveChunkContent(
          doc.pageContent,
          doc.metadata?.chunkId as string | undefined,
        ),
        source: doc.metadata?.source,
        docId: doc.metadata?.docId,
        chunkId: doc.metadata?.chunkId,
        similarity: parseFloat((1 - score).toFixed(4)),
      })),
    );

    return {
      question,
      answer,
      sources,
    };
  }
}
