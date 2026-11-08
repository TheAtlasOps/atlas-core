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

export interface PasswordResetResponse {
  message: string;
}

/**
 * Solicita el restablecimiento de contraseña para un correo electrónico.
 * Reutiliza el endpoint existente /auth/password-reset/request (RNF-SEG-02 / RF-API-08).
 * Siempre devuelve un mensaje genérico para evitar la enumeración de usuarios.
 */
export function requestPasswordReset(email: string): Promise<PasswordResetResponse> {
  return apiRequest<PasswordResetResponse>('/auth/password-reset/request', {
    method: 'POST',
    body: { email: email.trim().toLowerCase() },
    auth: false,
  });
}
