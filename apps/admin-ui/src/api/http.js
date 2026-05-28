import axios from 'axios'
import { ElMessage } from 'element-plus'

const http = axios.create({ baseURL: '/api', timeout: 30000 })
const refreshClient = axios.create({ baseURL: '/api', timeout: 30000 })
let isRefreshing = false
let pendingRequests = []

function clearAuthStorage() {
  localStorage.removeItem('adminAccessToken')
  localStorage.removeItem('adminRefreshToken')
  localStorage.removeItem('adminUser')
}

function redirectToLogin() {
  if (window.location.hash !== '#/login') {
    window.location.href = '/#/login'
  }
}

function processPendingRequests(error, accessToken) {
  pendingRequests.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
      return
    }
    resolve(accessToken)
  })
  pendingRequests = []
}

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminAccessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    const originalConfig = err.config ?? {}
    const status = err.response?.status
    const isRefreshRequest = originalConfig.url?.includes('/auth/refresh')

    if (status === 401 && !isRefreshRequest && !originalConfig.__isRetryRequest) {
      const savedRefreshToken = localStorage.getItem('adminRefreshToken')
      if (!savedRefreshToken) {
        clearAuthStorage()
        redirectToLogin()
        ElMessage.error('登录已过期，请重新登录')
        return Promise.reject(err)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject })
        }).then((accessToken) => {
          originalConfig.headers = originalConfig.headers ?? {}
          originalConfig.headers.Authorization = `Bearer ${accessToken}`
          originalConfig.__isRetryRequest = true
          return http(originalConfig)
        })
      }

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

        localStorage.setItem('adminAccessToken', nextAccessToken)
        localStorage.setItem('adminRefreshToken', nextRefreshToken)
        processPendingRequests(null, nextAccessToken)

        originalConfig.headers = originalConfig.headers ?? {}
        originalConfig.headers.Authorization = `Bearer ${nextAccessToken}`
        originalConfig.__isRetryRequest = true
        return http(originalConfig)
      } catch (refreshErr) {
        processPendingRequests(refreshErr, null)
        clearAuthStorage()
        redirectToLogin()
        ElMessage.error('登录已过期，请重新登录')
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

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
