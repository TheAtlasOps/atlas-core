# 🗄️ Módulo de Base de Datos - Proyecto Atlas FSM

**Responsable:** Alexander Sáez López  
**Rama:** `base-datos`  
**Motor:** PostgreSQL 15+ (Serverless)  

Este directorio contiene la arquitectura y los scripts necesarios para provisionar y sembrar la base de datos relacional del proyecto **Atlas**.

---

## 📁 Archivos Incluidos

| Archivo | Descripción |
| :--- | :--- |
| **`schema.sql`** | Script DDL completo: creación de tipos enum, tablas relacionales con UUIDs, llaves foráneas, triggers para `updated_at` e índices de rendimiento. |
| **`seed.sql`** | Script con datos iniciales (mock data) coherente con las vistas de React del Frontend (`#OT-08491` a `#OT-08500`, técnicos Carlos Mendoza, clientes en Santiago, etc.). |
| **`DER_Diagrama.md`** | Especificación técnica del Modelo Entidad-Relación con diagrama renderizable en **Mermaid** y reglas de normalización. |
| **`.env.example`** | Plantilla de variables de entorno para que el backend FastAPI (Joaquín Mendoza) configure la conexión sin exponer credenciales. |

---

## 🚀 Instrucciones de Provisión en la Nube (Neon.tech / Supabase)

### Paso 1: Crear la Base de Datos Serverless
1. Ingresar a [Neon.tech](https://neon.tech) (o [Supabase.com](https://supabase.com)) y crear un proyecto gratuito llamado `atlas-fsm`.
2. Seleccionar la región más cercana (ej. `US East / Ohio` o `Sao Paulo`).
3. Copiar la **Connection String** que entrega la plataforma.

### Paso 2: Ejecutar el Esquema y Datos Semilla
Desde la consola SQL de la plataforma o mediante `psql`:

```bash
# 1. Crear el esquema
psql "<TU_CONNECTION_STRING>" -f schema.sql

# 2. Inyectar datos semilla
psql "<TU_CONNECTION_STRING>" -f seed.sql
```

### Paso 3: Integración con Backend FastAPI
1. Copiar el archivo `.env.example` como `.env` en la raíz del backend.
2. Reemplazar `DATABASE_URL` con las credenciales reales provistas por Neon.
