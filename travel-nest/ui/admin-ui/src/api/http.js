import axios from 'axios'
import { ElMessage } from 'element-plus'

const http = axios.create({ baseURL: '/api', timeout: 30000 })

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminAccessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message ?? err.message
    if (err.response?.status === 401) {
      localStorage.removeItem('adminAccessToken')
      localStorage.removeItem('adminUser')
      if (window.location.pathname !== '/login') {
        window.location.href = '/#/login'
      }
    }
    ElMessage.error(msg)
    return Promise.reject(err)
  },
)

export default http
