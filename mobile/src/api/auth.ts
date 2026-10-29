import { apiRequest } from './client';
import type { ApiToken } from './types';

// ─── Autenticación ────────────────────────────────────────────────────────────
export function login(email: string, password: string): Promise<ApiToken> {
  return apiRequest<ApiToken>('/auth/login', {
    method: 'POST',
    body: { email: email.trim(), password },
    auth: false,
  });
}
