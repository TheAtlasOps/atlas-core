#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador de Documento 5: Manual de Implementación - Atlas FSM
Genera la versión Markdown (.md) y la versión Word (.docx) con formato Duoc UC.
"""

import os
import sys
from generate_docs_4_5_6 import (
    make_project_box, compile_docx, make_p, make_table,
    DEST_DIRS, ATLAS_CORE_DIR
)

def build_doc5_elements(elements):
    # Cuadro institucional superior
    elements.append(make_project_box("Manual de Implementación y Despliegue", "DOC-05"))
    elements.append(make_p(style="Normal", runs=[], space_after=120))

    # SECCIÓN 1: REQUISITOS DE INFRAESTRUCTURA
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "1. Requisitos de Infraestructura y Arquitectura Cloud", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    elements.append(make_p(style="Normal", runs=[
        {"text": "El presente ", "color": "333333"},
        {"text": "Manual de Implementación de Atlas FSM", "bold": True, "color": "1F4E79"},
        {"text": " detalla las directrices técnicas, dependencias, configuraciones y procedimientos requeridos para instalar, configurar, desplegar y mantener la plataforma en sus entornos de desarrollo, pruebas y producción sobre infraestructura en la nube de alta disponibilidad.", "color": "333333"}
    ], space_after=80))

    elements.append(make_p(style="Ttulo2", runs=[
        {"text": "1.1. Topología de Despliegue en Producción", "bold": True, "color": "1F4E79", "size": 24}
    ], space_after=80))

    elements.append(make_p(style="Normal", runs=[
        {"text": "Atlas FSM opera bajo una arquitectura distribuida desacoplada, aprovechando servicios gestionados serverless para garantizar elasticidad, seguridad y continuidad operativa frente a variaciones de carga en servicios de telecomunicaciones:", "color": "333333"}
    ], space_after=80))

    infra_headers = ["Capa de Infraestructura", "Proveedor / Plataforma", "Especificaciones y Tier", "Función en la Solución"]
    infra_rows = [
        ["Capa de Aplicación (Backend)", "Render Web Services", "Instancia Linux, Python 3.12.8, Uvicorn ASGI Worker, Auto-restart", "Aloja la API RESTful FastAPI en el dominio seguro https://api.atlasfsm.cl."],
        ["Capa de Presentación (Frontend)", "Vercel Edge Network", "Global Edge CDN, compresión Brotli/Gzip, HTTPS/TLS 1.3 automático", "Sirve la SPA React Vite y distribuye la PWA móvil en https://www.atlasfsm.cl."],
        ["Capa de Persistencia (Base de Datos)", "Neon Serverless PostgreSQL 16", "PostgreSQL 16, PgBouncer Connection Pooling (5432), Autoscaling 0.25-2 CU", "Almacena el modelo relacional inmutable de 11 tablas, trazabilidad y control de inventario."],
        ["Capa de Almacenamiento Multimedia", "Amazon AWS S3 / Neon Blob", "Bucket cifrado AES-256, políticas IAM de mínimo privilegio, URLs prefirmadas", "Custodia fotos de evidencias de terreno y firmas digitales vectoriales."],
        ["Gestión DNS y Seguridad Perimetral", "Cloudflare DNS & WAF", "Protección Anti-DDoS, SSL/TLS Full Strict, DNS Anycast", "Enrutamiento perimetral y mitigación de amenazas sobre dominios atlasfsm.cl."]
    ]
    elements.append(make_table(infra_headers, infra_rows, [2000, 2000, 2442, 2400]))
    elements.append(make_p(style="Normal", runs=[], space_after=140))

    # SECCIÓN 2: INSTALACIÓN Y CONFIGURACIÓN
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "2. Instalación y Configuración del Entorno", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    elements.append(make_p(style="Ttulo2", runs=[
        {"text": "2.1. Prerrequisitos de Software en el Servidor / Estación de Trabajo", "bold": True, "color": "1F4E79", "size": 24}
    ], space_after=80))

    prereq_headers = ["Software / Herramienta", "Versión Requerida", "Comando de Verificación", "Propósito"]
    prereq_rows = [
        ["Python Runtime", "3.12.8 (Estricta)", "python --version", "Ejecución del motor FastAPI y herramientas de migración Alembic."],
        ["Node.js & npm", "Node v20.x LTS / npm 10+", "node -v && npm -v", "Compilación de paquetes frontend, transpilación JSX y build Vite."],
        ["Git SCM", "2.40+ o superior", "git --version", "Control de versiones, clonación de repositorios y despliegue CI/CD."],
        ["PostgreSQL Client", "PostgreSQL 16 Client Tools", "psql --version", "Ejecución de scripts de semillado (seed.sql) y diagnósticos CLI."]
    ]
    elements.append(make_table(prereq_headers, prereq_rows, [1800, 1800, 2400, 2842]))
    elements.append(make_p(style="Normal", runs=[], space_after=100))

    elements.append(make_p(style="Ttulo2", runs=[
        {"text": "2.2. Procedimiento de Clonación y Configuración Paso a Paso", "bold": True, "color": "1F4E79", "size": 24}
    ], space_after=80))

    elements.append(make_p(style="Normal", runs=[
        {"text": "Paso 1 (Clonación del Repositorio):\n", "bold": True, "color": "1F497D"},
        {"text": "$ git clone https://github.com/Entel-B2B/atlas-core.git\n$ cd atlas-core\n\n", "italic": True, "color": "0070C0"},
        {"text": "Paso 2 (Entorno Virtual Python e Instalación Backend):\n", "bold": True, "color": "1F497D"},
        {"text": "$ python -m venv venv\n$ source venv/bin/activate  # En Windows: .\\venv\\Scripts\\activate\n$ pip install --upgrade pip\n$ pip install -r backend/requirements.txt\n\n", "italic": True, "color": "0070C0"},
        {"text": "Paso 3 (Instalación de Módulos Frontend):\n", "bold": True, "color": "1F497D"},
        {"text": "$ cd frontend\n$ npm install\n$ npm run build  # Genera el bundle optimizado en /dist\n$ cd ..", "italic": True, "color": "0070C0"}
    ], space_after=140))

    # SECCIÓN 3: PARÁMETROS Y VARIABLES DE ENTORNO
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "3. Parámetros y Variables de Entorno (.env)", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    elements.append(make_p(style="Normal", runs=[
        {"text": "La configuración sensible se inyecta exclusivamente mediante variables de entorno de acuerdo con los principios de Twelve-Factor App. A continuación se detallan las variables obligatorias para producción:", "color": "333333"}
    ], space_after=80))

    env_headers = ["Variable de Entorno", "Tipo de Dato", "Ejemplo de Configuración / Formato", "Descripción y Uso"]
    env_rows = [
        ["DATABASE_URL", "String (URI)", "postgresql://user:pass@ep-xyz-pooler.neon.tech/atlas_db?sslmode=require", "Conexión agrupada mediante PgBouncer para transacciones concurrentes de la API."],
        ["DATABASE_URL_UNPOOLED", "String (URI)", "postgresql://user:pass@ep-xyz.neon.tech/atlas_db?sslmode=require", "Conexión directa requerida por Alembic para sentencias DDL y migraciones."],
        ["SECRET_KEY", "String (Hex 64)", "a4b7f92e8c1d3... (generada vía openssl rand -hex 32)", "Clave secreta para la firma y verificación de tokens criptográficos JWT."],
        ["ALGORITHM", "String", "HS256", "Algoritmo criptográfico de firma de autenticación."],
        ["ACCESS_TOKEN_EXPIRE_MINUTES", "Integer", "480", "Tiempo de vigencia de la sesión operativa (8 horas estándar por turno laboral)."],
        ["CORS_ORIGINS", "String (CSV)", "https://www.atlasfsm.cl,https://atlasfsm.cl", "Orígenes web autorizados para interactuar con la API RESTful."],
        ["AWS_S3_BUCKET_NAME", "String", "atlas-evidencias-prod", "Nombre del bucket S3 destinado a fotografías de visitas técnicas."],
        ["ENVIRONMENT", "String", "production", "Entorno de ejecución ('development', 'staging' o 'production')."]
    ]
    elements.append(make_table(env_headers, env_rows, [2200, 1400, 2800, 2442]))
    elements.append(make_p(style="Normal", runs=[], space_after=140))

    # SECCIÓN 4: DEPENDENCIAS DEL SISTEMA
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "4. Dependencias del Sistema y Compatibilidad de Librerías", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    dep_headers = ["Ecosistema", "Librería / Módulo", "Versión Fijada", "Justificación Técnica"]
    dep_rows = [
        ["Backend", "fastapi", "0.115.5", "Framework asíncrono ASGI de alto rendimiento con validación OpenAPI."],
        ["Backend", "sqlalchemy", "2.0.36", "ORM relacional tipado con soporte asíncrono y mapeo imperativo."],
        ["Backend", "alembic", "1.14.0", "Motor de control de versiones y migraciones de esquema PostgreSQL."],
        ["Backend", "pydantic", "2.10.1", "Validación estricta de esquemas de datos y serialización de peticiones."],
        ["Backend", "bcrypt & passlib", "4.0.1 / 1.7.4", "Criptografía y hashing seguro de contraseñas con salt dinámico."],
        ["Frontend", "react & react-dom", "18.3.1", "Librería base para componentes de interfaz reactivos y Virtual DOM."],
        ["Frontend", "leaflet & react-leaflet", "1.9.4 / 4.2.1", "Motor cartográfico interactivo para georreferenciación de cuadrillas."],
        ["Frontend", "tailwindcss", "3.4.14", "Framework utilitario para diseño responsivo y modo móvil PWA."]
    ]
    elements.append(make_table(dep_headers, dep_rows, [1400, 2200, 1600, 3642]))
    elements.append(make_p(style="Normal", runs=[], space_after=140))

    # SECCIÓN 5: PASOS DE DESPLIEGUE Y CI/CD
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "5. Pasos de Despliegue y Automatización (CI/CD)", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    elements.append(make_p(style="Normal", runs=[
        {"text": "El flujo de entrega continua está automatizado mediante GitHub Actions y Webhooks vinculados a las ramas protegidas de Git. Para ejecutar un despliegue controlado en producción, siga la secuencia operativa:", "color": "333333"}
    ], space_after=80))

    elements.append(make_p(style="Ttulo2", runs=[
        {"text": "5.1. Secuencia de Despliegue de Base de Datos y Backend", "bold": True, "color": "1F4E79", "size": 24}
    ], space_after=80))

    elements.append(make_p(style="Normal", runs=[
        {"text": "Paso 1 (Validación Previa): ", "bold": True, "color": "1F497D"},
        {"text": "Ejecutar la suite de pruebas unitarias y de regresión localmente: pytest backend/tests/ -v.\n", "color": "333333"},
        {"text": "Paso 2 (Aplicación de Migraciones DDL): ", "bold": True, "color": "1F497D"},
        {"text": "Aplicar las migraciones de base de datos apuntando al endpoint unpooled de Neon:\n", "color": "333333"},
        {"text": "$ export DATABASE_URL=$DATABASE_URL_UNPOOLED\n$ alembic upgrade head\n\n", "italic": True, "color": "0070C0"},
        {"text": "Paso 3 (Semillado de Datos si aplica): ", "bold": True, "color": "1F497D"},
        {"text": "En caso de un ambiente nuevo, sembrar los catálogos base con psql -d $DATABASE_URL -f Database/seed.sql.\n", "color": "333333"},
        {"text": "Paso 4 (Disparo de Build en Render): ", "bold": True, "color": "1F497D"},
        {"text": "Realizar merge hacia la rama main. El Webhook de Render detectará los cambios, levantará el contenedor Python 3.12 y ejecutará: pip install -r backend/requirements.txt && uvicorn backend.main:app --host 0.0.0.0 --port $PORT.", "color": "333333"}
    ], space_after=120))

    elements.append(make_p(style="Ttulo2", runs=[
        {"text": "5.2. Despliegue de Frontend y PWA en Vercel", "bold": True, "color": "1F4E79", "size": 24}
    ], space_after=80))

    elements.append(make_p(style="Normal", runs=[
        {"text": "Vercel compila automáticamente el frontend mediante el comando npm run build. La configuración de rutas SPA y reescritura hacia index.html se gestiona a través del archivo vercel.json en la raíz del proyecto, garantizando el funcionamiento fluido de React Router y la caché del Service Worker PWA.", "color": "333333"}
    ], space_after=140))

    # SECCIÓN 6: VERIFICACIÓN POST-IMPLEMENTACIÓN
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "6. Verificación Post-Implementación (Smoke Tests)", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    elements.append(make_p(style="Normal", runs=[
        {"text": "Finalizado el despliegue, el ingeniero de operaciones debe ejecutar la siguiente lista de verificación de humo (Smoke Tests) para certificar la estabilidad del servicio:", "color": "333333"}
    ], space_after=80))

    smoke_headers = ["Prueba de Verificación", "Endpoint / Recurso", "Respuesta Esperada", "Criterio de Éxito"]
    smoke_rows = [
        ["Healthcheck API", "GET https://api.atlasfsm.cl/health", "HTTP 200 {'status': 'healthy', 'db': 'connected'}", "Latencia < 150 ms, conexión Neon activa."],
        ["Carga Frontend SPA", "GET https://www.atlasfsm.cl/", "HTTP 200 con index.html y assets JS/CSS 200", "Interfaz de login renderizada sin errores en consola."],
        ["Autenticación JWT", "POST https://api.atlasfsm.cl/api/v1/auth/login", "HTTP 200 {'access_token': '...', 'token_type': 'bearer'}", "Generación correcta de token y redirección a /dispatch."],
        ["Consulta de Órdenes", "GET https://api.atlasfsm.cl/api/v1/orders/", "HTTP 200 con listado JSON paginado", "Respuesta serializada validada con esquema Pydantic."],
        ["Service Worker PWA", "Inspección Application -> Service Workers", "Status: Activated and is running", "Capacidad de almacenamiento en caché verificada."]
    ]
    elements.append(make_table(smoke_headers, smoke_rows, [1800, 2600, 2600, 1842]))
    elements.append(make_p(style="Normal", runs=[], space_after=140))

    # SECCIÓN 7: PLAN DE ROLLBACK
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "7. Plan de Rollback y Recuperación ante Desastres", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    elements.append(make_p(style="Normal", runs=[
        {"text": "Si durante o tras el despliegue se detecta una degradación del servicio o una falla crítica no mitigable en caliente, se activará de inmediato el protocolo de reversión estructurado:", "color": "333333"}
    ], space_after=80))

    rollback_headers = ["Componente Afectado", "Mecanismo de Rollback", "Comando / Procedimiento", "Tiempo Estimado (RTO)"]
    rollback_rows = [
        ["Frontend Vercel", "Instant Rollback de Despliegue", "Panel Vercel -> Deployments -> Seleccionar versión anterior -> Promote to Production.", "< 1 minuto"],
        ["Backend Render", "Rollback de Commit en Git", "git revert HEAD -m 1 && git push origin main. Render redepliega la imagen previa.", "2 a 3 minutos"],
        ["Esquema Base de Datos", "Downgrade de Migración Alembic", "$ export DATABASE_URL=$DATABASE_URL_UNPOOLED && alembic downgrade -1.", "< 2 minutos"],
        ["Corrupción de Datos DB", "Point-in-Time Recovery (PITR) Neon", "Panel Neon -> Branches -> Restaurar rama al timestamp anterior al incidente.", "< 5 minutos"]
    ]
    elements.append(make_table(rollback_headers, rollback_rows, [1800, 2400, 3142, 1500]))
    elements.append(make_p(style="Normal", runs=[], space_after=140))

def generate_md_doc5():
    md_content = """# 05. MANUAL DE IMPLEMENTACIÓN Y DESPLIEGUE
