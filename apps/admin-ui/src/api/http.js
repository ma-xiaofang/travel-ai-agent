import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建主请求实例，所有 API 请求统一走 /api 前缀
const http = axios.create({ baseURL: '/api', timeout: 30000 })

// 刷新令牌专用实例，避免与主实例拦截器互相干扰
const refreshClient = axios.create({ baseURL: '/api', timeout: 30000 })

// 令牌刷新状态标记：防止并发 401 时重复刷新
let isRefreshing = false

// 刷新期间暂存的请求队列，刷新完成后统一重放
let pendingRequests = []

/**
 * 清除 localStorage 中的认证信息
 */
function clearAuthStorage() {
  localStorage.removeItem('adminAccessToken')
  localStorage.removeItem('adminRefreshToken')
  localStorage.removeItem('adminUser')
}

/**
 * 跳转到登录页（仅在非登录页时跳转，避免循环重定向）
 */
function redirectToLogin() {
  if (window.location.hash !== '#/login') {
    window.location.href = '/#/login'
  }
}

/**
 * 批量处理刷新期间暂存的请求
 * @param {Error|null} error - 刷新失败时传入错误对象，成功时传 null
 * @param {string|null} accessToken - 刷新成功后传入新的 accessToken
 */
function processPendingRequests(error, accessToken) {
  pendingRequests.forEach(({ resolve, reject }) => {
    if (error) {
      // 刷新失败：所有暂存请求统一 reject
      reject(error)
      return
    }
    // 刷新成功：所有暂存请求拿到新令牌后继续执行
    resolve(accessToken)
  })
  pendingRequests = []
}

// ============================================================
// 请求拦截器：自动在请求头中附加 accessToken
// ============================================================
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminAccessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ============================================================
// 响应拦截器：自动刷新 Token 并重试失败请求
// ============================================================
http.interceptors.response.use(
  // 成功回调：直接返回 response.data，简化调用方取值
  (res) => res.data,
  async (err) => {
    const originalConfig = err.config ?? {}
    const status = err.response?.status
    // 拦截刷新接口自身的错误，避免无限循环
    const isRefreshRequest = originalConfig.url?.includes('/auth/refresh')

    // 仅对非刷新请求、未重试过的 401 错误进行令牌刷新
    if (status === 401 && !isRefreshRequest && !originalConfig.__isRetryRequest) {
      const savedRefreshToken = localStorage.getItem('adminRefreshToken')

      // 没有 refreshToken：直接清空认证信息并跳转登录
      if (!savedRefreshToken) {
        clearAuthStorage()
        redirectToLogin()
        ElMessage.error('登录已过期，请重新登录')
        return Promise.reject(err)
      }

      // 已有请求正在刷新令牌，当前请求排队等待
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject })
        }).then((accessToken) => {
          // 拿到新令牌后，更新原请求头并重试
          originalConfig.headers = originalConfig.headers ?? {}
          originalConfig.headers.Authorization = `Bearer ${accessToken}`
          originalConfig.__isRetryRequest = true
          return http(originalConfig)
        })
      }

      // 首个 401 请求：发起令牌刷新
      isRefreshing = true
      try {
        const refreshRes = await refreshClient.post('/auth/refresh', {
          refreshToken: savedRefreshToken,
        })
        const nextAccessToken = refreshRes.data?.data?.accessToken
        const nextRefreshToken = refreshRes.data?.data?.refreshToken
        if (!nextAccessToken || !nextRefreshToken) {
          throw new Error('刷新令牌返回数据不完整')
        }

        // 更新本地存储的令牌
        localStorage.setItem('adminAccessToken', nextAccessToken)
        localStorage.setItem('adminRefreshToken', nextRefreshToken)
        // 释放所有排队请求
        processPendingRequests(null, nextAccessToken)

        // 重试当前请求
        originalConfig.headers = originalConfig.headers ?? {}
        originalConfig.headers.Authorization = `Bearer ${nextAccessToken}`
        originalConfig.__isRetryRequest = true
        return http(originalConfig)
      } catch (refreshErr) {
        // 刷新失败：拒绝所有排队请求，清空认证信息
        processPendingRequests(refreshErr, null)
        clearAuthStorage()
        redirectToLogin()
        ElMessage.error('登录已过期，请重新登录')
        return Promise.reject(refreshErr)
      } finally {
        // 无论成功或失败，重置刷新状态
        isRefreshing = false
      }
    }

    // 非 401 错误：直接提示并返回
    const msg = err.response?.data?.message ?? err.message
    if (status === 401) {
      clearAuthStorage()
      redirectToLogin()
    }
    ElMessage.error(msg)
    return Promise.reject(err)
  },
)

export default http
