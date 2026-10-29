import { API_URL, REQUEST_TIMEOUT_MS } from '../config';

// ─── Cliente HTTP ─────────────────────────────────────────────────────────────
export type ApiErrorKind = 'network' | 'timeout' | 'http';

export class ApiError extends Error {
  status: number | null;
  kind: ApiErrorKind;
  constructor(message: string, kind: ApiErrorKind, status: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** El AuthContext registra aquí qué hacer si el servidor responde 401 (sesión vencida). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  /** false = endpoint público (login): un 401 no significa "sesión vencida" */
  auth?: boolean;
};

function errorMessageFrom(data: unknown, status: number): string {
  const detail = (data as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (status === 422) return 'Los datos enviados no son válidos.';
  if (status >= 500) return 'El servidor tuvo un problema. Intenta nuevamente en unos minutos.';
  return `Error inesperado (${status}).`;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    if ((e as { name?: string })?.name === 'AbortError') {
      throw new ApiError('El servidor tardó demasiado en responder. Intenta de nuevo.', 'timeout');
    }
    throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión a internet.', 'network');
  } finally {
    clearTimeout(timer);
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null; // respuesta sin cuerpo JSON
  }

  if (!response.ok) {
    if (response.status === 401 && auth) onUnauthorized?.();
    throw new ApiError(errorMessageFrom(data, response.status), 'http', response.status);
  }
  return data as T;
}
