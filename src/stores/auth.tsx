import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as authApi from '@/api/authApi';
import { clearTokens, getCachedTokens, loadTokens, saveTokens, subscribeTokens } from '@/api/tokens';
import type { RegisterParams, TokenPair } from '@/api/types';

interface AuthContextValue {
  /** 启动恢复完成（含“确实未登录”的完成态） */
  ready: boolean;
  tokens: TokenPair | null;
  isAuthenticated: boolean;
  signIn: (account: string, password: string) => Promise<void>;
  signUp: (params: RegisterParams) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tokens, setTokens] = useState<TokenPair | null>(() => getCachedTokens());

  useEffect(() => {
    let mounted = true;
    loadTokens()
      .then(() => {
        if (mounted) setTokens(getCachedTokens());
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    const unsubscribe = subscribeTokens(setTokens);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (account: string, password: string) => {
    const pair = await authApi.login(account, password);
    await saveTokens(pair);
  }, []);

  const signUp = useCallback(async (params: RegisterParams) => {
    const pair = await authApi.register(params);
    await saveTokens(pair);
  }, []);

  const signOut = useCallback(async () => {
    await authApi.logout().catch(() => clearTokens());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      tokens,
      isAuthenticated: ready && tokens !== null,
      signIn,
      signUp,
      signOut,
    }),
    [ready, tokens, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必须在 <AuthProvider> 内使用');
  }
  return context;
}
