# 📱 Atlas Técnico — App móvil

Aplicación móvil para **técnicos en terreno** de la plataforma **Atlas** (Field Service Management). Permite ver la agenda de visitas asignadas, registrar el trabajo realizado (checklist, señal dBm, estado del equipo, evidencia fotográfica, notas) y cerrar la visita, todo conectado al backend de Atlas.

> Es la tercera interfaz de Atlas, junto al panel web de coordinación y el portal de clientes. Ver el [README principal](../README.md).

---

## ✨ Funcionalidades

- **Inicio de sesión** con correo y contraseña (JWT). Solo accede el rol `TECNICO`.
- **Sesión persistente**: el token se guarda cifrado en el dispositivo (Keychain / Keystore).
- **Agenda del día** con cards generadas a partir de las órdenes de trabajo asignadas al técnico en la base de datos.
  - Actualización con *pull-to-refresh* y al volver a la app desde segundo plano.
  - Estados de carga, error con reintento y "sin visitas".
- **Detalle de la visita** con pestañas: Resumen, Checklist, Equipo, Evidencias y Notas.
- **Cambios de estado en el servidor**: *Confirmar ingreso* (`EN_SITIO`) y *Finalizar visita* (`COMPLETADA`). Lo registrado en terreno (notas, dBm, estado del equipo, ICCID, checklist) queda como comentario en el historial de la orden.
- **Evidencia fotográfica** desde cámara o galería, con visor a pantalla completa (zoom con pellizco, doble toque y deslizar entre fotos).
- **Tema claro / oscuro / automático** (sigue el del dispositivo), con transición suave y preferencia recordada.

---

## 🧰 Stack tecnológico

