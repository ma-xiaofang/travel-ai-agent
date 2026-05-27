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
 * PGVector 向量库：Embedding + 连接池 + LangChain PGVectorStore。
 */
@Injectable()
export class PgvectorService implements VectorStoreService {
  private static readonly COLLECTION_TABLE = 'langchain_pg_collection';
  private static readonly EMBEDDING_TABLE = 'langchain_pg_embedding';

  private readonly pool: Pool;
  private readonly embeddings: ZhipuAIEmbeddings;
  private readonly collectionName: string;
  private vectorStore: PGVectorStore | null = null;
  private vectorStoreInitPromise: Promise<PGVectorStore> | null = null;
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
    this.embeddings = new ZhipuAIEmbeddings({
      apiKey: this.configService.get('ZHIPU_API_KEY'),
      modelName:
        embeddingModel === 'embedding-2' ? 'embedding-2' : 'embedding-3',
    });
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

  async addDocuments(documents: Document[]): Promise<string[]> {
    const vectorStore = await this.getVectorStore();
    await vectorStore.addDocuments(documents);

    // 回查 embedding 行 UUID，按 chunkId 关联
    const chunkIds = documents
      .map((doc) => doc.metadata?.chunkId as string | undefined)
      .filter(Boolean);
    if (chunkIds.length === 0) return [];

    const result = await this.pool.query(
      `
      SELECT id, cmetadata->>'chunkId' AS chunk_id
      FROM ${PgvectorService.EMBEDDING_TABLE}
      WHERE cmetadata->>'chunkId' = ANY($1)
      `,
      [chunkIds],
    );

    const idMap = new Map(
      result.rows.map(
        (row: { id: string; chunk_id: string }) => [row.chunk_id, row.id],
      ),
    );
    return chunkIds
      .map((chunkId) => idMap.get(chunkId))
      .filter((id): id is string => !!id);
  }

  async similaritySearch(query: string, topK = 4): Promise<Document[]> {
    const vectorStore = await this.getVectorStore();
    return vectorStore.similaritySearch(query, topK);
  }

  async similaritySearchWithScore(
    query: string,
    topK = 4,
  ): Promise<[Document, number][]> {
    const vectorStore = await this.getVectorStore();
    return vectorStore.similaritySearchWithScore(query, topK);
  }

  async deleteByDocId(docId: string): Promise<void> {
    const vectorStore = await this.getVectorStore();
    await vectorStore.delete({ filter: { docId } });
  }

  private async getVectorStore(): Promise<PGVectorStore> {
    if (this.vectorStore) {
      return this.vectorStore;
    }
    if (this.vectorStoreInitPromise) {
      return this.vectorStoreInitPromise;
    }

    this.vectorStoreInitPromise = this.initializeVectorStore();
    try {
      this.vectorStore = await this.vectorStoreInitPromise;
      return this.vectorStore;
    } finally {
      this.vectorStoreInitPromise = null;
    }
  }

  private async initializeVectorStore(): Promise<PGVectorStore> {
    let store: PGVectorStore;
    try {
      store = await PGVectorStore.initialize(
        this.embeddings,
        this.pgVectorConfig,
      );
    } catch (error: unknown) {
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
