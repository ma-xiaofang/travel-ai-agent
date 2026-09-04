import type { LoginParams, RegisterParams, TokenPair } from './types';
import { http } from './http';
import { clearTokens, getCachedTokens } from './tokens';

/**
 * 账号识别：支持用户名 / 邮箱 / 手机号，
 * 按输入格式自动映射为后端 LoginParams 对应字段。
 */
export function toLoginParams(
  account: string,
  password: string,
): LoginParams {
  const trimmed = account.trim();
  if (trimmed.includes('@')) {
    return { email: trimmed, password };
  }
  if (/^1\d{10}$/.test(trimmed)) {
    return { phone: trimmed, password };
  }
  return { username: trimmed, password };
}

export async function login(
  account: string,
  password: string,
): Promise<TokenPair> {
  return http.post<TokenPair>('/api/auth/login', toLoginParams(account, password));
}

export async function register(
  params: RegisterParams,
): Promise<TokenPair> {
  return http.post<TokenPair>('/api/auth/register', params);
}

/** 登出：通知服务端销毁 Refresh Token 并清理本地令牌 */
export async function logout(): Promise<void> {
  const cached = getCachedTokens();
  if (cached?.refreshToken) {
    http
      .post('/api/auth/logout', { refreshToken: cached.refreshToken })
      .catch(() => undefined);
  }
  await clearTokens();
}
