# 📚 Documentación Técnica de Base de Datos - Atlas FSM

Bienvenido al centro de documentación técnica para el módulo de datos de la plataforma **Atlas - Field Service Management**.

---

## 📑 Guías Disponibles

1. **[01. Arquitectura y Modelado DER](01_ARQUITECTURA_Y_MODELADO_DER.md)**
   * Diagrama Entidad-Relación interactivo en Mermaid.
   * Justificación técnica: Normalización 3FN, UUIDs y modo offline para técnicos en terreno.
   * Diccionario de datos completo (10 tablas, atributos, llaves primarias/foráneas y restricciones).
2. **[02. Pipelines de CI/CD y Automatización](02_PIPELINES_CI_CD_Y_AUTOMATIZACION.md)**
   * Explicación de los flujos de trabajo `database-dev.yml` y `database-prod.yml`.
   * Matriz de ambientes (Dev vs Prod) y políticas de datos semilla.
   * Guía de gestión de secretos en GitHub Actions.
3. **[03. Guía de Integración para Backend (FastAPI)](03_GUIA_INTEGRACION_FASTAPI.md)**
   * Boilerplate asíncrono con SQLAlchemy y `asyncpg`.
   * Configuración de variables de entorno `.env`.
   * Ejemplos de consultas SQL y endpoints de prueba.
4. **[04. Manual Operativo de Neon Serverless](04_MANUAL_OPERATIVO_NEON.md)**
   * Arquitectura Serverless, auto-scaling y Database Branching (`dev` vs `production`).
   * Procedimiento para crear ramas temporales de prueba.

---

## 📂 Archivos Fuente Relacionados
* **DDL de Creación:** [`Database/schema.sql`](../../Database/schema.sql)
* **Datos Semilla:** [`Database/seed.sql`](../../Database/seed.sql)
* **Plantilla de Entorno:** [`Database/.env.example`](../../Database/.env.example)
* **Pipelines GitHub Actions:** [`.github/workflows/`](../../.github/workflows/)