## Sistema de Gestión de Servicios de Campo (Atlas FSM)
### Entel B2B — Infraestructura, Configuración y DevOps

---

### Identificación del Documento y Equipo de Proyecto
* **Proyecto:** Atlas Field Service Management (FSM)
* **Entregable:** Documento 5 — Manual de Implementación y Despliegue
* **Versión:** 3.3 (Cierre Final Capstone Fase 2)
* **Fecha:** Noviembre 2026
* **Equipo de Desarrollo:**
  * Diego Bastián Jiménez Escobar (*Frontend & PWA*)
  * Joaquín Ignacio Mendoza Arias (*Backend & APIs*)
  * Alexander Andrés Sáez López (*Modelado & Gestión de Base de Datos e Infraestructura*)
  * Matías Ignacio Abarca Contreras (*App Técnica PWA / QA*)
* **Instancia de Evaluación:** Fase 2 Capstone | Docente Guía: Erwin Aguilera | Entorno: Entel B2B.

---

## 1. Requisitos de Infraestructura y Arquitectura Cloud
El presente **Manual de Implementación de Atlas FSM** detalla las directrices técnicas, dependencias, configuraciones y procedimientos requeridos para instalar, configurar, desplegar y mantener la plataforma en sus entornos de desarrollo, pruebas y producción sobre infraestructura en la nube de alta disponibilidad.

