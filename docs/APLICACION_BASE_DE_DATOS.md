# 📱 Conexión Aplicación / Base de Datos: Guía Técnica de Integración y Arquitectura

**Proyecto:** ATLAS - Field Service Management (FSM)  
**Código de Documento:** ATLAS-INT-APP-DB-01  
**Tipo de Entregable:** Especificación Técnica de Conexión Aplicación / Base de Datos  
**Equipo Responsable:** Alexander Sáez (DevOps / DBA), Joaquín Mendoza (Backend Lead), Diego Jiménez (Frontend/Mobile Lead), Matías Abarca (QA)  
**Institución:** Duoc UC - Escuela de Informática y Telecomunicaciones  
**Fecha:** Noviembre 2026 | **Versión:** 1.0  

---

## 1. Introducción y Justificación Arquitectónica

El presente documento técnico establece el modelo de integración, comunicación y persistencia de datos entre la **Aplicación Móvil (React Native / Expo)** y la **Base de Datos Relacional PostgreSQL Serverless (Neon.tech)** para el proyecto **ATLAS - Field Service Management (FSM)**.

### 1.1. Análisis Comparativo: Conexión Directa vs Arquitectura de 3 Capas

En el desarrollo de software móvil, conectarse directamente desde el teléfono por TCP (puerto 5432) a PostgreSQL es considerado un grave **antipatrón de diseño**. ATLAS implementa una **Arquitectura en 3 Capas Desacoplada**:

| Criterio de Evaluación | Conexión Directa Móvil ➔ PostgreSQL (Descartada) | Arquitectura 3 Capas ATLAS: Móvil ➔ FastAPI ➔ Neon (Adoptada) |
|---|---|---|
| **Seguridad de Credenciales** | Crítico: Cadena de conexión y credenciales maestras quedarían expuestas en el APK/IPA descompilable. | Máxima: El cliente móvil desconoce las credenciales de la BD; opera exclusivamente con tokens temporales JWT. |
| **Gestión de Conexiones** | Pobre: Cientos de teléfonos saturarían el límite de conexiones concurrentes del motor relacional. | Eficiente: FastAPI administra un Connection Pool asíncrono controlado (10-20 conexiones reutilizables). |
| **Restricciones de Red Móvil** | Bloqueos frecuentes: Las redes celulares 4G/5G bloquean puertos no estándar como el 5432. | Transparente: Tráfico cifrado mediante HTTPS estándar (puerto 443) compatible con todas las operadoras. |
| **Lógica de Negocio y Reglas** | Difusa: Complicaría la validación de estados y auditoría en cada cliente móvil. | Centralizada: FastAPI valida esquemas con Pydantic, aplica roles (RBAC) y sanitiza peticiones. |
| **Resiliencia Fuera de Línea** | Nula: Pérdida momentánea de cobertura aborta sockets TCP y corrompe transacciones. | Robusta: La app gestiona caché local (AsyncStorage/SecureStore) y reintenta operaciones al recuperar señal. |

---

## 2. Stack Tecnológico y Componentes de la Integración

```
┌─────────────────────────────────┐
│     1. CLIENTE MÓVIL (APP)      │
│  React Native + Expo (Android)  │
│  - SecureStore (JWT Token)      │
│  - AsyncStorage (Offline Cache) │
└────────────────┬────────────────┘
                 │ HTTPS (TLS 1.3) / JSON REST API
                 │ Authorization: Bearer <JWT>
                 ▼
┌─────────────────────────────────┐
│     2. CAPA BACKEND (API)       │
│   FastAPI (Python en Render)    │
│  - Validación Pydantic          │
│  - SQLAlchemy 2.0 (asyncpg)     │
│  - Connection Pool (10/20)      │
└────────────────┬────────────────┘
                 │ TCP + TLS / SSL Obligatorio
                 │ asyncpg connection string
                 ▼
┌─────────────────────────────────┐
│  3. BASE DE DATOS (PERSISTENCIA)│
│  Neon PostgreSQL Serverless     │
│  - Tablas: work_orders,         │
│    evidences, technicians, etc. │
└─────────────────────────────────┘
```

1. **Capa 1: Cliente Móvil (Frontend)**: React Native 0.88, Expo 58, TypeScript, Expo SecureStore y AsyncStorage.
2. **Capa 2: API Gateway / Lógica (Backend)**: FastAPI, Python 3.11, SQLAlchemy 2.0 con driver asíncrono `asyncpg`, alojado en Render.
3. **Capa 3: Persistencia de Datos (Database)**: PostgreSQL 15/16 Serverless en Neon.tech con modo SSL requerido (`sslmode=require`).

---

## 3. Seguridad, Autenticación y Flujo Transaccional

