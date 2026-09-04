import { create, isAxiosError } from 'axios';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import type { TokenPair } from './types';
import {
  clearTokens,
  getCachedTokens,
  saveTokens,
} from './tokens';

/**
 * HTTP 客户端（非流式接口，基于 axios）：
 * 对接 NestJS 统一响应包
 *   { code: 200, message, data }
 * 特性：自动附加 Bearer Token、401 自动刷新并重放（单飞）、
 * 统一错误（ApiError）、可配置超时。
 * 注：SSE 流式接口见 ./sse.ts（XHR 实现，axios 不适合流式解析）。
 */

export const BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
).replace(/\/+$/, '');

export class ApiError extends Error {
  /** HTTP 状态码；0 表示网络层错误 */
  readonly status: number;
  /** 后端业务码（响应包 code） */
  readonly code: number | string;

  constructor(message: string, status = 0, code: number | string = status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export interface HttpOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** URL query */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** JSON 请求体 */
  body?: unknown;
  /** 额外请求头 */
  headers?: Record<string, string>;
  /** 是否携带鉴权头，默认 true */
  auth?: boolean;
  /** 401 时是否尝试自动刷新并重放，默认 true */
  retryOn401?: boolean;
  /** 超时（毫秒），默认 15000 */
  timeoutMs?: number;
  /** 是否接受空响应体，默认 false */
  allowEmpty?: boolean;
}

interface Envelope<T> {
  code: number;
  message?: string;
  data: T;
}

/** 共享 axios 实例：统一 baseURL / 超时，业务逻辑在 rawRequest 中处理 */
const client = create({
  baseURL: BASE_URL,
  timeout: 15000,
});

/** 与旧实现一致：跳过 null / undefined / 空串 query 项 */
function buildParams(
  query: HttpOptions['query'],
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};
  if (!query) return params;
  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === '') continue;
    params[key] = value;
  }
  return params;
}

function errorMessage(
  body: Envelope<unknown> | null | undefined,
  status: number,
): string {
  if (
    body &&
    typeof body === 'object' &&
    typeof (body as { message?: unknown }).message === 'string' &&
    (body as { message?: string }).message
  ) {
    return (body as { message?: string }).message as string;
  }
  if (status === 401) return '登录状态已失效，请重新登录';
  return `请求失败（HTTP ${status}）`;
}

/** 令牌刷新（单飞：并发 401 只触发一次） */
let refreshPromise: Promise<TokenPair> | null = null;

async function performRefresh(): Promise<TokenPair> {
  const cached = getCachedTokens();
  if (!cached?.refreshToken) {
    await clearTokens();
    throw new ApiError('登录状态已失效，请重新登录', 401, 401);
  }
  let response;
  try {
    // refresh 携带的是 body 里的 refreshToken，不附加 Authorization
    response = await client.post<Envelope<TokenPair>>('/api/auth/refresh', {
      refreshToken: cached.refreshToken,
    });
  } catch (error) {
    const status = isAxiosError(error) ? error.response?.status ?? 0 : 0;
    await clearTokens();
    throw new ApiError('登录已过期，请重新登录', status, status || 'UNAUTHORIZED');
  }
  const body = response.data;
  if (!body || body.code !== 200 || !body.data?.accessToken) {
    await clearTokens();
    throw new ApiError(
      body && typeof body.message === 'string'
        ? body.message
        : '登录已过期，请重新登录',
      response.status,
      body?.code ?? response.status,
    );
  }
  await saveTokens(body.data);
  return body.data;
}

function waitForRefresh(): Promise<TokenPair> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function rawRequest<T>(
  path: string,
  options: HttpOptions,
  allowRetry: boolean,
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    auth = true,
    retryOn401 = true,
    timeoutMs = 15000,
    allowEmpty = false,
  } = options;
  const isRefreshPath = path === '/api/auth/refresh';

  const config: AxiosRequestConfig = {
    method,
    url: path,
    headers: { Accept: 'application/json', ...headers },
    params: buildParams(options.query),
    timeout: timeoutMs,
  };
  if (options.body !== undefined) {
    // axios 对对象 data 自动 JSON 序列化并设置 Content-Type
    config.data = options.body;
  }
  if (auth) {
    const tokens = getCachedTokens();
    if (tokens?.accessToken) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${tokens.accessToken}`,
      };
    }
  }

  let response;
  try {
    response = await client.request<Envelope<T>>(config);
  } catch (error) {
    if (!isAxiosError(error)) {
      throw new ApiError('无法连接服务器，请检查网络后重试', 0, 'NETWORK');
    }
    const err = error as AxiosError<Envelope<T>>;
    const status = err.response?.status ?? 0;

    // 未收到响应：网络错误或超时
    if (!err.response) {
      if (err.code === 'ECONNABORTED') {
        throw new ApiError('请求超时，请稍后重试', 0, 'TIMEOUT');
      }
      throw new ApiError('无法连接服务器，请检查网络后重试', 0, 'NETWORK');
    }

    const parsed: unknown = err.response.data ?? null;

    // 401 且允许自动刷新 → 刷新令牌后重放一次
    if (
      status === 401 &&
      auth &&
      allowRetry &&
      retryOn401 &&
      !isRefreshPath
    ) {
      try {
        await waitForRefresh();
      } catch {
        throw new ApiError('登录已过期，请重新登录', 401, 401);
      }
      return rawRequest<T>(path, options, false);
    }

    // 后端业务码非 200
    const body = parsed as Envelope<T> | null;
    if (body && typeof body === 'object' && body.code !== 200) {
      throw new ApiError(errorMessage(body, status), status, body.code ?? status);
    }
    throw new ApiError(errorMessage(body, status), status);
  }

  // 2xx：仍需校验业务码（如 HTTP 200 + code 非 200）
  const parsed: unknown = response.data ?? null;
  if (typeof parsed === 'string' && parsed.trim() === '') {
    // 空响应体（如 204 No Content）：axios 不会对空串做 JSON.parse
    if (allowEmpty) return undefined as T;
    return undefined as T;
  }
  const body = parsed as Envelope<T> | null;
  if (body && typeof body === 'object' && body.code !== 200) {
    throw new ApiError(
      errorMessage(body, response.status),
      response.status,
      body.code ?? response.status,
    );
  }
  return (body?.data ?? undefined) as T;
}

export const http = {
  get<T>(path: string, options: HttpOptions = {}): Promise<T> {
    return rawRequest<T>(path, { ...options, method: 'GET' }, true);
  },
  post<T>(path: string, body?: unknown, options: HttpOptions = {}): Promise<T> {
    return rawRequest<T>(path, { ...options, method: 'POST', body }, true);
  },
  put<T>(path: string, body?: unknown, options: HttpOptions = {}): Promise<T> {
    return rawRequest<T>(path, { ...options, method: 'PUT', body }, true);
  },
  delete<T>(path: string, options: HttpOptions = {}): Promise<T> {
    return rawRequest<T>(path, { ...options, method: 'DELETE' }, true);
  },
};
