# ☁️ Manual Operativo de Neon Serverless PostgreSQL

**Proyecto:** Atlas - Field Service Management (FSM)  
**Proveedor Cloud:** Neon.tech (Infraestructura AWS Ohio - `us-east-2`)  
**Autor:** Alexander Sáez López  

---

## 1. Características Clave del Motor Serverless

* **Escalabilidad a Cero (Scale to Zero):** Cuando la plataforma no recibe tráfico (ej. noches o fines de semana), la instancia informática suspende su consumo para no gastar recursos. En la siguiente petición, reactiva en menos de **500 ms**.
* **Database Branching (Ramas de BD instantáneas):** Copias virtuales de bases de datos basadas en *Copy-on-Write* que se generan en 1 segundo sin duplicar espacio de almacenamiento físico.

---

## 2. Gestión de Ramas (Branches) en Atlas

En la consola de Neon (`console.neon.tech`), el proyecto `Atlas` cuenta con dos ramas activas:

1. **`production` (Rama Principal):**
   * Contiene la estructura DDL definitiva del sistema.
   * Conectada al secreto `DATABASE_URL_PROD` en GitHub Actions.
   * Recibe actualizaciones únicamente mediante el pipeline `database-prod.yml` tras aprobación de Pull Requests.
2. **`dev` (Rama de Desarrollo):**
   * Rama hija creada a partir de `production`.
   * Contiene los datos semilla (`seed.sql`) para pruebas de frontend y APIs.
   * Conectada al secreto `DATABASE_URL_DEV`.

---

## 3. Cómo Crear una Nueva Rama Temporal de Pruebas (Feature Branch)

Si un desarrollador necesita probar un cambio riesgoso en la base de datos sin afectar a sus compañeros:

1. Ingresar a **Neon Console > Project Atlas > Branches**.
2. Hacer clic en **`+ New branch`**.
3. Ingresar un nombre descriptivo: `feature-metricas-iot`.
4. En **Parent branch**, seleccionar `dev`.
5. En **Auto-delete**, seleccionar `After 7 days` (para limpieza automática).
6. Neon generará una cadena de conexión exclusiva para esa prueba.