### 3.1. Flujo de Autenticación con Tokens JWT Bearer
1. **Solicitud de Login**: El técnico envía credenciales mediante HTTPS POST a `/api/v1/auth/login`.
2. **Validación en BD**: FastAPI consulta el hash de contraseña (bcrypt) en PostgreSQL.
3. **Emisión de Token**: Si es válido, se emite un JWT firmado con `SECRET_KEY`.
4. **Almacenamiento Seguro**: El móvil almacena el token en `SecureStore` (Keystore/Keychain del SO móvil).
5. **Inyección en Cabecera**: Cada petición adjunta `Authorization: Bearer <token>`.

### 3.2. Ciclo de Vida de Escritura: Registro de Evidencias
- Captura de foto con cámara (`expo-image-picker`) y geolocalización satelital (`expo-location`).
- Envío a través del endpoint `POST /api/v1/work-orders/{id}/evidences`.
- Transacción atómica en FastAPI (`AsyncSession`): inserción en `evidences` + cambio de estado en `work_orders`.
- COMMIT con retorno `201 Created` o ROLLBACK automático si ocurre alguna inconsistencia.

---

## 4. Configuración de Parámetros y Variables de Entorno

* **Móvil (`.env`)**:
  ```env
  EXPO_PUBLIC_API_URL=https://atlas-fsm-backend.onrender.com/api/v1
  ```
* **Móvil (`src/config.ts`)**:
  ```typescript
  export const API_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
  export const REQUEST_TIMEOUT_MS = 60_000; // Tolerancia a cold-start de hosting
  ```
* **Backend (`.env`)**:
  ```env
  DATABASE_URL=postgresql+asyncpg://neondb_owner:<PASSWORD>@<HOST_NEON>/atlas_fsm?sslmode=require
  SECRET_KEY=<CLAVE_SECRETA_JWT>
  ALGORITHM=HS256
  ```

---

## 5. Evidencias Visuales de la Integración (5 Espacios para Imágenes)

A continuación se disponen los apartados formales para incorporar las capturas de verificación:

### 📷 Imagen 1: Diagrama de Arquitectura de Conexión (Móvil ➔ Backend ➔ PostgreSQL)
> *Instrucciones:* Inserte el diagrama de bloques que represente la interacción de 3 capas entre la app móvil React Native, la API FastAPI y la base de datos PostgreSQL Neon.  
> **Figura 1: Arquitectura de 3 capas para la comunicación segura entre la aplicación móvil ATLAS y la base de datos PostgreSQL en Neon.**

---

### 📷 Imagen 2: Configuración de Variables de Entorno y Cliente API en la App Móvil
> *Instrucciones:* Inserte la captura de pantalla de los archivos `mobile/src/config.ts` y `.env` mostrando la variable `EXPO_PUBLIC_API_URL` y el cliente HTTP `client.ts`.  
> **Figura 2: Configuración del cliente HTTP y variables de entorno del entorno móvil en Expo.**

---

### 📷 Imagen 3: Flujo de Autenticación Móvil y Almacenamiento Seguro del Token JWT
> *Instrucciones:* Inserte la captura de la pantalla de Login en el teléfono (`LoginScreen.tsx`) o el bloque de código donde se almacena el token recibido en `SecureStore`.  
> **Figura 3: Pantalla de autenticación técnica en la aplicación móvil y recepción del token Bearer.**

---

### 📷 Imagen 4: Recepción de Peticiones y Endpoints en la API Backend (Swagger UI / Logs)
> *Instrucciones:* Inserte la captura de pantalla de la documentación Swagger UI (`/docs`) o de los logs de Render procesando peticiones del móvil.  
> **Figura 4: Documentación Swagger de endpoints RESTful y procesamiento de peticiones provenientes del móvil.**

---

### 📷 Imagen 5: Persistencia y Verificación de Datos en PostgreSQL (Neon Console / DBeaver)
> *Instrucciones:* Inserte la captura de pantalla de Neon Console (SQL Editor) o cliente SQL de escritorio (DBeaver) mostrando los registros de órdenes o evidencias guardados desde la app.  
> **Figura 5: Verificación de tuplas y registros persistidos en las tablas de PostgreSQL Neon tras la interacción móvil.**

---

## 6. Conclusiones y Recomendaciones Técnicas
1. **Cumplimiento de Seguridad OWASP MASVS**: No se exponen credenciales de base de datos en los dispositivos móviles.
2. **Eficiencia y Escalabilidad**: El pool asíncrono de FastAPI protege a PostgreSQL Neon ante cientos de peticiones móviles concurrentes.
3. **Mantenibilidad**: Los cambios en tablas o esquemas de base de datos son absorbidos por la capa de API sin obligar a actualizar la app móvil en los clientes.
