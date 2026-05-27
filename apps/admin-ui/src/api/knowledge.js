import http from './http'

/** 获取知识集合列表 */
export function listCollections() {
  return http.get('/admin/knowledge/collections')
}

/** 获取集合详情 */
export function getCollection(id) {
  return http.get(`/admin/knowledge/collections/${id}`)
}

/** 创建集合 */
export function createCollection(data) {
  return http.post('/admin/knowledge/collections', data)
}

/** 更新集合 */
export function updateCollection(id, data) {
  return http.patch(`/admin/knowledge/collections/${id}`, data)
}

/** 删除集合 */
export function deleteCollection(id) {
  return http.delete(`/admin/knowledge/collections/${id}`)
}

/** 获取文档分页列表 */
export function listDocuments(params) {
  return http.get('/admin/knowledge/documents', { params })
}

/** 获取文档详情 */
export function getDocument(id) {
  return http.get(`/admin/knowledge/documents/${id}`)
}

/** 创建文档草稿 */
export function createDocument(data) {
  return http.post('/admin/knowledge/documents', data)
}

/** 更新文档 */
export function updateDocument(id, data) {
  return http.patch(`/admin/knowledge/documents/${id}`, data)
}

/** 删除文档 */
export function deleteDocument(id) {
  return http.delete(`/admin/knowledge/documents/${id}`)
}

/** 触发 RAG 入库 */
export function indexDocument(id) {
  return http.post(`/admin/knowledge/documents/${id}/index`)
}

/** 获取文档分块列表 */
export function listChunks(documentId) {
  return http.get(`/admin/knowledge/documents/${documentId}/chunks`)
}

/** 获取仪表盘统计 */
export function getStats() {
  return http.get('/admin/stats')
}
