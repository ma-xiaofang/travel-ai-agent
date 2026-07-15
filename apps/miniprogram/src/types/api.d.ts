// ============================================================
//  途旅 · AI 旅行助手 — 小程序端 API 类型定义
//  与 apps/server NestJS 后端接口一一对应
// ============================================================

// ---------------------- 通用响应格式 ----------------------

/** 后端统一响应包裹 */
interface ResData<T> {
    code: number
    data: T
    msg?: string
    message?: string
}

// ---------------------- 认证 (api/auth) ----------------------

/** 注册请求 */
interface RegisterParams {
    email?: string
    username: string
    password: string
    phone?: string
    nickName?: string
    gender?: 'MALE' | 'FEMALE' | 'OTHER'
    age?: number
}

/** 登录请求 — 用户名/邮箱/手机号至少填一个 */
interface LoginParams {
    username?: string
    email?: string
    phone?: string
    password: string
}

/** 令牌对 — 注册/登录/刷新 通用返回值 */
interface TokenPair {
    accessToken: string
    refreshToken: string
}

// ---------------------- 对话 (api/agent) ----------------------

/** 发送消息请求 */
interface ChatParams {
    sessionId?: string
    message: string
}

/** 同步对话返回值 */
interface ChatResult {
    sessionId: string
    userId: string
    message: string
    answer: string
}

/** 创建会话请求 */
interface CreateSessionParams {
    title?: string
}

/** 创建会话返回值 */
interface SessionInfo {
    sessionId: string
    userId: string
    title: string
}

/** 会话列表项 */
interface SessionItem {
    id: string
    userId: string
    title: string
    createdAt: string
    updatedAt: string
}

/** 历史消息 */
interface HistoryMessage {
    id: string
    role: 'USER' | 'ASSISTANT' | 'SYSTEM'
    content: string
    createdAt: string
}

/** 获取历史返回值 */
interface HistoryResult {
    sessionId: string
    count: number
    messages: HistoryMessage[]
}

/** 工具元信息 */
interface ToolMeta {
    name: string
    description: string
    category?: string
}

/** 工具列表返回值 */
interface ToolsResult {
    tools: ToolMeta[]
}

/** 健康检查返回值 */
interface HealthResult {
    status: string
    service: string
    llmProvider: string
    model: string
    webSearch: string
    time: string
}

// ============================================================
//  在线程中使用 window 下挂的类型
//  兼容 Vue SFC <script setup> 中的类型引用
// ============================================================

export type {
    ResData,
    RegisterParams,
    LoginParams,
    TokenPair,
    ChatParams,
    ChatResult,
    CreateSessionParams,
    SessionInfo,
    SessionItem,
    HistoryMessage,
    HistoryResult,
    ToolMeta,
    ToolsResult,
    HealthResult,
}
