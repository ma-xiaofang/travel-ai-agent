import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate' // 数据持久化

// 持久化把数据放在本地存储中
const store = createPinia()
store.use(
  createPersistedState({
    storage: {
      getItem: uni.getStorageSync,
      setItem: uni.setStorageSync
    }
  })
)

export default store

// 模块统一导出
export * from './user'
export * from './chat'