### 1.1. Topología de Despliegue en Producción

| Capa de Infraestructura | Proveedor / Plataforma | Especificaciones y Tier | Función en la Solución |
| :--- | :--- | :--- | :--- |
| **Capa de Aplicación (Backend)** | Render Web Services | Instancia Linux, Python 3.12.8, Uvicorn ASGI Worker, Auto-restart | Aloja la API RESTful FastAPI en el dominio seguro `https://api.atlasfsm.cl`. |
| **Capa de Presentación (Frontend)** | Vercel Edge Network | Global Edge CDN, compresión Brotli/Gzip, HTTPS/TLS 1.3 automático | Sirve la SPA React Vite y distribuye la PWA móvil en `https://www.atlasfsm.cl`. |
| **Capa de Persistencia (Base de Datos)** | Neon Serverless PostgreSQL 16 | PostgreSQL 16, PgBouncer Connection Pooling (5432), Autoscaling 0.25-2 CU | Almacena el modelo relacional inmutable de 11 tablas, trazabilidad y control de inventario. |
| **Capa de Almacenamiento Multimedia** | Amazon AWS S3 / Neon Blob | Bucket cifrado AES-256, políticas IAM de mínimo privilegio, URLs prefirmadas | Custodia fotos de evidencias de terreno y firmas digitales vectoriales. |
| **Gestión DNS y Seguridad Perimetral** | Cloudflare DNS & WAF | Protección Anti-DDoS, SSL/TLS Full Strict, DNS Anycast | Enrutamiento perimetral y mitigación de amenazas sobre dominios `atlasfsm.cl`. |

