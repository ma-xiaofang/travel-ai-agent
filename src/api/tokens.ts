import { Platform } from 'react-native';
import type { TokenPair } from './types';

/**
 * 令牌存储层：native 使用 expo-secure-store 持久化，
 * web 退化为 localStorage；始终维护一份内存缓存供同步读取。
 */

const STORAGE_KEY = 'travel_ai_auth_tokens';
const MEMORY_KEY = '@travel-ai/tokens';

type TokensListener = (tokens: TokenPair | null) => void;

// undefined 表示尚未从存储加载
let cache: TokenPair | null | undefined = undefined;
const listeners = new Set<TokensListener>();

function emit() {
  const snapshot = cache ?? null;
  listeners.forEach((listener) => listener(snapshot));
}

function safeStorageGet(): string | null {
  if (Platform.OS === 'web') {
    try {
      return typeof localStorage !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY)
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

async function nativeGet(key: string): Promise<string | null> {
  const { getItemAsync } = await import('expo-secure-store');
  return getItemAsync(key);
}

async function nativeSet(key: string, value: string) {
  const { setItemAsync } = await import('expo-secure-store');
  await setItemAsync(key, value);
}

async function nativeDelete(key: string) {
  const { deleteItemAsync } = await import('expo-secure-store');
  await deleteItemAsync(key);
}

function safeStorageSet(value: string | null) {
  if (Platform.OS !== 'web') return;
  try {
    if (value == null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // 忽略 localStorage 异常
  }
}

function fallbackSet(value: string | null) {
  try {
    if (value == null) localStorage.removeItem(MEMORY_KEY);
    else localStorage.setItem(MEMORY_KEY, value);
  } catch {
    // ignore
  }
}

function fallbackGet(): string | null {
  try {
    return localStorage.getItem(MEMORY_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): TokenPair | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.accessToken && parsed?.refreshToken) return parsed as TokenPair;
    return null;
  } catch {
    return null;
  }
}

/** 启动时调用：从持久化存储恢复令牌到内存缓存 */
export async function loadTokens(): Promise<TokenPair | null> {
  if (cache !== undefined) return cache;
  let raw: string | null = null;
  if (Platform.OS === 'web') {
    raw = safeStorageGet();
  } else {
    raw = await nativeGet(STORAGE_KEY).catch(() => null);
  }
  if (!raw) raw = fallbackGet();
  cache = parse(raw);
  return cache;
}

/** 同步读取内存缓存中的令牌（用于请求注入） */
export function getCachedTokens(): TokenPair | null {
  return cache ?? null;
}

export async function saveTokens(tokens: TokenPair) {
  cache = tokens;
  const raw = JSON.stringify(tokens);
  if (Platform.OS === 'web') {
    safeStorageSet(raw);
  } else {
    await nativeSet(STORAGE_KEY, raw).catch(() => fallbackSet(raw));
  }
  emit();
}

export async function clearTokens() {
  cache = null;
  if (Platform.OS === 'web') {
    safeStorageSet(null);
  } else {
    await nativeDelete(STORAGE_KEY).catch(() => fallbackSet(null));
  }
  emit();
}

/** 订阅令牌变化，返回取消订阅函数 */
export function subscribeTokens(listener: TokensListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
