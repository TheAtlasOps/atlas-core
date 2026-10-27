export function recoveryTokenFromHash(hash) {
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("token") || "";
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : "";
}

export function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z0-9-]{2,}$/.test(trimmed);
}

export function isPasswordLengthValid(password) {
  if (!password || typeof password !== "string") return false;
  const chars = Array.from(password);
  if (chars.length < 12 || !password.trim()) return false;
  if (new TextEncoder().encode(password).length > 72) return false;
  return true;
}

export function passwordRecoveryError(password, confirmation) {
  if (password !== confirmation) return "Las contraseñas no coinciden.";
  if (Array.from(password).length < 12 || !password.trim()) return "La contraseña debe tener al menos 12 caracteres.";
  if (new TextEncoder().encode(password).length > 72) return "La contraseña supera el máximo de 72 bytes permitido por bcrypt.";
  return "";
}
