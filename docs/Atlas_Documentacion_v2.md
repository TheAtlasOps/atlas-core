# 🌍 Documentación Técnica - Proyecto Atlas
## Plataforma AIOps & CRM

* **Institución:** Instituto Profesional Duoc UC – Sede San Joaquín
* **Carrera:** Ingeniería en Informática
* **Instancia:** Proyecto Capstone (Octavo Semestre)
* **Equipo Desarrollador:** Diego Bastián Jiménez Escobar, Alexander Andrés Sáez López, Joaquín Ignacio Mendoza Arias

---

## 1. Justificación Técnica del Stack

### 🔹 Arquitectura de Backend e Inteligencia Artificial
* **Tecnologías:** Python + FastAPI
* **Justificación:** Se selecciona Python como lenguaje principal del servidor por su madurez y ecosistema nativo en el procesamiento de lenguaje natural (NLP) y la integración de modelos de IA (Gemini). FastAPI proporciona un entorno de desarrollo de alto rendimiento, moderno y asíncrono, ideal para gestionar peticiones pesadas y concurrentes sin bloquear el sistema.

### 🔹 Arquitectura de Frontend e Interfaz de Usuario
* **Tecnologías:** React.js + Tailwind CSS + v0.dev (Generación UI)
* **Justificación:** React se mantiene como el estándar de la industria para aplicaciones web reactivas tipo Single Page Application (SPA). Para maximizar la eficiencia y asegurar el cumplimiento de los plazos del proyecto, se utiliza v0.dev asistido por IA para la maquetación inicial de las vistas, permitiendo al equipo concentrar las horas de desarrollo en la lógica de negocio, control de estados y enrutamiento de datos.

### 🔹 Módulo de Visualización de Infraestructura
* **Tecnología:** React Flow
* **Justificación:** Desarrollar un lienzo interactivo desde cero excede el alcance de un semestre académico. Se integra la librería especializada React Flow, la cual resuelve de manera nativa la renderización, conexión y físicas de arrastre de nodos, garantizando un mapa topológico totalmente funcional.

### 🔹 Base de Datos y Alojamiento (Viabilidad Económica)
* **Tecnologías:** PostgreSQL 15+ Serverless (vía Neon.tech / Supabase)
* **Justificación:** La plataforma requiere relacionar entidades complejas (clientes, proyectos, tareas, servidores, inventario SIM y órdenes de trabajo), haciendo imperativa una base relacional robusta para la integridad y consistencia de datos (ACID). El despliegue para la evaluación ante la comisión se realiza utilizando los planes gratuitos en la nube, asegurando un costo operativo de $0 USD con alta disponibilidad.

---

## 2. Alcance del MVP (Producto Mínimo Viable)

### 📦 Módulo Core (Seguridad y Base de Datos)
* **INCLUYE:** Login/Registro y Gestión de Perfiles.
* **INCLUYE:** CRUD (Crear, Leer, Actualizar, Borrar) de Clientes (Empresas), Proyectos y Órdenes de Trabajo.
* **EXCLUYE:** Roles y permisos de usuario excesivamente granulares (ej. permisos dinámicos a nivel de celda).

### 📋 Módulo de Gestión de Tareas (Kanban / Dispatch Board)
* **INCLUYE:** Tablero visual Kanban dentro de cada proyecto con columnas de estado (`IDLE`, `CONFIRMADA`, `EN_RUTA`, `EN_SITIO`, `COMPLETADA`).
* **INCLUYE:** Creación, edición, filtrado y asignación de tareas a responsables técnicos.
* **EXCLUYE:** Subtareas anidadas infinitas, sistema de chat dentro de tarjetas o adjuntos pesados sin compresión.

### 🗺️ Módulo de Visualización de Infraestructura y Despacho
* **INCLUYE:** Lienzo interactivo (React Flow) para mapear topología de red y mapa georreferenciado con marcadores en Santiago (Leaflet).
* **EXCLUYE:** Importación automática de infraestructuras complejas desde nubes externas mediante agentes daemon en tiempo real.

### 🤖 Módulo de Inteligencia de Reuniones y Asistente (IA)
* **INCLUYE:** Campo de ingreso de minutas y notas de reuniones técnicas.
* **INCLUYE:** Integración con API de Google Gemini para resumir automáticamente y sugerir desgloses de tareas accionables.
* **EXCLUYE:** Chatbot conversacional generalista o búsquedas profundas globales en todo internet.

---

## 3. Arquitectura y Convenciones Frontend

Basado en el progreso del proyecto, se establecen las siguientes decisiones arquitectónicas definitivas para el cliente web:

* **Enrutamiento Global:** Implementado mediante `react-router-dom` (Single Page Application), asegurando transiciones instantáneas de vistas (Dashboard, Kanban, Settings, SIM Inventory) sin recarga del DOM.
* **Estructura de Componentes:** Adopción del patrón de Layout Modular. Los elementos globales estáticos residen aislados en `src/components/layout/` (Sidebar, Header, KpiGrid).
* **Gestión de Estado Base:** Manejo de interactividad de UI (Modales, Dropdowns) resuelto mediante Hooks locales (`useState`, `useMemo`).
* **Flujo de Datos:** Aislamiento estricto entre UI y Datos. Uso inicial de Mock Data inyectada vía props, facilitando la transición transparente hacia consumo asíncrono (Fetch / Axios) con los endpoints de FastAPI y PostgreSQL en Neon.
