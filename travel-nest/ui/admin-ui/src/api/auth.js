import http from './http'

/** 管理员登录 */
export function login(data) {
  return http.post('/auth/login', data)
}

/** 刷新令牌 */
export function refreshToken(token) {
  return http.post('/auth/refresh', { refreshToken: token })
}

/** 登出 */
export function logout(token) {
  return http.post('/auth/logout', { refreshToken: token })
}
