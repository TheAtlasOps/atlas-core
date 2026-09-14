# ⚙️ Pipelines de CI/CD para Base de Datos (Database as Code)

**Proyecto:** Atlas - Field Service Management (FSM)  
**Herramienta de Automatización:** GitHub Actions  
**Entorno Cloud:** Neon Serverless PostgreSQL  
**Autor:** Alexander Sáez López  

---

## 1. Arquitectura de Despliegue Multi-Ambiente

Para cumplir con los estándares de la industria y la separación estricta de ambientes (**Principio de Mínimo Privilegio y Seguridad de Datos**), la gestión de base de datos de Atlas se desacopló en **dos pipelines independientes**:

```
[Repositorio GitHub: TheAtlasOps/atlas-core]
   │
   ├── Push a rama 'base-datos' / 'dev' ──> [Workflow: database-dev.yml]
   │                                                │
   │                                                ▼ (Aplica schema.sql + seed.sql)
   │                                        [Neon Branch: dev (Mock Data)]
   │
   └── Merge PR a rama 'main' ────────────> [Workflow: database-prod.yml]
                                                    │
                                                    ▼ (Aplica ÚNICAMENTE schema.sql)
                                            [Neon Branch: production (Limpia)]
```

---

## 2. Comparativa de Pipelines

| Característica | Pipeline de Desarrollo (`database-dev.yml`) | Pipeline de Producción (`database-prod.yml`) |
| :--- | :--- | :--- |
| **Ramas disparadoras** | `base-datos`, `dev` | `main` |
| **Filtro de rutas (`paths`)** | `Database/**` | `Database/**` |
| **Disparo manual** | Sí (`workflow_dispatch`) | Sí (`workflow_dispatch`) |
| **Secreto utilizado** | `DATABASE_URL_DEV` | `DATABASE_URL_PROD` |
| **Rama de Neon destino** | `dev` | `production` |
| **Ejecuta `schema.sql`** |  Sí (Crea tablas y tipos) |  Sí (Crea tablas y tipos) |
| **Ejecuta `seed.sql`** |  **Sí** (Inyecta datos de prueba) | ❌ **No** (Regla de seguridad: omitido) |
| **Smoke Test** | Verifica conteo con datos semilla | Verifica creación limpia de tablas |

---

## 3. Configuración de Secretos en GitHub

En la sección **Settings > Secrets and variables > Actions** del repositorio deben existir las siguientes variables encriptadas:

* **`DATABASE_URL_DEV`**:  
  Cadena de conexión con SSL hacia la rama `dev` de Neon.  
  Formato: `postgresql://neondb_owner:pass@ep-cool-dev.us-east-2.aws.neon.tech/atlas_fsm?sslmode=require`
* **`DATABASE_URL_PROD`**:  
  Cadena de conexión con SSL hacia la rama `production` de Neon.  
  Formato: `postgresql://neondb_owner:pass@ep-cool-prod.us-east-2.aws.neon.tech/atlas_fsm?sslmode=require`

---

## 4. Estructura y Funcionamiento del Script del Pipeline

El pipeline utiliza un paso automatizado en **Python 3.11** con el controlador oficial `psycopg2-binary`:

```python
# Extracto lógico del ejecutor en GitHub Actions:
conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

# 1. Aplicar estructura DDL
with open("Database/schema.sql", "r", encoding="utf-8") as f:
    cur.execute(f.read())

# 2. Inyectar datos semilla SOLO si es desarrollo
if not is_production:
    with open("Database/seed.sql", "r", encoding="utf-8") as f:
        cur.execute(f.read())
else:
    print("Regla de Seguridad: En producción se omite seed.sql.")

# 3. Smoke test y resumen en Markdown
summary_file = os.environ.get('GITHUB_STEP_SUMMARY')
# Genera tabla visual de verificación en la página de resumen del workflow
```

---

## 5. Instrucciones para Ejecución Manual

Si necesitas forzar la sincronización de la base de datos sin hacer un commit:
1. Ingresa a la pestaña **Actions** en GitHub.
2. Selecciona **`Database Deploy - Development`** (o `Production`).
3. Haz clic en el botón desplegable **`Run workflow`**.
4. Selecciona la rama correspondiente y confirma. En ~20 segundos verás el log en verde (`✅`).
