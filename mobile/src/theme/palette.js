// Paleta de colores por tema, como canales "R G B".
// Fuente única: la usan tailwind.config.js (CommonJS) y src/theme/colors.ts.
// Formato de canales para poder usar opacidades, ej. `bg-brand/20`.

const dark = {
  bg:           '12 12 12',
  card:         '26 26 26',
  surface:      '36 36 36',
  brand:        '249 115 22',
  'brand-dim':  '42 22 8',
  'brand-text': '251 146 60',
  overlay:      '255 255 255', // base de bordes y fondos translúcidos
  text1:        '245 245 245',
  text2:        '156 163 175',
  text3:        '75 85 99',
  blue:         '96 165 250',
  'blue-dim':   '13 27 46',
  green:        '74 222 128',
  'green-dim':  '10 31 15',
  red:          '248 113 113',
  'red-dim':    '31 8 8',
  amber:        '251 191 36',
  'amber-dim':  '31 21 7',
};

const light = {
  bg:           '244 244 245',
  card:         '255 255 255',
  surface:      '228 228 231',
  brand:        '249 115 22',
  'brand-dim':  '255 237 213',
  'brand-text': '194 65 12',
  overlay:      '0 0 0',
  text1:        '24 24 27',
  text2:        '82 82 91',
  text3:        '113 113 122',
  blue:         '37 99 235',
  'blue-dim':   '219 234 254',
  green:        '22 163 74',
  'green-dim':  '220 252 231',
  red:          '220 38 38',
  'red-dim':    '254 226 226',
  amber:        '217 119 6',
  'amber-dim':  '254 243 199',
};

module.exports = { dark, light };