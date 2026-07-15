import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useChatStore = defineStore(
  'chat',
  () => {
    const pendingSessionId = ref('')

    const setPendingSession = (id: string) => {
      pendingSessionId.value = id
    }

    const clearPendingSession = () => {
      pendingSessionId.value = ''
    }

    return {
      pendingSessionId,
      setPendingSession,
      clearPendingSession,
    }
  },
  {
    persist: false, // 仅作为跨页面跳转状态，不持久化
  }
)