| Área | Tecnología |
|---|---|
| Framework | [Expo](https://expo.dev) SDK 58 (flujo *managed*) + React Native 0.88 + React 19 |
| Lenguaje | TypeScript |
| Estilos | [NativeWind](https://www.nativewind.dev) 4 + Tailwind CSS 3 |
| Gestos y animación | `react-native-gesture-handler`, `react-native-reanimated` 4 + `react-native-worklets` |
| Cámara y galería | `expo-image-picker` |
| Almacenamiento | `expo-secure-store` (token) · `@react-native-async-storage/async-storage` (preferencias) |
| Backend | API REST FastAPI de Atlas (carpeta [`backend/`](../backend)) |

---

## ✅ Requisitos

- [Node.js](https://nodejs.org) LTS y npm
- **Expo Go** en tu teléfono (iOS / Android) — o un emulador Android / simulador iOS
- Una cuenta de **técnico** creada en Atlas, con órdenes asignadas (ver [Cuenta de prueba](#-cuenta-de-prueba))

> ⚠️ Las versiones de las librerías están fijadas para **Expo SDK 58**. No actualices `react-native-reanimated` ni `react-native-worklets` por separado: deben coincidir con la versión que espera el SDK (ver [Solución de problemas](#-solución-de-problemas)).

---

## 🚀 Puesta en marcha

Todos los comandos se ejecutan dentro de la carpeta `mobile/`.

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar la URL de la API
cp .env.example .env        # en PowerShell: Copy-Item .env.example .env

# 3. Iniciar el servidor de desarrollo
npx expo start --clear
```

Escanea el código QR con **Expo Go** (iOS: app Cámara · Android: dentro de Expo Go).

| Comando | Qué hace |
|---|---|
| `npx expo start` | Inicia el servidor de desarrollo (muestra el QR) |
| `npx expo start --clear` | Igual, limpiando la caché (úsalo tras cambiar `.env` o `app.json`) |
| `npx expo start --ios` | Abre el simulador de iOS (solo macOS) |
| `npx expo start --android` | Abre el emulador de Android |
| `npx expo start --web` | Versión web (ver nota de CORS abajo) |
| `npx expo install --check` | Verifica que las versiones de los paquetes sean las del SDK |
| `npx tsc --noEmit` | Revisa los tipos de TypeScript |

---

## ⚙️ Configuración de la API

La app lee la URL del backend desde la variable `EXPO_PUBLIC_API_URL` del archivo `.env` (que **no** se sube al repositorio; cada desarrollador usa el suyo).

```env
# Backend desplegado en Render
EXPO_PUBLIC_API_URL=https://atlas-fsm-backend.onrender.com/api/v1

# Backend local con celular físico: usa la IP de tu PC en la red WiFi, NO "localhost"
# EXPO_PUBLIC_API_URL=http://192.168.1.50:8000/api/v1
```

Reglas importantes:
- La URL debe incluir `/api/v1` y **no** terminar en `/`.
- Si no existe `.env`, se usa la URL de Render por defecto (`src/config.ts`).
- Después de cambiar `.env`, reinicia con `npx expo start --clear`.
- Celular y PC deben estar en la **misma red WiFi** para usar el backend local.

### Endpoints que usa la app

| Método | Ruta | Uso |
|---|---|---|
| `POST` | `/auth/login` | Inicio de sesión (devuelve el JWT y el rol) |
| `GET` | `/orders` | Órdenes asignadas al técnico (el backend filtra por el usuario autenticado) |
| `PATCH` | `/orders/{id}/status` | Cambio de estado (`EN_SITIO`, `COMPLETADA`) con comentario |

### Correspondencia de estados

| Estado en la API | Estado en la app |
|---|---|
| `IDLE`, `CONFIRMADA` | Programada |
| `EN_RUTA` | En ruta |
| `EN_SITIO` | En curso |
| `COMPLETADA` | Completada |
| `CANCELADA` | *(no se muestra)* |

---

## 🔑 Cuenta de prueba

La app solo admite usuarios con rol **TECNICO**. Para probar:

1. Crea el técnico desde el **panel web de Atlas** (sección *Técnicos*), o usa el script `backend/scripts/seed_demo_real.py`.
2. Desde el panel web, **asigna al menos una orden** a ese técnico.
3. Inicia sesión en la app con ese correo y contraseña.

> Los técnicos de `Database/seed.sql` tienen un hash de relleno, así que **no** sirven para iniciar sesión.

---

## 🗂️ Estructura del proyecto

```text
mobile/
├── App.tsx                  # Raíz: tema → sesión → pantallas; cambios de estado
├── index.js                 # Punto de entrada de Expo
├── app.json                 # Configuración de Expo (permisos, plugins, tema)
├── global.css               # Directivas de Tailwind
├── tailwind.config.js       # Tokens de color (variables CSS por tema)
├── metro.config.js          # Integración NativeWind ↔ Metro
├── babel.config.js
├── .env.example             # Plantilla de variables de entorno
└── src/
    ├── api/
    │   ├── client.ts        # Cliente HTTP (token, timeout, errores)
    │   ├── auth.ts          # login
    │   ├── orders.ts        # listar órdenes / cambiar estado
    │   ├── mappers.ts       # orden de la API → visita de la app
    │   ├── storage.ts       # almacenamiento cifrado del token
    │   └── types.ts         # DTOs de la API
    ├── auth/AuthContext.tsx # Sesión: login, logout, restauración
    ├── hooks/useVisits.ts   # Carga y refresco de visitas
    ├── screens/             # Login · Agenda · Detalle · Éxito
    ├── components/          # Componentes comunes · Visor de fotos
    ├── theme/               # Paleta, contexto de tema claro/oscuro/auto
    ├── data/mockData.ts     # Constantes (checklist, estados, colores por servicio)
    ├── types/               # Tipos de la app
    ├── utils/helpers.ts
    └── config.ts            # URL de la API y timeout
```

---

## 🎨 Temas

Los colores viven en `src/theme/palette.js` (fuente única) y se exponen como variables CSS que Tailwind consume (`bg-card`, `text-text1`, `border-border`, …). El usuario elige **Automático / Claro / Oscuro** desde el ícono del encabezado de la agenda; la elección se guarda en el dispositivo.

---

## 🛠️ Solución de problemas

**La web no inicia sesión y dice "revisa tu conexión a internet"**
Es un bloqueo de **CORS**: el backend solo permite ciertos orígenes y el navegador rechaza el de Expo web (`http://localhost:8081`). En el iPhone/Android no ocurre porque las apps nativas no aplican CORS. Soluciones:
- Rápida: `npx expo start --web --port 5173` (ese origen ya está permitido).
- Definitiva: agregar `http://localhost:8081,http://127.0.0.1:8081` a la variable `CORS_ORIGINS` del backend (en Render → *Environment*, o en `backend/.env`).

**La primera petición tarda casi un minuto**
Render (plan gratuito) duerme el servicio tras un rato sin uso. La app espera hasta 60 segundos y lo avisa en pantalla. Las siguientes peticiones son rápidas.

**"No se pudo conectar con el servidor" en el celular con backend local**
Usa la IP de tu PC (no `localhost`), misma red WiFi, el backend iniciado con `--host 0.0.0.0`, y revisa que el firewall permita el puerto 8000.

**Tu sesión expiró**
El token dura 60 minutos. Vuelve a iniciar sesión.

**Error de Reanimated / Worklets ("not compatible")**
Las versiones deben ser las del SDK: `react-native-reanimated 4.7.1` y `react-native-worklets 0.13.0`. Si cambiaste algo: borra `node_modules` y `package-lock.json`, ejecuta `npm install` y luego `npx expo install --check`.

**Cientos de errores "Cannot use JSX unless the '--jsx' flag is provided"**
Faltan los `node_modules` (el `tsconfig` extiende un archivo de Expo). Ejecuta `npm install` y reinicia el servidor de TypeScript (`Ctrl+Shift+P` → *TypeScript: Restart TS Server*).

**Cambié `app.json` o `.env` y no se nota**
Reinicia con `npx expo start --clear`.

---

## 🗺️ Pendiente / próximos pasos

- [ ] Subir las fotos de evidencia al servidor (`/evidences/upload` + `/evidences`; límite de 2 MB por imagen)
- [ ] Mostrar el equipo y la SIM asociados a cada orden (requiere exponerlos en la API)
- [ ] Modo sin conexión con cola de sincronización (`/orders/sync-batch`)
- [ ] Estado "En ruta" desde la app y captura de GPS
- [ ] Persistir en el servidor el checklist, la señal dBm y el estado del equipo como datos estructurados (hoy van como comentario del historial)

---

## 📄 Licencia

Proyecto desarrollado como parte del Portafolio de Título (Duoc UC). El archivo [`LICENSE`](./LICENSE) de esta carpeta es el que incluye la plantilla de Expo (MIT, 650 Industries); revisa con tu equipo qué licencia corresponde al proyecto.