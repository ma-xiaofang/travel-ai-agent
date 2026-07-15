import { UnwrapRef, Ref } from 'vue'

type RequestOptions = {
  /** 是否立即执行 */
  immediate?: boolean
}

/**
 * useRequest 是请求的再次封装，类似于 react-query 中的 userQuery
 * 核心使用场景，就前端而言，分页查询用的比较多，其他嘛用得还是比较少
 * @param queryFn 一个执行异步请求的函数，返回一个包含响应数据的 Promise
 * @param queryKey 请求的唯一标识，用于监听参数变化，重新发起请求
 * @param options 包含请求选项的对象 {immediate}。
 * @param options.immediate 是否立即执行请求，默认为false。
 * @returns 返回一个对象{loading, error, data, run}，包含请求的加载状态、错误信息、响应数据和手动触发请求的函数。
 */
export default function useRequest<T>({
  queryKey,
  options = { immediate: false },
  queryFn
}: {
  queryKey: Ref<T>[]
  options: RequestOptions
  queryFn: () => Promise<ResData<T>>
}) {
  const loading = ref(false)
  const error = ref(false)
  const data = ref() // 不做类型定义，让 ts 默认推导
  const run = async () => {
    loading.value = true
    return queryFn()
      .then(res => {
        data.value = res.data as UnwrapRef<T>
        error.value = false
        return data.value
      })
      .catch(err => {
        error.value = err
        throw err
      })
      .finally(() => {
        loading.value = false
      })
  }
  // 监听 queryKey 变化，重新发起请求
  watch([...queryKey], () => {
    run()
  })
  options.immediate && run()
  return { loading, error, data, run }
}
