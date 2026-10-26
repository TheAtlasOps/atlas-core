# Activación de recuperación de acceso

Este cambio no ejecuta SQL al iniciar FastAPI ni durante el build. No modificar
`Database/` ni usar los workflows SQL como mecanismo de activación. La rama `dev`
de Neon actualmente utilizada por la aplicación publicada se trata como producción.

## 1. Migración (operación separada, requiere autorización)

La revisión Alembic `20261026_01` presupone que existe el esquema ATLAS y la tabla
`users`. Es la primera revisión versionada; no crea las tablas del esquema base.
Antes de aplicar, comprobar en la base destino: esquema existente, ausencia de
`users.auth_version` y de `password_reset_tokens`, y estado de `alembic_version`.
Si existe un historial Alembic distinto, detenerse y reconciliarlo; no hacer stamp
ni cambiar el historial automáticamente.

En una base de pruebas vacía y aislada, cargar primero el esquema base autorizado,
sin semillas de usuarios reales. Usar credenciales y datos sintéticos. Configurar
`DATABASE_SYNC_URL` para esa base exclusivamente. Desde `backend/`, revisar primero:

```powershell
python -m alembic upgrade head --sql
```

La generación anterior es offline. Tras revisar SQL y confirmar host/base con un
administrador, aplicar en el entorno aprobado:

```powershell
python -m alembic upgrade head
python -m alembic current
```

La migración añade `users.auth_version` (entero, valor inicial 0) y una tabla con
resúmenes SHA-256 de tokens, caducidad y fecha de consumo. No cambia contraseñas,
correos, roles ni estados existentes. Aplicar la migración **antes** de publicar
el backend que usa la columna nueva. No incluir Alembic en startCommand/buildCommand.
No ejecutar downgrade tras usar recuperación: eliminar auth_version eliminaría
la revocación por versión; cualquier reversión necesita revisión específica.

## 2. Render y Vercel

- Conservar `DATABASE_URL`, claves JWT y el proveedor de correo actual (SendGrid o
  Resend). Configurar un remitente autorizado mediante `EMAILS_FROM_EMAIL`.
- Por defecto, el origen de `FRONTEND_PORTAL_URL` se usa con `/reset-password`.
  Si frontend y portal tienen orígenes diferentes, configurar `PASSWORD_RESET_URL`
  con la URL HTTPS completa, por ejemplo `https://<frontend>/reset-password`.
  Nunca se toma el origen del encabezado Host de una petición.
- En Vercel conservar `VITE_API_URL` hacia el backend. Las reescrituras SPA
  existentes ya sirven `/forgot-password` y `/reset-password`.
- Los tokens viajan en un fragmento `#token=...`; el navegador lo retira de la URL
  y lo envía al backend solo en el cuerpo POST. No copiarlos a logs ni tarjetas.
- La respuesta de solicitud siempre es 202 con el mismo texto para correos
  existentes, inexistentes o inactivos. La entrega se procesa en segundo plano.
  Revisar únicamente los eventos `password_reset_*` y `sensitive_email_*` sin
  datos personales. Una simulación sin proveedor **no** se considera entrega:
  el enlace se invalida y nunca se devuelve al cliente.
- Emisión limitada a un enlace por cuenta cada minuto; el nuevo invalida los
  anteriores. Hay un límite adicional de 20 solicitudes por IP cada cinco minutos
  por proceso, con respuesta pública idéntica al alcanzar el límite. Configurar además límites de tráfico en el proxy del entorno si
  están disponibles. Los background tasks no son una cola durable: si el proceso
  reinicia antes de enviar, solicitar otro enlace pasado el minuto de espera.

## 3. Prueba de aceptación aislada

1. Iniciar sesión con una cuenta sintética y conservar el JWT solo en memoria.
2. Solicitar recuperación para esa cuenta, una inexistente y una inactiva:
   comprobar idéntica respuesta, sin token ni detalles de entrega.
3. Recuperar el enlace únicamente del buzón de pruebas. Comprobar pantalla en
   ambos temas, móvil/escritorio, contraseñas distintas y límite bcrypt (72 bytes).
4. Completar cambio: contraseña anterior rechazada, nueva aceptada; UUID, correo,
   rol y estado conservados. El JWT anterior debe devolver 401 en `/auth/me`.
5. Reutilizar enlace, usar uno vencido y sustituirlo por otro: deben rechazarse.
   Probar dos consumos concurrentes en PostgreSQL: solo uno debe confirmar.
6. Confirmar en la base aislada que solo hay hash bcrypt y resumen del token,
   nunca el token original. No mostrar ninguno de esos valores en la evidencia.

## 4. Recuperación administrativa

La herramienta usa únicamente `ATLAS_ADMIN_DATABASE_URL`, suministrada al proceso
desde el mecanismo seguro del operador. No acepta contraseñas ni DSN como argumentos.
No reutiliza DATABASE_URL como destino. Desde `backend/`:

```powershell
python -m scripts.reset_account_password --user-id <UUID> --email <correo> --expected-host <host> --expected-database <base>
```

Ese comando solo comprueba la cuenta. Para cambiarla, la operación y base concreta
deben estar autorizadas. Repetir con `--apply`; exige terminal, UUID de confirmación
y contraseña oculta dos veces. Cambia únicamente hash y versión de autenticación,
e invalida enlaces pendientes. No crea usuarios, no activa cuentas ni cambia roles.

## Checks locales

Desde `backend/`: `python -m pytest tests -q -p no:cacheprovider`.
Desde `frontend/`: `node --test tests/*.test.js`, `npm run lint`, `npm run build`.
Las pruebas existentes bloquean lectura de .env y conexiones externas; las de
recuperación usan SQLite en memoria y adaptador de sesión, sin dependencias nuevas.
La compilación SQL de migración se comprueba sin conectar a PostgreSQL. Los bloqueos
FOR UPDATE se validan por compilación PostgreSQL y requieren la prueba concurrente
descrita arriba antes de activar producción.
