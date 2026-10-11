import { useState } from "react";

/**
 * Obtiene hasta dos iniciales a partir del nombre completo.
 * "Diego Jiménez Escobar" -> "DJ"
 */
function getInitials(name) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const second = words.length > 1 ? words[1][0] : "";
  return (first + second).toUpperCase();
}

/**
 * Avatar administrativo con fallback a iniciales (fondo naranja corporativo Entel).
 * Si `src` falta, está vacío o la imagen falla al cargar (onError), se muestran las iniciales.
 */
export default function AdminAvatar({ src, name, className = "h-9 w-9 text-sm" }) {
  // Guardamos la URL que falló (en vez de un booleano) para que, si `src` cambia,
  // se vuelva a intentar cargar la nueva imagen sin necesidad de efectos.
  const [failedSrc, setFailedSrc] = useState(null);
  const hasImage = Boolean(src && src.trim()) && failedSrc !== src;

  if (hasImage) {
    return (
      <img
        src={src}
        alt={name ? `Foto de perfil de ${name}` : "Foto de perfil"}
        onError={() => setFailedSrc(src)}
        className={`shrink-0 rounded-full border border-slate-200 object-cover dark:border-gray-700 ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={name ? `Avatar de ${name}` : "Avatar"}
      className={`flex shrink-0 select-none items-center justify-center rounded-full bg-orange-500 font-semibold text-white ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
