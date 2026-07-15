/**
 * 对话 API — SSE 流式对话 + 会话管理 + 历史记录 + 工具查询
 *
 * 后端路由: api/agent
 */
import { ref, type Ref } from 'vue'
import http from '@/http/httpClient'
import { createSSEConnection, type SSEMessage, type SSEConnection } from '@/utils/sse'
import type {
    ChatParams,
    ChatResult,
    CreateSessionParams,
    SessionInfo,
    SessionItem,
    HistoryResult,
    ToolsResult,
    HealthResult,
} from '@/types/api'

// ==================== 会话管理 ====================

/** 创建新会话 */
export async function createSessionApi(data?: CreateSessionParams) {
    const res: any = await http.post('/api/agent/sessions', { data })
    return res.data as SessionInfo
}

/** 获取当前用户的会话列表 */
export async function listSessionsApi() {
    const res: any = await http.get('/api/agent/sessions')
    return res.data as SessionItem[]
}

// ==================== 历史记录 ====================

/** 获取指定会话的聊天历史 */
export async function getHistoryApi(sessionId: string) {
    const res: any = await http.get(`/api/agent/history/${sessionId}`)
    return res.data as HistoryResult
}

/** 清除指定会话的聊天历史 */
export async function clearHistoryApi(sessionId: string) {
    const res: any = await http.delete(`/api/agent/history/${sessionId}`)
    return res.data as { success: boolean; message: string }
}

// ==================== 工具 & 健康 ====================

/** 获取可用 Agent 工具列表 */
export async function getToolsApi() {
    const res: any = await http.get('/api/agent/tools')
    return (res.data ?? res) as ToolsResult
}

/** 健康检查（公开接口，无需登录） */
export async function healthApi() {
    const res: any = await http.get('/api/agent/health')
    return (res.data ?? res) as HealthResult
}

// ==================== 非流式对话 ====================

/** 同步对话（非流式，返回完整回答） */
export async function chatApi(data: ChatParams) {
    const res: any = await http.post('/api/agent/chat', { data })
    return res.data as ChatResult
}

// ==================== SSE 流式对话 Composable ====================

/** useChat 返回类型 */
export interface UseChatReturn {
    /** 当前累积的正文内容（打字机效果） */
    content: Ref<string>
    /** 思维链内容（DeepSeek reasoning） */
    reasoning: Ref<string>
    /** 服务端返回的会话 ID */
    sessionId: Ref<string>
    /** 是否正在流式接收中 */
    streaming: Ref<boolean>
    /** 错误信息 */
    error: Ref<string>
    /**
     * 发送消息（SSE 流式）
     * @param message 用户输入
     * @param sid 可选的会话 ID（续接已有会话）
     */
    send: (message: string, sid?: string) => void
    /** 中断当前流式请求 */
    abort: () => void
}

/**
 * AI 对话 Composable — SSE 流式打字机效果
 *
 * @example
 * ```vue
 * <script setup>
 * const { content, reasoning, streaming, send, abort } = useChat()
 * send('推荐北京三日游')
 * </script>
 * ```
 */
export function useChat(): UseChatReturn {
    const content = ref('')
    const reasoning = ref('')
    const sessionId = ref('')
    const streaming = ref(false)
    const error = ref('')

    let connection: SSEConnection | null = null

    function send(message: string, sid?: string) {
        abort()

        content.value = ''
        reasoning.value = ''
        error.value = ''
        streaming.value = true

        connection = createSSEConnection({
            url: '/api/agent/chat/stream',
            method: 'POST',
            data: {
                message,
                sessionId: sid ?? sessionId.value ?? '',
            },
            onMessage: (msg: SSEMessage) => {
                switch (msg.type) {
                    case 'text':
                        content.value += msg.content ?? ''
                        break
                    case 'reasoning':
                        reasoning.value += msg.content ?? ''
                        break
                    case 'session':
                        sessionId.value = msg.sessionId ?? ''
                        break
                    case 'error':
                        error.value = msg.message ?? '未知错误'
                        content.value += msg.message ?? ''
                        break
                    case 'done':
                        break
                }
            },
            onError: (err: any) => {
                error.value = err?.errMsg ?? err?.message ?? '网络请求失败'
                streaming.value = false
                connection = null
            },
            onComplete: () => {
                streaming.value = false
                connection = null
            },
        })
    }

    function abort() {
        if (connection) {
            connection.abort()
            connection = null
        }
        streaming.value = false
    }

    return {
        content,
        reasoning,
        sessionId,
        streaming,
        error,
        send,
        abort,
    }
}
