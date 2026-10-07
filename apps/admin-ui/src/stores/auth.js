import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, logout as logoutApi, fetchMe, updateMyAvatar } from '@/api/auth'

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

  /** 顶栏展示名：优先昵称，其次用户名 */
  const displayName = computed(() => user.value?.nickName || user.value?.username || '管理员')

  /** 当前用户头像 URL */
  const avatar = computed(() => user.value?.avatar ?? '')

  /** 将当前用户信息同步到 localStorage */
  function persistUser() {
    if (user.value) {
      localStorage.setItem('adminUser', JSON.stringify(user.value))
    } else {
      localStorage.removeItem('adminUser')
    }
  }

  /** 把后端返回的用户资料合并进本地 user */
  function mergeUser(profile) {
    user.value = { ...(user.value ?? {}), ...profile, userId: profile.id ?? user.value?.userId }
    persistUser()
  }

  /** 拉取当前登录用户资料（刷新头像/昵称等） */
  async function fetchProfile() {
    const res = await fetchMe()
    if (res?.data) {
      mergeUser(res.data)
    }
  }

  /** 更新当前登录用户头像 */
  async function updateAvatar(url) {
    const res = await updateMyAvatar(url)
    if (res?.data) {
      mergeUser(res.data)
    }
  }

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
    persistUser()
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

  return { token, refreshToken, user, isLoggedIn, displayName, avatar, login, logout, fetchProfile, updateAvatar }
})
