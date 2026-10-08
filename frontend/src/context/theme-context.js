import { createContext } from "react";

export const THEME_STORAGE_KEY = "atlas-theme";

/** Contexto del tema. Vive aparte del provider para mantener Fast Refresh. */
export const ThemeContext = createContext(null);