---

## 2. Instalación y Configuración del Entorno

### 2.1. Prerrequisitos de Software

| Software / Herramienta | Versión Requerida | Comando de Verificación | Propósito |
| :--- | :--- | :--- | :--- |
| **Python Runtime** | 3.12.8 (Estricta) | `python --version` | Ejecución del motor FastAPI y herramientas de migración Alembic. |
| **Node.js & npm** | Node v20.x LTS / npm 10+ | `node -v && npm -v` | Compilación de paquetes frontend, transpilación JSX y build Vite. |
| **Git SCM** | 2.40+ o superior | `git --version` | Control de versiones, clonación de repositorios y despliegue CI/CD. |
| **PostgreSQL Client** | PostgreSQL 16 Client Tools | `psql --version` | Ejecución de scripts de semillado (seed.sql) y diagnósticos CLI. |

### 2.2. Procedimiento de Clonación y Configuración Paso a Paso

```bash
# 1. Clonación del repositorio
git clone https://github.com/Entel-B2B/atlas-core.git
cd atlas-core

# 2. Configuración del entorno virtual Python
python -m venv venv
source venv/bin/activate  # En Windows: .\venv\Scripts\activate
pip install --upgrade pip
pip install -r backend/requirements.txt

# 3. Compilación de paquetes frontend
cd frontend
npm install
npm run build
cd ..
```

