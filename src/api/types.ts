/**
 * 与后端 apps/server 对齐的接口类型定义。
 * 后端统一响应包：{ code: 200, message, data }，本层请求封装已解包 data。
 */

/** 令牌对 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** 后端登录入参（用户名/邮箱/手机号三选一） */
export interface LoginParams {
  username?: string;
  email?: string;
  phone?: string;
  password: string;
}

/** 后端注册入参 */
export interface RegisterParams {
  username: string;
  password: string;
  email?: string;
  phone?: string;
  nickName?: string;
  gender?: string;
  age?: number;
}

/** 会话信息（POST /api/agent/sessions 返回） */
export interface SessionInfo {
  sessionId: string;
  userId: string;
  title: string | null;
}

/** 会话列表项（GET /api/agent/sessions 返回） */
export interface SessionItem {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
}

/** 历史消息（GET /api/agent/history/:sessionId 返回，role 为小写） */
export interface HistoryMessage {
  index: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface HistoryResult {
  sessionId: string;
  count: number;
  messages: HistoryMessage[];
}

/** 单轮（非流式）对话结果（POST /api/agent/chat） */
export interface ChatResult {
  sessionId: string;
  userId: string;
  message: string;
  answer: string;
}

/** 清除会话历史结果 */
export interface ClearHistoryResult {
  success: boolean;
  message: string;
}

/** 工具元信息 */
export interface ToolMeta {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

/** 服务健康状态（GET /api/agent/health，免鉴权） */
export interface HealthResult {
  status: string;
  service: string;
  llmProvider: string;
  model: string;
  webSearch: string;
  time: string;
}

/** 流式事件类型（POST /api/agent/chat/stream，SSE data 负载） */
export type StreamEventType = 'text' | 'reasoning' | 'session' | 'done' | 'error';

export interface StreamChatEvent {
  type: StreamEventType;
  content?: string;
  sessionId?: string;
  message?: string;
}
