import { Document } from '@langchain/core/documents';

export const VECTOR_STORE_SERVICE = 'VECTOR_STORE_SERVICE';

/** 向量库服务抽象，便于切换 PGVector / 其他实现 */
export interface VectorStoreService {
  /** 写入文档到向量库，返回每个文档对应的 embedding 行 UUID */
  addDocuments(documents: Document[]): Promise<string[]>;
  similaritySearch(query: string, topK?: number): Promise<Document[]>;
  similaritySearchWithScore(
    query: string,
    topK?: number,
  ): Promise<[Document, number][]>;
  /** 按文档 ID 删除向量（metadata.docId） */
  deleteByDocId(docId: string): Promise<void>;
}