---

## 3. Parámetros y Variables de Entorno (.env)

| Variable de Entorno | Tipo de Dato | Ejemplo de Configuración / Formato | Descripción y Uso |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | String (URI) | `postgresql://user:pass@ep-xyz-pooler.neon.tech/atlas_db?sslmode=require` | Conexión agrupada mediante PgBouncer para transacciones concurrentes de la API. |
| `DATABASE_URL_UNPOOLED` | String (URI) | `postgresql://user:pass@ep-xyz.neon.tech/atlas_db?sslmode=require` | Conexión directa requerida por Alembic para sentencias DDL y migraciones. |
| `SECRET_KEY` | String (Hex 64) | `a4b7f92e8c1d3... (vía openssl rand -hex 32)` | Clave secreta para la firma y verificación de tokens criptográficos JWT. |
| `ALGORITHM` | String | `HS256` | Algoritmo criptográfico de firma de autenticación. |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| Integer | `480` | Tiempo de vigencia de la sesión operativa (8 horas estándar por turno laboral). |
| `CORS_ORIGINS` | String (CSV) | `https://www.atlasfsm.cl,https://atlasfsm.cl` | Orígenes web autorizados para interactuar con la API RESTful. |
| `AWS_S3_BUCKET_NAME` | String | `atlas-evidencias-prod` | Nombre del bucket S3 destinado a fotografías de visitas técnicas. |
| `ENVIRONMENT` | String | `production` | Entorno de ejecución ('development', 'staging' o 'production'). |

---

## 4. Dependencias del Sistema y Compatibilidad

