import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DistanceStrategy,
  PGVectorStore,
} from '@langchain/community/vectorstores/pgvector';
import { ZhipuAIEmbeddings } from '@langchain/community/embeddings/zhipuai';
import { Document } from '@langchain/core/documents';
import { Pool } from 'pg';
import { VectorStoreService } from './vector-store.interface.js';

/**
 * PGVector 向量库服务
 *
 * 基于 PostgreSQL 的 pgvector 扩展，封装 {@link VectorStoreService} 接口：
 * 组合 ZhipuAI Embedding 模型、pg 连接池与 LangChain `PGVectorStore`，
 * 提供文档向量化写入、相似度检索与按文档删除等能力。
 *
 * 向量库实例采用懒加载 + 单飞（single-flight）初始化，并在初始化时
 * 自愈式补齐集合表结构（建表、唯一索引、外键、默认集合）。
 */
@Injectable()
export class PgvectorService implements VectorStoreService {
  // LangChain 约定的集合表与向量表名
  private static readonly COLLECTION_TABLE = 'langchain_pg_collection';
  private static readonly EMBEDDING_TABLE = 'langchain_pg_embedding';
  /** 数据库连接池 */
  private readonly pool: Pool;
  /** 向量模型 */
  private readonly embeddings: ZhipuAIEmbeddings;
  /** 知识库名称 */
  private readonly collectionName: string;
  /** 向量库实例 */
  private vectorStore: PGVectorStore | null = null;
  /** 向量库初始化 Promise */
  private vectorStoreInitPromise: Promise<PGVectorStore> | null = null;
  /** 向量库配置 */
  private readonly pgVectorConfig;

  constructor(private readonly configService: ConfigService) {
    this.collectionName =
      this.configService.get<string>('RAG_COLLECTION_NAME') ??
      'travel-knowledge-base';

    this.pool = new Pool({
      connectionString: this.configService.get('DATABASE_URL'),
      // 显式 UTF-8，避免 Windows 环境下中文乱码
      options: '-c client_encoding=UTF8',
    });
    const embeddingModel =
      this.configService.get<string>('RAG_EMBEDDING_MODEL') ?? 'embedding-3';

    // 向量模型：根据环境变量选择 embedding-2 或 embedding-3
    this.embeddings = new ZhipuAIEmbeddings({
      apiKey: this.configService.get('ZHIPU_API_KEY'),
      modelName:
        embeddingModel === 'embedding-2' ? 'embedding-2' : 'embedding-3',
    });
    // 向量库配置：指定表名、列名、距离策略等
    this.pgVectorConfig = {
      pool: this.pool,
      collectionName: this.collectionName,
      collectionTableName: PgvectorService.COLLECTION_TABLE,
      tableName: PgvectorService.EMBEDDING_TABLE,
      skipInitializationCheck: true,
      columns: {
        idColumnName: 'id',
        vectorColumnName: 'embedding',
        contentColumnName: 'document',
        metadataColumnName: 'cmetadata',
      },
      distanceStrategy: 'cosine' as DistanceStrategy,
    };
  }

  /**
   * 写入文档向量，并返回各块对应的向量行 UUID。
   *
   * 由于 `PGVectorStore.addDocuments` 不直接返回写入行的主键，
   * 这里通过元数据中的 chunkId 回查 embedding 表，按入参顺序关联出 UUID，
   * 供上层（RAG 分块表）建立 chunkId → embeddingId 的映射。
   *
   * @param documents 待写入的 LangChain 文档（元数据需含 chunkId）
   * @returns 与含 chunkId 的文档一一对应的向量行 UUID 列表
   */
  async addDocuments(documents: Document[]): Promise<string[]> {
    const vectorStore = await this.getVectorStore();
    await vectorStore.addDocuments(documents);

    // 回查 embedding 行 UUID，按 chunkId 关联
    const chunkIds = documents
      .map((doc) => doc.metadata?.chunkId as string | undefined)
      .filter(Boolean);
    if (chunkIds.length === 0) return [];

    // 用 chunkId 批量回查向量行主键 id
    const result = await this.pool.query(
      `
      SELECT id, cmetadata->>'chunkId' AS chunk_id
      FROM ${PgvectorService.EMBEDDING_TABLE}
      WHERE cmetadata->>'chunkId' = ANY($1)
      `,
      [chunkIds],
    );

    // 按 chunkId → id 建立映射，再按入参 chunkIds 顺序输出，保证顺序一致
    const idMap = new Map(
      result.rows.map(
        (row: { id: string; chunk_id: string }) => [row.chunk_id, row.id],
      ),
    );
    return chunkIds
      .map((chunkId) => idMap.get(chunkId))
      .filter((id): id is string => !!id);
  }

