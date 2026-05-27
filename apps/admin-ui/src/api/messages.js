import http from './http'

/** 消息分页列表 */
export function listMessages(params) {
  return http.get('/admin/messages', { params })
}
