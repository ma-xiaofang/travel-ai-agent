import { qs } from '@/utils'
import { useUserStore } from '@/store'

export type CustomRequestOptions = UniApp.RequestOptions & {
  query?: Record<string, any>
  /** 出错时是否隐藏错误提示 */
  hideErrorToast?: boolean
}

const timeout = 30000 // 请求超时时间
const baseUrl = import.meta.env.VITE_SERVER_BASEURL as string // 请求基础路径

// 拦截器配置
const httpInterceptor = {
  // 请求前的拦截
  invoke(options: CustomRequestOptions) {
    // 1. 设置请求路径
    if (!options.url.includes('//')) {
      // 非完整路径，补全基础路径
      // 完整路径：http://localhost:8080/api/user/login
      // 非完整路径：api/user/loginApi
      options.url = baseUrl + options.url
    }
    // 2. query 参数处理
    if (options.query) {
      // qs.stringify() 方法将一个 JavaScript 对象或数组转换为一个查询字符串
      // 比如： { name: 'tom', age: 18 } 转换成 name=tom&age=18
      const query = qs.stringify(options.query)
      options.url += options.url.includes('?') ? '&' : '?' + query
    }
    // 3. 请求超时时间设置
    options.timeout = timeout
    // 4. 定义请求返回数据的格式（设为 json，会尝试对返回的数据做一次 JSON.parse）
    options.dataType = 'json'
    // #ifndef MP-WEIXIN
    options.responseType = 'json'
    // #endif
    // 5. 添加请求头标识，可以告诉后台是小程序端发起的请求
    options.header = {
      ...options.header,
      'Content-Type': 'application/json; charset=utf-8'
      // platform: 'mini-program', 比如 platform 字段可以告诉后台是小程序端发起的请求
    }
    // 6. 添加 token 请求头标识
    const store = useUserStore()
    const { accessToken } = store.userInfo || {}
    if (accessToken) {
      options.header.Authorization = `Bearer ${accessToken}`
    }
    return options
  }
}

export const requestInterceptor = {
  install() {
    // 拦截 request 请求
    uni.addInterceptor('request', httpInterceptor)
  }
}
