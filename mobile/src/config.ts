// ─── Configuración ────────────────────────────────────────────────────────────
// URL base de la API (FastAPI). Se define en el archivo `.env` (ver `.env.example`):
//   EXPO_PUBLIC_API_URL=https://atlas-fsm-backend.onrender.com/api/v1
// Expo incluye en la app solo las variables que empiezan con EXPO_PUBLIC_.
const DEFAULT_API_URL = 'https://atlas-fsm-backend.onrender.com/api/v1';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

/** Tiempo máximo de espera por petición. Render (plan gratis) puede tardar ~50 s en "despertar". */
export const REQUEST_TIMEOUT_MS = 60_000;
