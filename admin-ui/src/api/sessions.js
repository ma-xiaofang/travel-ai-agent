import http from './http'

/** 会话分页列表 */
export function listSessions(params) {
  return http.get('/admin/sessions', { params })
}

/** 会话详情（含消息列表） */
export function getSessionDetail(id) {
  return http.get(`/admin/sessions/${id}`)
}
