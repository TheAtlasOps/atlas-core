import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { login } from '../api/auth';
import { ApiError, setAuthToken, setUnauthorizedHandler } from '../api/client';
import { getStored, removeStored, setStored } from '../api/storage';
import type { SessionUser } from '../api/types';

// ─── Sesión del técnico ───────────────────────────────────────────────────────
const TOKEN_KEY = 'atlas.token';
const USER_KEY = 'atlas.user';
/** La app es solo para técnicos: coordinadores y admins usan el panel web */
const ALLOWED_ROLE = 'TECNICO';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthContextValue = {
  status: AuthStatus;
  user: SessionUser | null;
  /** Mensaje para mostrar en el login (ej. "Tu sesión expiró") */
  notice: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function parseUser(raw: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    const u = JSON.parse(raw) as Partial<SessionUser>;
    if (u && typeof u.id === 'string' && typeof u.fullName === 'string' && typeof u.role === 'string') {
      return { id: u.id, email: u.email ?? '', fullName: u.fullName, role: u.role };
    }
  } catch {
    // sesión corrupta: se descarta
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    setStatus('signedOut');
    await Promise.all([removeStored(TOKEN_KEY), removeStored(USER_KEY)]);
  }, []);

  // Restaurar la sesión guardada al abrir la app
  useEffect(() => {
    let active = true;
    (async () => {
      const [token, rawUser] = await Promise.all([getStored(TOKEN_KEY), getStored(USER_KEY)]);
      if (!active) return;
      const saved = parseUser(rawUser);
      if (token && saved && saved.role === ALLOWED_ROLE) {
        setAuthToken(token);
        setUser(saved);
        setStatus('signedIn');
      } else {
        setStatus('signedOut');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Si el servidor responde 401 (token vencido), volver al login
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setNotice('Tu sesión expiró. Inicia sesión nuevamente.');
      void clearSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await login(email, password);
    if (res.role !== ALLOWED_ROLE) {
      throw new ApiError(
        'Esta aplicación es solo para técnicos. Usa el panel web si eres coordinador.',
        'http',
        403,
      );
    }
    const session: SessionUser = {
      id: res.user_id,
      email: res.email,
      fullName: res.full_name,
      role: res.role,
    };
    setAuthToken(res.access_token);
    await Promise.all([
      setStored(TOKEN_KEY, res.access_token),
      setStored(USER_KEY, JSON.stringify(session)),
    ]);
    setNotice(null);
    setUser(session);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    setNotice(null);
    await clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, notice, signIn, signOut }),
    [status, user, notice, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
