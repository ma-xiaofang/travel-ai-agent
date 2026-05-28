import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, logout as logoutApi } from '@/api/auth'

/** 解码 JWT payload */
function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

/** 管理员认证状态 */
export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('adminAccessToken') ?? '')
  const refreshToken = ref(localStorage.getItem('adminRefreshToken') ?? '')
  const user = ref(JSON.parse(localStorage.getItem('adminUser') ?? 'null'))

  const isLoggedIn = computed(() => !!token.value && !!user.value)

  /** 管理员登录，非 ADMIN 角色拒绝 */
  async function login(credentials) {
    const res = await loginApi(credentials)
    // http 拦截器已解包为 { code, message, data: { accessToken, refreshToken } }
    const accessToken = res.data?.accessToken
    const nextRefreshToken = res.data?.refreshToken
    if (!accessToken) {
      throw new Error('登录失败，未获取到令牌')
    }
    if (!nextRefreshToken) {
      throw new Error('登录失败，未获取到刷新令牌')
    }

    const payload = parseJwt(accessToken)
    if (payload?.role !== 'ADMIN') {
      throw new Error('无管理权限，仅限管理员登录')
    }

    token.value = accessToken
    refreshToken.value = nextRefreshToken
    user.value = {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      role: payload.role,
    }
    localStorage.setItem('adminAccessToken', token.value)
    localStorage.setItem('adminRefreshToken', refreshToken.value)
    localStorage.setItem('adminUser', JSON.stringify(user.value))
  }

  async function logout() {
    const currentRefreshToken = refreshToken.value
    if (currentRefreshToken) {
      await logoutApi(currentRefreshToken).catch(() => {})
    }
    token.value = ''
    refreshToken.value = ''
    user.value = null
    localStorage.removeItem('adminAccessToken')
    localStorage.removeItem('adminRefreshToken')
    localStorage.removeItem('adminUser')
  }

  return { token, refreshToken, user, isLoggedIn, login, logout }
})
