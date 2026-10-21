import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

/**
 * ThemeToggle — botón tipo Switch (Toggle) para alternar Modo Claro / Modo Oscuro.
 *
 * - Accesible: role="switch" + aria-checked (checked = modo oscuro activo).
 * - La perilla muestra el ícono del modo activo (sol / luna) en naranjo Entel;
 *   la pista muestra el ícono del modo alternativo, atenuado.
 *
 * Props:
 *  - id        {string}  id del botón (permite asociarlo a un <label htmlFor>)
 *  - className {string}  clases extra para el contenedor
 */
export default function ThemeToggle({ id, className = "" }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      onClick={toggleTheme}
      className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border border-slate-200 bg-slate-100 transition-colors duration-200 hover:border-orange-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      {/* Ícono del modo alternativo (queda "detrás" de la perilla opuesta) */}
      <Sun
        aria-hidden="true"
        className={`absolute left-1.5 h-4 w-4 text-slate-400 transition-opacity duration-200 dark:text-gray-500 ${
          isDark ? "opacity-100" : "opacity-0"
        }`}
      />
      <Moon
        aria-hidden="true"
        className={`absolute right-1.5 h-4 w-4 text-slate-400 transition-opacity duration-200 dark:text-gray-500 ${
          isDark ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Perilla */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute left-0.5 top-0.5 flex h-5.5 w-5.5 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-orange-500/40 transition-transform duration-200 dark:bg-[#1e1e1e] ${
          isDark ? "translate-x-7" : "translate-x-0"
        }`}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-orange-500" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-orange-500" />
        )}
      </span>
    </button>
  );
}
