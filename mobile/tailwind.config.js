/** @type {import('tailwindcss').Config} */
const { dark } = require('./src/theme/palette');


// Formato `rgb(var(--x) / <alpha-value>)` => permite opacidades: bg-brand/20
const themed = Object.fromEntries(
  Object.keys(dark).map((k) => [k, `rgb(var(--c-${k}) / <alpha-value>)`]),
);

module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ...themed,
        // Bordes: usan el color "overlay" (blanco en oscuro, negro en claro) con alfa fijo
        border:          'rgb(var(--c-overlay) / 0.07)',
        'border-bright': 'rgb(var(--c-overlay) / 0.11)',
      },
      fontFamily: {
        mono: ['monospace'],
      },
    },
  },
  plugins: [
    // Valores por defecto (tema oscuro) para cualquier elemento fuera del ThemeProvider
    ({ addBase }) =>
      addBase({
        ':root': Object.fromEntries(Object.entries(dark).map(([k, v]) => [`--c-${k}`, v])),
      }),
  ],
};