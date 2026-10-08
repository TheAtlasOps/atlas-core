import { useContext } from "react";
import { ThemeContext } from "../context/theme-context";

/**
 * useTheme — acceso al tema global.
 * @returns {{ theme: "light" | "dark", isDark: boolean, setTheme: (t: "light" | "dark") => void, toggleTheme: () => void }}
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme debe usarse dentro de <ThemeProvider>.");
  }
  return ctx;
}
