# 🔌 Guía de Integración para Backend (FastAPI / Python)

**Destinatario:** Joaquín Mendoza (Líder Backend) / Equipo de Desarrollo  
**Módulo:** Conexión con PostgreSQL Serverless  
**Autor:** Alexander Sáez López  

---

## 1. Instalación de Dependencias

Para interactuar de forma asíncrona y eficiente con Neon PostgreSQL en FastAPI, se recomienda el stack:

```bash
pip install fastapi uvicorn "sqlalchemy>=2.0" asyncpg pydantic-settings
```

---

## 2. Variables de Entorno (`.env`)

Copiar el archivo de plantilla ubicado en `Database/.env.example` a la raíz del backend como `.env`:

```env
# Conexión asíncrona para FastAPI (usando driver asyncpg)
DATABASE_URL=postgresql+asyncpg://<USUARIO>:<PASSWORD>@<HOST>/atlas_fsm?sslmode=require

# Conexión sincrónica para migraciones manuales o scripts
DATABASE_SYNC_URL=postgresql://<USUARIO>:<PASSWORD>@<HOST>/atlas_fsm?sslmode=require
```

---

## 3. Código de Inicialización del Motor de Base de Datos (`database.py`)

A continuación se entrega el boilerplate optimizado para Neon Serverless (con manejo de reconexión y pool adaptativo):

```python
# backend/src/database.py
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

DATABASE_URL = os.environ.get("DATABASE_URL")

# Engine asincrono con SSL requerido para Neon
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True, # Verifica que la conexion siga viva antes de reusar
    connect_args={"ssl": True}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

# Dependencia para inyeccion en rutas de FastAPI
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

---

## 4. Ejemplo de Endpoint en FastAPI (`main.py`)

Endpoint de prueba para consultar las órdenes activas del Dispatch Board:

```python
# backend/src/main.py
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from .database import get_db

app = FastAPI(title="Atlas FSM API")

@app.get("/api/v1/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT 1;"))
    return {"status": "ok", "db_connected": result.scalar() == 1}

@app.get("/api/v1/work-orders")
async def list_work_orders(db: AsyncSession = Depends(get_db)):
    query = text("""
        SELECT 
            wo.id, wo.order_number, wo.title, wo.status, wo.priority,
            c.business_name AS client_name, c.address, c.comuna,
            t.initials AS technician_initials
        FROM work_orders wo
        JOIN clients c ON wo.client_id = c.id
        LEFT JOIN technicians t ON wo.technician_id = t.id
        ORDER BY wo.scheduled_date ASC;
    """)
    result = await db.execute(query)
    rows = result.mappings().all()
    return {"total": len(rows), "orders": rows}
```
