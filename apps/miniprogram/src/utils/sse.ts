import { useUserStore } from '@/store'

/**
 * 后端 SSE 流式返回的消息类型
 * 对应 NestJS AgentController.streamChat 的产出
 */
export interface SSEMessage {
    type: 'text' | 'reasoning' | 'session' | 'done' | 'error'
    content?: string
    sessionId?: string
    message?: string
}

/** SSE 连接配置 */
export interface SSEConnectionOptions {
    /** 请求路径（相对路径会自动拼接 baseUrl） */
    url: string
    /** 请求方法，默认 POST */
    method?: 'GET' | 'POST'
    /** 请求体（POST 时使用） */
    data?: Record<string, any>
    /** 收到一条完整 SSE 消息 */
    onMessage: (msg: SSEMessage) => void
    /** 连接出错 */
    onError?: (err: any) => void
    /** 流正常结束 */
    onComplete?: () => void
}

/** SSE 连接控制器 */
export interface SSEConnection {
    /** 主动中断连接 */
    abort: () => void
}

/**
 * 创建 SSE 长连接（基于 enableChunked 分块传输）
 *
 * 微信小程序不原生支持 EventSource，通过 uni.request 的
 * enableChunked + onChunkReceived 模拟 SSE 行为。
 *
 * @example
 * const conn = createSSEConnection({
 *   url: '/api/agent/chat/stream',
 *   data: { sessionId: '', message: '你好' },
 *   onMessage: (msg) => { console.log(msg) },
 *   onComplete: () => { console.log('done') },
 * })
 * // 需要中断时：
 * conn.abort()
 */
export function createSSEConnection(options: SSEConnectionOptions): SSEConnection {
    const {
        url,
        method = 'POST',
        data,
        onMessage,
        onError,
        onComplete,
    } = options

    // 拼接完整 URL
    const baseUrl = (import.meta.env.VITE_SERVER_BASEURL as string) || ''
    const fullUrl = url.startsWith('http') ? url : baseUrl + url

    // 从 store 获取 token
    const store = useUserStore()
    const { accessToken } = store.userInfo || {}

    // 跨 chunk 的未完成数据缓冲区
    let buffer = ''

    const requestTask = uni.request({
        url: fullUrl,
        method,
        data,
        enableChunked: true,
        header: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        success: () => {
            // 处理缓冲区中剩余的数据（最后一条可能没有 \n\n 结尾）
            if (buffer.trim()) {
                parseSSELine(buffer, onMessage)
            }
            onComplete?.()
        },
        fail: (err) => {
            onError?.(err)
        },
    })

    // 监听分块数据
    // @ts-ignore onChunkReceived 是 uni-app 扩展 API
    requestTask.onChunkReceived((res: { data: ArrayBuffer }) => {
        try {
            const chunk = arrayBufferToUtf8(res.data)
            buffer += chunk

            // SSE 消息以 \n\n 分隔，按双换行切分
            const parts = buffer.split('\n\n')
            // 最后一个片段可能不完整，留到下次拼接
            buffer = parts.pop() || ''

            for (const part of parts) {
                parseSSELine(part, onMessage)
            }
        } catch (err) {
            onError?.(err)
        }
    })

    return {
        abort: () => requestTask.abort(),
    }
}

/**
 * ArrayBuffer → UTF-8 字符串
 * 微信小程序不支持 TextDecoder，使用手动解码
 */
function arrayBufferToUtf8(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let str = ''
    let i = 0

    while (i < bytes.length) {
        const byte = bytes[i]

        if (byte < 0x80) {
            // 单字节 (0xxxxxxx)
            str += String.fromCharCode(byte)
            i += 1
        } else if (byte >= 0xc0 && byte < 0xe0) {
            // 双字节 (110xxxxx 10xxxxxx)
            const codePoint = ((byte & 0x1f) << 6) | (bytes[i + 1] & 0x3f)
            str += String.fromCharCode(codePoint)
            i += 2
        } else if (byte >= 0xe0 && byte < 0xf0) {
            // 三字节 (1110xxxx 10xxxxxx 10xxxxxx)
            const codePoint =
                ((byte & 0x0f) << 12) |
                ((bytes[i + 1] & 0x3f) << 6) |
                (bytes[i + 2] & 0x3f)
            str += String.fromCharCode(codePoint)
            i += 3
        } else if (byte >= 0xf0 && byte < 0xf8) {
            // 四字节 (11110xxx 10xxxxxx 10xxxxxx 10xxxxxx) - emoji 等
            const codePoint =
                ((byte & 0x07) << 18) |
                ((bytes[i + 1] & 0x3f) << 12) |
                ((bytes[i + 2] & 0x3f) << 6) |
                (bytes[i + 3] & 0x3f)
            // 转换为 UTF-16 代理对
            const high = ((codePoint - 0x10000) >> 10) + 0xd800
            const low = ((codePoint - 0x10000) & 0x3ff) + 0xdc00
            str += String.fromCharCode(high, low)
            i += 4
        } else {
            // 无效字节，跳过
            i += 1
        }
    }

    return str
}

/**
 * 解析单条 SSE 行：提取 "data: {...}" 并 JSON.parse
 */
function parseSSELine(line: string, onMessage: (msg: SSEMessage) => void): void {
    // SSE 格式: "data: {"type":"text","content":"你好"}"
    const match = line.match(/^data:\s*(.+)$/m)
    if (!match) return

    try {
        const msg = JSON.parse(match[1]) as SSEMessage
        onMessage(msg)
    } catch {
        // 忽略解析失败的行（如心跳、空数据等）
    }
}
