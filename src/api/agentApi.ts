import type {
  ChatResult,
  ClearHistoryResult,
  HealthResult,
  HistoryResult,
  SessionInfo,
  SessionItem,
  StreamChatEvent,
  ToolMeta,
} from './types';
import { http } from './http';
import { openEventStream, type StreamCallbacks, type StreamHandle } from './sse';

/** 发起单轮非流式对话（流式不稳定时的兜底方案） */
export function chat(
  message: string,
  sessionId?: string,
): Promise<ChatResult> {
  return http.post<ChatResult>('/api/agent/chat', { message, sessionId });
}

/**
 * 流式对话：经 SSE 推送 text / reasoning / session / done / error 事件。
 * 返回句柄可 abort。
 */
export function streamChat(
  message: string,
  sessionId: string | undefined,
  callbacks: StreamCallbacks,
): StreamHandle {
  const forwarded: StreamCallbacks = {
    onEvent: (event: StreamChatEvent) => callbacks.onEvent(event),
    onError: (error) => callbacks.onError(error),
    onClose: () => callbacks.onClose(),
  };
  return openEventStream(
    '/api/agent/chat/stream',
    { message, sessionId },
    forwarded,
  );
}

/** 会话列表 */
export function listSessions(): Promise<SessionItem[]> {
  return http.get<SessionItem[]>('/api/agent/sessions');
}

/** 指定会话的历史消息 */
export function getHistory(sessionId: string): Promise<HistoryResult> {
  return http.get<HistoryResult>(`/api/agent/history/${encodeURIComponent(sessionId)}`);
}

/** 创建新会话（可不带标题） */
export function createSession(title?: string): Promise<SessionInfo> {
  return http.post<SessionInfo>('/api/agent/sessions', { title });
}

/** 清除会话消息 */
export function clearHistory(sessionId: string): Promise<ClearHistoryResult> {
  return http.delete<ClearHistoryResult>(
    `/api/agent/history/${encodeURIComponent(sessionId)}`,
  );
}

/** 可用工具元信息 */
export function getTools(): Promise<{ tools: ToolMeta[] }> {
  return http.get<{ tools: ToolMeta[] }>('/api/agent/tools');
}

/** 服务健康状态（免鉴权） */
export function getHealth(): Promise<HealthResult> {
  return http.get<HealthResult>('/api/agent/health', { auth: false });
}
