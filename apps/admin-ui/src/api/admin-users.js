import http from './http'

/** 注册用户分页列表 */
export function listUsers(params) {
  return http.get('/admin/users', { params })
}

/** 编辑用户（角色、昵称等） */
export function updateUser(id, data) {
  return http.patch(`/admin/users/${id}`, data)
}

/** 全部用户旅行偏好列表 */
export function listPreferences(params) {
  return http.get('/admin/users/preferences', { params })
}

/** 单个用户旅行偏好详情 */
export function getUserPreferences(userId) {
  return http.get(`/admin/users/${userId}/preferences`)
}

/** 更新用户旅行偏好 */
export function updateUserPreferences(userId, data) {
  return http.patch(`/admin/users/${userId}/preferences`, data)
}
