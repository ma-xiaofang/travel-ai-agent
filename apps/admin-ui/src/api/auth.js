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

/** 获取当前登录管理员资料 */
export function fetchMe() {
  return http.get('/auth/me')
}

/** 更新当前登录管理员头像 */
export function updateMyAvatar(avatar) {
  return http.patch('/auth/me', { avatar })
}
