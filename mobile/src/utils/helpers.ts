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
