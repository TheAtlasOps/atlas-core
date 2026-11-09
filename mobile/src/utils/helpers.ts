import type { ThemeColors } from '../theme/colors';

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function dbmQuality(v: number, c: ThemeColors) {
  if (v >= -70)  return { label: 'Excelente', bars: 4, color: c.green };
  if (v >= -85)  return { label: 'Buena',     bars: 3, color: c.blue };
  if (v >= -100) return { label: 'Regular',   bars: 2, color: c.amber };
  return               { label: 'Débil',      bars: 1, color: c.red };
}

/**
 * Valida si un string cumple el formato de correo electrónico corporativo válido.
 * Consistente con la validación de frontend web en utils/passwordRecovery.js.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z0-9-]{2,}$/.test(email.trim());
}

/**
 * Formatea un timestamp en milisegundos a una etiqueta relativa en español.
 * Ejemplos: "hace un momento", "hace 15s", "hace 2 min", "hace 1 h".
 */
export function formatTimeAgo(timestampMs: number, nowMs: number = Date.now()): string {
  if (!timestampMs || timestampMs <= 0) return 'hace un momento';
  const diffSec = Math.max(0, Math.floor((nowMs - timestampMs) / 1000));
  if (diffSec < 10) return 'hace un momento';
  if (diffSec < 60) return `hace ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return 'hace 1 min';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return 'hace 1 h';
  return `hace ${diffHours} h`;
}
