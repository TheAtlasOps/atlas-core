/**
 * Utilidades de normalización, formato y validación de RUT chileno (Módulo 11).
 */

export function normalizeRutKey(rawRut) {
  if (!rawRut) return "";
  return String(rawRut).replace(/[\s.-]/g, "").toUpperCase();
}

export function computeRutDv(body) {
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "K";
  return String(remainder);
}

export function formatChileanRut(rawRut) {
  const key = normalizeRutKey(rawRut);
  if (!/^\d{6,8}[0-9K]$/.test(key)) return rawRut ? String(rawRut).trim() : "";

  const body = key.slice(0, -1);
  const dv = key.slice(-1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formattedBody}-${dv}`;
}

export function validateChileanRut(rawRut) {
  const key = normalizeRutKey(rawRut);
  if (!key) return true; // opcional cuando no se proporciona
  if (!/^\d{6,8}[0-9K]$/.test(key)) return false;

  const body = key.slice(0, -1);
  const dv = key.slice(-1);
  return computeRutDv(body) === dv;
}
