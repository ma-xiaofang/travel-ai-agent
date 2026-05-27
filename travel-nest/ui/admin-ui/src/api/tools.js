import http from './http'

/** 获取全部工具元数据列表 */
export function listTools() {
  return http.get('/tools')
}

/** 调用指定工具 */
export function invokeTool(name, params) {
  return http.post(`/tools/${name}`, params)
}
