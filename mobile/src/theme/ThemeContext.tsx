import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { palettes, themeVars } from './colors';
import type { ThemeColors, ThemeMode } from './colors';

// ─── Tema claro / oscuro / automático ─────────────────────────────────────────
export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'atlas.themePreference';
const DEFAULT_PREFERENCE: ThemePreference = 'system';
/** Duración (ms) del fade al cambiar de tema */
const FADE_MS = 350;

function isPreference(v: unknown): v is ThemePreference {
  return v === 'system' || v === 'light' || v === 'dark';
}

// Si el dispositivo no informa su tema, se usa el oscuro (el diseño original de la app)
function resolveMode(pref: ThemePreference, system: string | null | undefined): ThemeMode {
  if (pref === 'system') return system === 'light' ? 'light' : 'dark';
  return pref;
}

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // se actualiza solo cuando cambia el tema del dispositivo
  const [preference, setPreferenceState] = useState<ThemePreference>(DEFAULT_PREFERENCE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (active && isPreference(saved)) setPreferenceState(saved);
      })
      .catch(() => {}) // si falla la lectura, se usa la preferencia por defecto
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {}); // guardar sin bloquear la UI
  }, []);

  const mode = resolveMode(preference, systemScheme);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, setPreference, mode, isDark: mode === 'dark', colors: palettes[mode] }),
    [preference, setPreference, mode],
  );

  // ── Fade entre temas ──
  const fade = useRef(new Animated.Value(0)).current;
  const [shownMode, setShownMode] = useState<ThemeMode>(mode);
  const [fadeFrom, setFadeFrom] = useState<ThemeMode | null>(null);

  if (shownMode !== mode) {
    setShownMode(mode);
    if (loaded) {
      setFadeFrom(shownMode);
      fade.setValue(1);
    }
  }

  useEffect(() => {
    if (!fadeFrom) return;
    const anim = Animated.timing(fade, {
      toValue: 0,
      duration: FADE_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) setFadeFrom(null);
    });
    return () => anim.stop();
  }, [fadeFrom, fade]);

  // Mientras se lee la preferencia guardada, mostrar solo un fondo neutro (evita un
  // parpadeo con el tema equivocado)
  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: palettes[resolveMode('system', systemScheme)].bg }} />;
  }

  return (
    <ThemeContext.Provider value={value}>
      {/* Este View define las variables CSS del tema; todo lo de adentro las hereda */}
      <View style={[{ flex: 1 }, themeVars[mode]]}>
        <View className="flex-1 bg-bg">{children}</View>
        {fadeFrom && (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: palettes[fadeFrom].bg, opacity: fade }]}
          />
        )}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}