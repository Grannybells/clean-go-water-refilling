import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { api, ApiError } from '@/lib/api';
import { STORAGE_KEYS } from '@/lib/constants';
import { hasModule as hasModuleFn } from '@/lib/permissions';
import { secureStorage } from '@/lib/secureStorage';
import { storage } from '@/lib/storage';
import type { LoginResponse, MeResponse, User } from '@/types/user';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  modules: string[];
  hasModule: (name: string) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [modules, setModules] = useState<string[]>([]);

  const clearSession = useCallback(async () => {
    await Promise.all([
      secureStorage.removeItem(STORAGE_KEYS.authToken),
      storage.remove(STORAGE_KEYS.authUser),
      storage.remove(STORAGE_KEYS.authModules),
    ]);
    setUser(null);
    setModules([]);
    setStatus('unauthenticated');
  }, []);

  const hydrate = useCallback(async () => {
    const token = await secureStorage.getItem(STORAGE_KEYS.authToken);
    if (!token) {
      setStatus('unauthenticated');
      return;
    }

    try {
      const fresh = await api.get<MeResponse>('/api/users/me');
      await storage.set(STORAGE_KEYS.authUser, fresh.user);
      await storage.set(STORAGE_KEYS.authModules, fresh.modules);
      setUser(fresh.user);
      setModules(fresh.modules ?? []);
      setStatus('authenticated');
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
        await clearSession();
        return;
      }
      const cachedUser = await storage.get<User>(STORAGE_KEYS.authUser);
      const cachedModules = await storage.get<string[]>(STORAGE_KEYS.authModules);
      if (cachedUser) {
        setUser(cachedUser);
        setModules(cachedModules ?? []);
        setStatus('authenticated');
      } else {
        await clearSession();
      }
    }
  }, [clearSession]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await api.post<LoginResponse>(
      '/api/auth/login',
      { email, password },
      { auth: false },
    );
    await secureStorage.setItem(STORAGE_KEYS.authToken, data.token);
    await storage.set(STORAGE_KEYS.authUser, data.user);
    await storage.set(STORAGE_KEYS.authModules, data.modules);
    setUser(data.user);
    setModules(data.modules ?? []);
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const hasModule = useCallback(
    (name: string) => hasModuleFn(modules, name),
    [modules],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      modules,
      hasModule,
      signIn,
      signOut,
      refresh: hydrate,
    }),
    [status, user, modules, hasModule, signIn, signOut, hydrate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
