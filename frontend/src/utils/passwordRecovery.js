export function recoveryTokenFromHash(hash) {
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("token") || "";
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : "";
}

export function passwordRecoveryError(password, confirmation) {
  if (password !== confirmation) return "Las contraseñas no coinciden.";
  if (Array.from(password).length < 12 || !password.trim()) return "La contraseña debe tener al menos 12 caracteres.";
  if (new TextEncoder().encode(password).length > 72) return "La contraseña supera el máximo de 72 bytes permitido por bcrypt.";
  return "";
}
