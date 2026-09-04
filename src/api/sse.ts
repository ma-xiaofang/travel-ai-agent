import type { StreamChatEvent } from './types';
import { ApiError, BASE_URL } from './http';
import { getCachedTokens } from './tokens';

/**
 * 基于 XMLHttpRequest 的 SSE 客户端（支持 POST + Authorization）。
 * 后端 /api/agent/chat/stream 以 `data: {json}\n\n` 增量推送，
 * 这里按事件边界增量解析，网络较差时若事件跨包偶发丢弃，
 * 可回退到非流式 POST /api/agent/chat。
 */

export interface StreamCallbacks {
  onEvent: (event: StreamChatEvent) => void;
  onError: (error: ApiError) => void;
  /** 正常收尾（收到 done 或连接关闭） */
  onClose: () => void;
}

export interface StreamHandle {
  /** 主动中断连接 */
  abort: () => void;
  /** 是否已被中断 */
  aborted: () => boolean;
}

function parseEventPayload(dataLine: string): StreamChatEvent | null {
  const payload = dataLine.replace(/^data:\s?/, '');
  try {
    return JSON.parse(payload) as StreamChatEvent;
  } catch {
    return null;
  }
}

export function openEventStream(
  path: string,
  body: unknown,
  callbacks: StreamCallbacks,
  headers: Record<string, string> = {},
): StreamHandle {
  const xhr = new XMLHttpRequest();
  let aborted = false;
  let pointer = 0; // responseText 已消费偏移
  let buffer = '';
  // 是否已解析到至少一个合法 SSE 事件（用于区分正常关闭与错误响应）
  let receivedEvent = false;

  xhr.open('POST', `${BASE_URL}${path}`);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
  xhr.setRequestHeader('Accept', 'text/event-stream');
  const tokens = getCachedTokens();
  if (tokens?.accessToken) {
    xhr.setRequestHeader('Authorization', `Bearer ${tokens.accessToken}`);
  }
  Object.entries(headers).forEach(([key, value]) =>
    xhr.setRequestHeader(key, value),
  );

  const drain = () => {
    const text = xhr.responseText;
    if (text.length > pointer) {
      buffer += text.slice(pointer);
      pointer = text.length;
    }
    let boundary: number;
    while ((boundary = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      for (const line of block.split('\n')) {
        if (line.startsWith('data:')) {
          const event = parseEventPayload(line);
          if (event) {
            receivedEvent = true;
            callbacks.onEvent(event);
          }
        }
      }
    }
  };

  xhr.onprogress = drain;

  xhr.onload = () => {
    drain();
    if (aborted) return;
    const status = xhr.status;
    if (status >= 400 && !receivedEvent) {
      // 鉴权失效或服务端错误：把 HTTP 状态转成可感知的错误，
      // 避免用户看到「空回复 + 连接结束」的假象。
      const isAuth = status === 401 || status === 403;
      callbacks.onError(
        isAuth
          ? new ApiError('登录已过期，请重新登录', status, 'UNAUTHORIZED')
          : new ApiError(`服务返回错误（HTTP ${status}）`, status),
      );
      return;
    }
    // 正常收尾兜底：可能已完成（收到 done）也可能中途断开，
    // onClose 幂等，用于复位 UI 的流式状态。
    callbacks.onClose();
  };

  xhr.onerror = () => {
    if (!aborted) {
      callbacks.onError(
        new ApiError('无法连接服务器，请检查网络后重试', 0, 'NETWORK'),
      );
    }
  };

  xhr.ontimeout = () => {
    if (!aborted) {
      callbacks.onError(new ApiError('连接超时，请稍后重试', 0, 'TIMEOUT'));
    }
  };

  xhr.onabort = () => {
    if (!aborted) callbacks.onClose();
  };

  xhr.send(JSON.stringify(body));

  return {
    abort: () => {
      aborted = true;
      try {
        xhr.abort();
      } catch {
        // ignore
      }
    },
    aborted: () => aborted,
  };
}
