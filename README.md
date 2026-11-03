# 🌍 ATLAS – Field Service Management (FSM)

Plataforma integral de gestión y trazabilidad de servicios técnicos en terreno, orientada a optimizar las operaciones de instalación, conectividad y mantenimiento de routers industriales IoT y tarjetas SIM para **Entel**.

Proyecto desarrollado como parte de la asignatura Portafolio de Título (Duoc UC / Entel).

🌐 **Plataforma Web Oficial:** [https://www.atlasfsm.cl](https://www.atlasfsm.cl)

---

## 📌 Estado del Proyecto

* **Versión:** `v0.3.0 – Plataforma FSM Integrada`
* **Fase:** MVP funcional en etapa de validación operativa.
* **Alcance comprobado:** Ciclo completo de atención verificado en producción conectando Panel Web, ATLAS Mobile (Android vía Expo Go), Backend FastAPI en Render, persistencia en Neon PostgreSQL / Object Storage y Portal Cliente con firma digital de conformidad.

---

## 🎯 La Problemática

Las empresas de telecomunicaciones y conectividad dependen de visitas técnicas continuas para garantizar la operatividad de enlaces celulares en clientes corporativos. Tradicionalmente, la coordinación y rendición de estos servicios presenta:
* Sobrecarga administrativa derivada de asignaciones manuales por correo y llamadas.
* Dispersión de información técnica en terreno (modelos de router, números de serie, ICCID/IMSI y diagnósticos de señal).
* Falta de trazabilidad en las evidencias fotográficas y mediciones registradas.
* Nula visibilidad del cliente receptor sobre la llegada del técnico y actas de recepción en papel propensas a extravío.

---

## 💡 La Solución ATLAS

ATLAS centraliza y digitaliza el ciclo de vida del servicio técnico mediante tres interfaces interconectadas:

1. **Panel Web Administrativo:** Dashboard de control operativo para coordinadores y supervisores de despacho. Permite la creación y asignación de órdenes de trabajo, seguimiento de estados del servicio, gestión de inventario de hardware (routers y SIMs) y auditoría técnica detallada con visor de evidencias.
2. **ATLAS Mobile (Técnicos en Terreno):** Aplicación móvil para técnicos que guía la ejecución del servicio mediante un flujo guiado: inicio de atención, checklist técnico de instalación, registro de diagnóstico de señal RF (dBm), captura de fotografías previas y posteriores con subida directa a almacenamiento en la nube y finalización del servicio.
3. **Portal Web de Autoservicio (Clientes):** Acceso seguro para el cliente receptor mediante **Magic Links** dinámicos (tokens criptográficos de un solo uso sin necesidad de usuario ni contraseña). Permite verificar la identidad del técnico asignado, consultar la hora real de término del servicio y suscribir el acta de conformidad con firma manuscrita digitalizada.

---

## 🔄 Flujo Operativo Integral

El sistema opera bajo un flujo continuo y verificable de siete etapas:

```
Coordinación ➔ Ejecución Mobile ➔ Evidencias ➔ Finalización ➔ Magic Link ➔ Firma Digital ➔ Auditoría Web
```

1. **Coordinación:** El supervisor crea la orden de trabajo (OT) en el Panel Web, vincula el equipamiento (router y SIM) y asigna un técnico calificado.
2. **Ejecución Mobile:** El técnico recibe la OT en ATLAS Mobile, revisa los datos de contacto y transiciona la orden al estado `EN_SITIO` al llegar al cliente.
3. **Evidencias:** En terreno se ejecuta el checklist técnico, se ingresa la medición de señal RF (dBm) y se capturan las fotografías obligatorias (`FOTO_ANTES` y `FOTO_DESPUES`).
4. **Finalización:** El técnico concluye la atención en ATLAS Mobile; el sistema registra la hora de término real (`completed_at`) y pasa la orden a estado `COMPLETADA`.
5. **Magic Link:** El cliente receptor recibe su enlace de autoservicio para revisar el detalle de la intervención sin requerir credenciales de acceso.
6. **Firma Digital:** El cliente ingresa su nombre y plasma su rúbrica en pantalla mediante el lienzo digital (`SignaturePad`), registrándose como evidencia `FIRMA_CLIENTE`.
7. **Auditoría Web:** El coordinador visualiza en el Panel Web el acta firmada, las evidencias fotográficas y la telemetría, completando el cierre de la orden.

---

## ✨ Funcionalidades Principales

* **Gestión de Órdenes de Trabajo:** Ciclo de vida estricto basado en máquina de estados FSM (`CONFIRMADA`, `EN_RUTA`, `EN_SITIO`, `COMPLETADA`, `CANCELADA`).
* **Dashboard y Seguimiento de Estados:** Vista unificada de órdenes activas, disponibilidad de técnicos y métricas operativas clave.
* **Inventario de Hardware (Routers y SIMs):** Registro y vinculación de routers (marca, modelo, IMEI, número de serie, MAC opcional) y tarjetas SIM (ICCID, operador, IMSI, estado de activación).
* **Checklist y Diagnósticos Técnicos:** Protocolos estandarizados en terreno y registro de potencia de radiofrecuencia en dBm.
* **Evidencias Fotográficas Sanitizadas:** Inspección binaria de encabezados (magic bytes) y almacenamiento seguro en bucket privado en la nube.
* **Firma Digital del Cliente:** Captura de firma manuscrita sobre canvas HTML5 con soporte táctil y mouse, con registro inmutable del receptor y marca temporal.
* **Historial y Trazabilidad:** Bitácora inmutable de cambios de estado con autor, timestamp UTC y notas técnicas asociadas.
* **Seguridad y Control de Acceso:** Autenticación JWT con control de acceso basado en roles (RBAC) para usuarios internos, tokens efímeros para restablecimiento de contraseña y Magic Links criptográficos para clientes.

---

## 🛠️ Stack Tecnológico e Infraestructura

| Capa | Tecnologías | Plataforma / Proveedor |
| :--- | :--- | :--- |
| **Frontend Web** | React 19, Vite, Tailwind CSS 4, React Router, Lucide Icons | Vercel (CI/CD) |
| **Aplicación Móvil** | React Native, Expo, TypeScript, Expo FileSystem | Expo Go (Android) |
| **Backend & API** | Python 3.12, FastAPI, Pydantic 2, SQLAlchemy 2 (Async) | Render (Web Service) |
| **Base de Datos** | PostgreSQL Serverless, Alembic (Migraciones) | Neon |
| **Almacenamiento** | Object Storage (Bucket privado S3-compatible) | Neon Object Storage |
| **Correos Transaccionales** | API REST de mensajería (Magic Links y Recuperación) | SendGrid |
| **Dominio & DNS** | Gestión DNS, Proxy y Certificados SSL automáticos | Cloudflare (`atlasfsm.cl`) |
| **Control de Versiones** | Git, GitHub, Git Feature Branch Workflow | GitHub (`TheAtlasOps/atlas-core`) |

---

## 👥 Equipo de Desarrollo

* **Diego Jiménez:** Frontend Web, Cloud e Infraestructura CI/CD.
* **Joaquín Mendoza:** Backend, APIs y Automatización de Correos.
* **Alexander Sáez:** Modelado y Gestión de Base de Datos.
* **Matías Abarca:** Desarrollo de Aplicación Móvil.
