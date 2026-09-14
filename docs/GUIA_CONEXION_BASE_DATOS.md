# 🔑 Guía de Conexión a la Base de Datos para el Equipo (Diego, Joaquín, Matías)

Esta guía explica paso a paso cómo cada integrante del equipo de **Atlas** puede conectarse a la base de datos PostgreSQL Serverless alojada en **Neon.tech**.

---

## 📌 Datos de Conexión para Desarrollo (`dev`)

Para trabajar localmente y realizar pruebas, deben conectarse a la rama **`dev`** (que contiene los datos semilla de prueba):

* **Motor:** PostgreSQL 15 / 16
* **Host:** *(Revisar en la consola de Neon en la rama `dev`)*
* **Puerto:** `5432`
* **Base de datos:** `atlas_fsm` (o `neondb`)
* **Usuario:** `neondb_owner`
* **SSL Mode:** `require` (Obligatorio en Neon)

---

## 💻 3 Métodos de Conexión Disponibles

### Método 1: Desde el Backend (FastAPI / Python) - Para Joaquín
En la raíz de la carpeta `backend/`, crea tu archivo `.env` basándote en `Database/.env.example`:

```env
DATABASE_URL=postgresql+asyncpg://neondb_owner:<PASSWORD>@<HOST_DEV>/atlas_fsm?sslmode=require
```
Con esta variable, SQLAlchemy y asyncpg se conectarán automáticamente en modo asíncrono con SSL.

---

### Método 2: Desde un Cliente Visual SQL (DBeaver, TablePlus, pgAdmin o VS Code)
Si prefieres ver y editar los datos desde una aplicación de escritorio:
1. Abre **DBeaver** (o la extensión *PostgreSQL* en VS Code).
2. Selecciona **Nueva Conexión > PostgreSQL**.
3. Cambia al modo **URL** (o *Connection string*).
4. Pega la cadena de conexión completa de `dev` (la que termina en `?sslmode=require`).
5. En la pestaña **SSL**, asegúrate de que esté marcado **SSL: Require**.
6. Clic en **Test Connection** y luego en **Finalizar**. ¡Listo! Verás el explorador de tablas.

---

### Método 3: Desde la Consola Web de Neon (Sin instalar nada)
Alexander puede invitarlos como colaboradores del proyecto en Neon:
1. Alexander ingresa a **Neon Console > Settings > Members**.
2. Envía una invitación a sus correos con acceso de desarrollador.
3. Aceptan la invitación con su cuenta de GitHub.
4. Podrán ver las tablas, métricas y el SQL Editor directamente en el navegador web.
