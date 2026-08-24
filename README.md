# 🌍 Atlas - Field Service Management (FSM)

**Atlas** es una plataforma integral de gestión de servicios en terreno diseñada específicamente para optimizar las operaciones de conectividad, instalación y mantenimiento de dispositivos IoT y routers con SIM cards. 

Proyecto desarrollado para Entel como parte de la asignatura Portafolio de Título.

---

## 🎯 La Problemática
Las empresas proveedoras de equipamiento de conectividad dependen de visitas técnicas constantes. Actualmente, la asignación de estas visitas se realiza mediante canales manuales (correos y llamadas telefónicas). Esto genera:
- Sobrecarga administrativa para los coordinadores.
- Falta de información consolidada y rutas poco optimizadas para los técnicos.
- Nula visibilidad y fricción en la experiencia del cliente final.

## 💡 La Solución
Atlas digitaliza y automatiza el flujo completo de atención en terreno a través de tres interfaces interconectadas:

1. **Panel Web Administrativo:** Dashboard para coordinadores que permite la asignación rápida de tickets, visualización del estado de los técnicos y gestión del inventario de hardware (SIMs/Routers).
2. **Portal Web de Autoservicio (Clientes):** Acceso seguro mediante **Magic Links** (enlaces únicos con tokens persistentes). Permite al cliente confirmar su visita, hacer seguimiento en tiempo real y firmar conformidad sin necesidad de crear contraseñas.
3. **Aplicación Móvil (Técnicos):** Herramienta en terreno con soporte offline, checklists técnicos especializados (diagnóstico dBm, validación IMSI/ICCID) y captura de evidencia fotográfica.

---

## 🛠️ Stack Tecnológico y Arquitectura

### Frontend
- **Panel Web & Portal Cliente:** React + Tailwind CSS
- **App Móvil:** React (PWA / Progressive Web App)

### Backend & Datos
- **API REST:** FastAPI (Python)
- **Base de Datos:** PostgreSQL / MySQL
- **Almacenamiento (Evidencias):** Google Cloud Storage

### Infraestructura & Integraciones
- **Despliegue Web:** Vercel (CI/CD)
- **Correos Transaccionales (Magic Links):** Resend / SendGrid
- **Control de Versiones:** Git / GitHub

---

## 👥 Equipo de Desarrollo

- **Diego Jiménez:** Frontend Web, Cloud e Infraestructura CI/CD.
- **Joaquín Mendoza:** Backend, APIs y Automatización de Correos.
- **Alexander Sáez:** Modelado y Gestión de Base de Datos.
- **Matías Abarca:** Desarrollo de Aplicación Móvil (PWA).
