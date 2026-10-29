import { vars } from 'nativewind';

import { dark, light } from './palette';

// ─── Tokens de color por tema ─────────────────────────────────────────────────
export type ThemeMode = 'dark' | 'light';

export type ThemeColors = Record<
  | 'bg' | 'card' | 'surface'
  | 'brand' | 'brandDim' | 'brandText'
  | 'overlay'
  | 'text1' | 'text2' | 'text3'
  | 'blue' | 'blueDim' | 'green' | 'greenDim'
  | 'red' | 'redDim' | 'amber' | 'amberDim',
  string
>;

// "12 12 12" -> "#0C0C0C"
const toHex = (channels: string) =>
  '#' + channels.split(' ').map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();

// "brand-dim" -> "brandDim"
const camel = (k: string) => k.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());

function buildColors(p: Record<string, string>): ThemeColors {
  return Object.fromEntries(
    Object.entries(p).map(([k, v]) => [camel(k), toHex(v)]),
  ) as ThemeColors;
}

function buildVars(p: Record<string, string>) {
  return vars(Object.fromEntries(Object.entries(p).map(([k, v]) => [`--c-${k}`, v])));
}

/** Hex por tema: para íconos, Slider, placeholders y demás props sin className */
export const palettes: Record<ThemeMode, ThemeColors> = {
  dark:  buildColors(dark),
  light: buildColors(light),
};

/** Variables CSS por tema: las consume Tailwind (bg-card, text-text1, ...) */
export const themeVars = {
  dark:  buildVars(dark),
  light: buildVars(light),
};