  /**
   * 相似度检索（不带分数）。
   *
   * @param query 查询语句
   * @param topK 返回数量，默认 4
   * @returns 命中文档列表
   */
  async similaritySearch(query: string, topK = 4): Promise<Document[]> {
    const vectorStore = await this.getVectorStore();
    return vectorStore.similaritySearch(query, topK);
  }

  /**
   * 相似度检索（带距离分数）。
   *
   * @param query 查询语句
   * @param topK 返回数量，默认 4
   * @returns `[文档, 距离分]` 元组列表（余弦距离，越小越相关）
   */
  async similaritySearchWithScore(
    query: string,
    topK = 4,
  ): Promise<[Document, number][]> {
    const vectorStore = await this.getVectorStore();
    return vectorStore.similaritySearchWithScore(query, topK);
  }

  /**
   * 按文档 ID 删除其全部向量块（依据元数据 docId 过滤）。
   *
   * @param docId 文档 ID
   */
  async deleteByDocId(docId: string): Promise<void> {
    const vectorStore = await this.getVectorStore();
    await vectorStore.delete({ filter: { docId } });
  }

  /**
   * 获取向量库实例（懒加载 + 单飞）。
   *
   * 已初始化则直接复用；正在初始化则复用同一 Promise，
   * 避免并发请求触发重复初始化。
   */
  private async getVectorStore(): Promise<PGVectorStore> {
    // 已初始化：直接复用
    if (this.vectorStore) return this.vectorStore;
    // 初始化进行中：复用同一 Promise，防止并发重复初始化
    if (this.vectorStoreInitPromise) return this.vectorStoreInitPromise;

    // 初始化向量库
    this.vectorStoreInitPromise = this.initializeVectorStore();
    try {
      this.vectorStore = await this.vectorStoreInitPromise;
      return this.vectorStore;
    } finally {
      // 无论成败都清空 in-flight Promise，失败时允许下次重试
      this.vectorStoreInitPromise = null;
    }
  }

  /**
   * 初始化 PGVectorStore 并补齐集合表结构。
   *
   * 对并发首次初始化时可能出现的「collection_id 列重复（42701）」错误做容错：
   * 该错误意味着列已被另一并发流程补上，可安全重试一次。
   */
  private async initializeVectorStore(): Promise<PGVectorStore> {
    let store: PGVectorStore;
    try {
      store = await PGVectorStore.initialize(
        this.embeddings,
        this.pgVectorConfig,
      );
    } catch (error: unknown) {
      // 42701 = duplicate_column，多为并发初始化导致，重试一次即可
      const duplicateColumnErrorCode = '42701';
      if (
        this.isPgError(error) &&
        error.code === duplicateColumnErrorCode &&
        error.message.includes('collection_id')
      ) {
        store = await PGVectorStore.initialize(
          this.embeddings,
          this.pgVectorConfig,
        );
      } else {
        throw error;
      }
    }
    await this.ensureCollectionSchemaReady();
    return store;
  }

  /**
   * 幂等地补齐集合相关表结构。
   *
   * 全部语句均为「IF NOT EXISTS / ON CONFLICT」幂等写法，可重复执行：
   * 启用 pgcrypto 扩展 → 建集合表 → 建名称唯一索引 →
   * 为向量表补 collection_id 列与外键 → 插入默认集合记录。
   */
  private async ensureCollectionSchemaReady(): Promise<void> {
    const collectionTable = PgvectorService.COLLECTION_TABLE;
    const embeddingTable = PgvectorService.EMBEDDING_TABLE;
    const foreignKeyName = `${embeddingTable}_collection_id_fkey`;

    await this.pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${collectionTable} (
        uuid uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        name character varying,
        cmetadata jsonb
      );
    `);
    await this.pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_${collectionTable}_name
      ON ${collectionTable}(name);
    `);
    await this.pool.query(`
      ALTER TABLE ${embeddingTable}
      ADD COLUMN IF NOT EXISTS collection_id uuid;
    `);
    await this.pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = '${foreignKeyName}'
        ) THEN
          ALTER TABLE ${embeddingTable}
          ADD CONSTRAINT ${foreignKeyName}
          FOREIGN KEY (collection_id)
          REFERENCES ${collectionTable}(uuid)
          ON DELETE CASCADE;
        END IF;
      END
      $$;
    `);
    await this.pool.query(
      `
      INSERT INTO ${collectionTable}(name, cmetadata)
      VALUES ($1, '{}'::jsonb)
      ON CONFLICT DO NOTHING;
      `,
      [this.collectionName],
    );
  }

  /** 类型守卫：判断是否为带 message（及可选 code）的 PG 错误对象 */
  private isPgError(
    error: unknown,
  ): error is { code?: string; message: string } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as { message: unknown }).message === 'string'
    );
  }
}