| Ecosistema | Librería / Módulo | Versión Fijada | Justificación Técnica |
| :--- | :--- | :--- | :--- |
| **Backend** | `fastapi` | `0.115.5` | Framework asíncrono ASGI de alto rendimiento con validación OpenAPI. |
| **Backend** | `sqlalchemy` | `2.0.36` | ORM relacional tipado con soporte asíncrono y mapeo imperativo. |
| **Backend** | `alembic` | `1.14.0` | Motor de control de versiones y migraciones de esquema PostgreSQL. |
| **Backend** | `pydantic` | `2.10.1` | Validación estricta de esquemas de datos y serialización de peticiones. |
| **Backend** | `bcrypt & passlib` | `4.0.1 / 1.7.4` | Criptografía y hashing seguro de contraseñas con salt dinámico. |
| **Frontend** | `react & react-dom`| `18.3.1` | Librería base para componentes de interfaz reactivos y Virtual DOM. |
| **Frontend** | `leaflet & react-leaflet` | `1.9.4 / 4.2.1` | Motor cartográfico interactivo para georreferenciación de cuadrillas. |
| **Frontend** | `tailwindcss` | `3.4.14` | Framework utilitario para diseño responsivo y modo móvil PWA. |

---

## 5. Pasos de Despliegue y Automatización (CI/CD)

### 5.1. Secuencia de Despliegue de Base de Datos y Backend
1. **Validación Previa:** Ejecutar pruebas unitarias y de integración: `pytest backend/tests/ -v`.
2. **Aplicación de Migraciones DDL:** Aplicar migraciones hacia el endpoint unpooled:
   ```bash
   export DATABASE_URL=$DATABASE_URL_UNPOOLED
   alembic upgrade head
   ```
3. **Semillado Inicial:** En nuevos entornos, cargar catálogos con `psql -d $DATABASE_URL -f Database/seed.sql`.
4. **Disparo en Render:** Push a `main`. Render activa el webhook, compila el contenedor e inicia: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`.

---

## 6. Verificación Post-Implementación (Smoke Tests)

| Prueba de Verificación | Endpoint / Recurso | Respuesta Esperada | Criterio de Éxito |
| :--- | :--- | :--- | :--- |
| **Healthcheck API** | `GET https://api.atlasfsm.cl/health` | HTTP 200 `{'status': 'healthy', 'db': 'connected'}` | Latencia < 150 ms, conexión Neon activa. |
| **Carga Frontend SPA** | `GET https://www.atlasfsm.cl/` | HTTP 200 con index.html y assets JS/CSS 200 | Interfaz de login renderizada sin errores en consola. |
| **Autenticación JWT** | `POST https://api.atlasfsm.cl/api/v1/auth/login` | HTTP 200 `{'access_token': '...', 'token_type': 'bearer'}` | Generación correcta de token y redirección a `/dispatch`. |
| **Consulta de Órdenes** | `GET https://api.atlasfsm.cl/api/v1/orders/` | HTTP 200 con listado JSON paginado | Respuesta serializada validada con esquema Pydantic. |
| **Service Worker PWA** | `Application -> Service Workers` | Status: *Activated and is running* | Capacidad de almacenamiento en caché verificada. |

---

## 7. Plan de Rollback y Recuperación ante Desastres

| Componente Afectado | Mecanismo de Rollback | Comando / Procedimiento | Tiempo Estimado (RTO) |
| :--- | :--- | :--- | :--- |
| **Frontend Vercel** | Instant Rollback de Despliegue | Panel Vercel -> Deployments -> Seleccionar versión anterior -> *Promote to Production*. | < 1 minuto |
| **Backend Render** | Rollback de Commit en Git | `git revert HEAD -m 1 && git push origin main`. Render redepliega la imagen previa. | 2 a 3 minutos |
| **Esquema Base de Datos** | Downgrade de Migración Alembic | `export DATABASE_URL=$DATABASE_URL_UNPOOLED && alembic downgrade -1`. | < 2 minutos |
| **Corrupción de Datos DB** | Point-in-Time Recovery (PITR) Neon | Panel Neon -> Branches -> Restaurar rama al timestamp anterior al incidente. | < 5 minutos |
"""
    for dest_dir in DEST_DIRS:
        os.makedirs(dest_dir, exist_ok=True)
        md_path = os.path.join(dest_dir, "05_Manual_de_Implementacion_Atlas_FSM.md")
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(md_content.strip() + "\n")
        print(f"  📝 Markdown guardado: {md_path}")

def run_doc5():
    generate_md_doc5()
    compile_docx(
        doc_title_cover="Manual de Implementación",
        footer_text="05. Manual de Implementación",
        elements_generator_func=build_doc5_elements,
        output_filename="05_Manual_de_Implementacion_Atlas_FSM.docx"
    )

if __name__ == "__main__":
    run_doc5()
