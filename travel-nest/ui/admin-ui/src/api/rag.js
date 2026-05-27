import http from './http'

/** 向量检索 */
export function searchRag(question, topK = 4) {
  return http.post('/rag/search', { question, topK })
}

/** RAG 问答 */
export function queryRag(question, topK = 3) {
  return http.post('/rag/query', { question, topK })
}
