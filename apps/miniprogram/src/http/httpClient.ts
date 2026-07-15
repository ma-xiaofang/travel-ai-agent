import { refreshTokenApi } from '@/api/authApi'
import { CustomRequestOptions } from '@/interceptors/request'
import { useUserStore } from '@/store'

type CustomRequestOptionsOmit = Omit<CustomRequestOptions, 'url' | 'method'>

let refreshing = false // 防止重复刷新 token 标示
let taskQueue = [] // 刷新 token 请求队列

export default class ApiClient {
  private static http<T>(options: Omit<CustomRequestOptions, 'isBaseUrl'>) {
    let requestTask
    const promise = new Promise<ResData<T>>((resolve, reject) => {
      requestTask = uni.request({
        ...options,
        success: async (res: any) => {
          /* -------- 请求成功 ----------- */
          if ((res.statusCode >= 200 && res.statusCode < 300) || res.data.code === 0) {
            return resolve(res.data as ResData<T>)
          }

          /* -------- 无感刷新 token ----------- */
          const store = useUserStore()
          const { refreshToken } = store.userInfo || {}
          // token 失效的，且有刷新 token 的，才放到请求队列里
          if ((res.data.code == 401 || res.statusCode == 401) && refreshToken != '') {
            taskQueue.push(() => {
              this.http(options)
            })
          }
          if ((res.data.code == 401 || res.statusCode == 401) && refreshToken != '' && !refreshing) {
            refreshing = true
            // 发起刷新 token 请求
            const refreshTokenRes: any = await refreshTokenApi()
            refreshing = false
            // 刷新 token 成功，将任务队列的所有任务重新请求
            if (refreshTokenRes?.data.code == 200) {
              taskQueue.forEach(event => {
                event()
              })
            } else {
              // 刷新 token 失败，跳转到登录页
              uni.showToast({
                title: '登录已过期，请重新登录',
                icon: 'none',
                time: 2500
              })
              // setTimeout(() => {
              //   // 清除 用户信息（包括 token）
              //   store.clearUserInfo()
              //   // 跳转到登录页
              //   uni.navigateTo({ url: '/pages/login/login' })
              // }, 2500)
            }
            // 不管刷新 token 成功与否，都清空任务队列
            taskQueue = []
          }

          /* -------- 剩余情况都默认请求异常 ----------- */
          uni.showToast({
            title: res.data.msg || res.data.message || '请求异常',
            icon: 'none'
          })
          reject(res)
        },
        fail: err => {
          if (err.errMsg === 'request:fail abort') {
            console.log(`请求 ${options.url} 被取消`)
          } else {
            reject(err)
          }
        }
      })
    })
    return {
      ...promise, // 补全 Promise 的类型
      then: promise.then.bind(promise),
      catch: promise.catch.bind(promise),
      finally: promise.finally.bind(promise),
      [Symbol.iterator]: promise[Symbol.iterator],
      abort: () => {
        // 取消请求
        requestTask.abort()
      }
    }
  }
  // GET
  public static get(url: string, options?: CustomRequestOptionsOmit) {
    return this.http({
      url,
      method: 'GET',
      ...options
    })
  }
  // POST
  public static post(url: string, options?: CustomRequestOptionsOmit) {
    return this.http({
      url,
      method: 'POST',
      ...options
    })
  }
  // PUT
  public static put(url: string, options?: CustomRequestOptionsOmit) {
    return this.http({
      url,
      method: 'PUT',
      ...options
    })
  }
  // DELETE
  public static delete(url: string, options?: CustomRequestOptionsOmit) {
    return this.http({
      url,
      method: 'DELETE',
      ...options
    })
  }
}
