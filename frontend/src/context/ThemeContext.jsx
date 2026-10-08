import { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeContext, THEME_STORAGE_KEY } from "./theme-context";

const DEFAULT_THEME = "dark"; // El diseño original de Atlas era oscuro.

function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* localStorage puede no estar disponible (modo privado, SSR) */
  }
  return DEFAULT_THEME;
}

function applyThemeToDocument(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

/**
 * ThemeProvider — estado global del tema ("light" | "dark").
 * Agrega/quita la clase `dark` en <html> y persiste la elección en localStorage.
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);

  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignorar */
    }
  }, [theme]);

  // Mantener sincronizadas varias pestañas abiertas.
  useEffect(() => {
    function onStorage(e) {
      if (e.key === THEME_STORAGE_KEY && (e.newValue === "light" || e.newValue === "dark")) {
        setThemeState(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next === "light" ? "light" : "dark");
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(
    () => ({ theme, isDark: theme === "dark", setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
