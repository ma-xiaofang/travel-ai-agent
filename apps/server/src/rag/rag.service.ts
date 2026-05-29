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

/**
 * RAG 知识库服务
 *
 * 负责知识库的写入与检索两条主链路：
 * - **写入**：文档分块 → 向量化写入向量库（PGVector）→ 同步元数据到 Prisma 知识表
 * - **检索**：向量相似度检索（可选基于资料调用大模型生成回答）
 *
 * 采用「向量库存向量、Prisma 存正文与元数据」的双写设计：
 * 正文以 Prisma 分块表为准，规避向量库 document 列的编码异常问题。
 */
@Injectable()
export class RagService {
  // 问答用 LLM，低温度（0.3）以保证回答稳定、贴合资料
  private readonly llm = createChatModel(0.3);

  // 文本分块器：500 字一块、重叠 50 字，分隔符兼顾中英文标点
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
   * 批量加载文档入库：分块 → 写入向量库（PGVector）→ 同步 Prisma 知识表。
   *
   * 单篇文档失败不影响其余文档（逐篇 try/catch，失败标记 FAILED 并记录错误）。
   *
   * @param dto 待加载文档及目标集合、创建人等信息
   * @returns 入库结果汇总（成功篇数、总块数、每篇明细）
   */
  async loadDocuments(dto: LoadDocumentsDto) {
    // 集合名优先级：入参 → 环境变量 → 默认值
    const collectionName =
      dto.collectionName ??
      this.configService.get<string>('RAG_COLLECTION_NAME') ??
      'travel-knowledge-base';

    // upsert 集合：不存在则创建，已存在则复用
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

      // 先落库文档记录并置为 PROCESSING，便于失败时回写状态
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
        // 将正文切分为带元数据的文本块
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

        // langchainDocs：写入向量库；chunkRows：写入 Prisma 分块表
        const langchainDocs: Document[] = [];
        const chunkRows: {
          id: string;
          documentId: string;
          chunkIndex: number;
          content: string;
          metadata: Record<string, unknown>;
        }[] = [];

        // 为每个块生成统一 chunkId，作为向量库与分块表之间的关联键
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

        // 写入向量库，返回各块对应的向量记录 ID（顺序与入参一致）
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

        // 入库成功，更新文档状态为 INDEXED 并记录块数
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
        // 单篇失败：标记 FAILED 并记录错误信息，不中断其余文档
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

  /**
   * 删除指定文档在向量库中的全部块。
   *
   * @param docId 文档 ID
   */
  async deleteDocumentVectors(docId: string): Promise<void> {
    await this.vectorStoreService.deleteByDocId(docId);
  }

  /**
   * 解析块的正文内容：优先从 Prisma 分块表读取。
   *
   * 向量库的 document 列可能存在编码异常，故以 Prisma 存储的正文为准；
   * 当缺少 chunkId 或分块表查不到时，回退使用向量库返回的 pageContent。
   *
   * @param pageContent 向量库返回的原始正文（回退值）
   * @param chunkId 块 ID，用于在 Prisma 分块表中精确定位
   * @returns 最终采用的正文内容
   */
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

  /**
   * 纯向量相似度检索，不调用大模型。
   *
   * 用于知识库调试或为其他工具提供原始检索片段。
   *
   * @param query 查询语句
   * @param topK 返回片段数量，默认 4
   * @returns 命中片段的正文与元数据列表
   */
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

  /**
   * RAG 问答：检索相关片段 + 严格基于资料由大模型生成回答。
   *
   * 流程：相似度检索（带距离分）→ 按阈值过滤 → 拼接上下文 →
   * 套用「仅依据资料作答」的提示词调用 LLM → 返回答案与来源。
   * 过滤后无命中时直接返回提示语，不调用大模型。
   *
   * @param question 用户问题
   * @param topK 检索片段数量，默认 3
   * @returns 问题、答案与来源片段（含相似度）
   */
  async query(question: string, topK = 3) {
    // 带距离分的相似度检索（距离越小越相关）
    const retrieved = await this.vectorStoreService.similaritySearchWithScore(
      question,
      topK,
    );

    // 最大可接受距离阈值：超过则视为不相关，过滤掉
    const maxDistance =
      parseFloat(
        this.configService.get<string>('RAG_MAX_DISTANCE') ?? '0.65',
      ) || 0.65;

    const filtered = retrieved.filter(([, score]) => score <= maxDistance);

    // 无相关片段：直接返回提示，避免大模型凭空作答
    if (!filtered.length) {
      return {
        question,
        answer: '知识库中没有找到相关内容！',
        sources: [],
      };
    }

    // 将命中片段编号拼接为上下文，注入提示词
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

    // 组装 LCEL 链：提示词 → LLM → 纯字符串输出
    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());
    const answer = await chain.invoke({ context, question });

    // 整理来源信息，将距离分转换为更直观的相似度（1 - 距离）
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
