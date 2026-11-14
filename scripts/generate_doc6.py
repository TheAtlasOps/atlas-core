#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador de Documento 6: Checklist de Término del Proyecto - Atlas FSM
Genera la versión Markdown (.md) y la versión Word (.docx) con formato Duoc UC.
"""

import os
import sys
from generate_docs_4_5_6 import (
    make_project_box, compile_docx, make_p, make_table,
    DEST_DIRS, ATLAS_CORE_DIR
)

def build_doc6_elements(elements):
    # Cuadro institucional superior
    elements.append(make_project_box("Checklist de Término del Proyecto", "DOC-06"))
    elements.append(make_p(style="Normal", runs=[], space_after=120))

    # SECCIÓN 1: RESUMEN EJECUTIVO
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "1. Resumen Ejecutivo y Declaración de Término", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    elements.append(make_p(style="Normal", runs=[
        {"text": "El presente ", "color": "333333"},
        {"text": "Checklist de Término del Proyecto Atlas FSM", "bold": True, "color": "1F4E79"},
        {"text": " formaliza la verificación integral de todas las actividades, entregables, matrices de calidad y requisitos técnicos comprometidos para el cierre oficial de la ", "color": "333333"},
        {"text": "Fase 2 de Proyecto Capstone (Duoc UC)", "bold": True, "color": "1F4E79"},
        {"text": ", certificando que el sistema se encuentra completamente implementado, probado, documentado y operativo en producción para ", "color": "333333"},
        {"text": "Entel B2B", "bold": True, "color": "1F4E79"},
        {"text": ".", "color": "333333"}
    ], space_after=80))

    kpi_headers = ["Dimensión de Control", "Meta Comprometida", "Resultado Logrado", "Estado Final"]
    kpi_rows = [
        ["Requerimientos Funcionales (RF)", "13 Requisitos (100%)", "13 Requisitos Implementados y Verificados", "CONFORME (100%)"],
        ["Requerimientos No Funcionales (RNF)", "8 Requisitos (100%)", "8 Requisitos Validados en Producción", "CONFORME (100%)"],
        ["Ciclos de Pruebas de Calidad", "3 Ciclos de Pruebas", "Ciclos 1, 2 y 3 Ejecutados con Éxito", "CONFORME (100%)"],
        ["Resolución de Defectos (Bugs)", "100% Defectos Resueltos", "37 de 37 Defectos Corregidos y Cerrados (0 Pendientes)", "CONFORME (100%)"],
        ["Entregables y Manuales", "6 Documentos Oficiales", "Doc 01 al Doc 06 Generados y Sincronizados", "CONFORME (100%)"],
        ["Disponibilidad de Producción", "URLs Activas y Certificadas", "https://www.atlasfsm.cl y https://api.atlasfsm.cl", "OPERATIVO (100%)"]
    ]
    elements.append(make_table(kpi_headers, kpi_rows, [2400, 2200, 3242, 1800]))
    elements.append(make_p(style="Normal", runs=[], space_after=140))

    # SECCIÓN 2: TODOS LOS REQUISITOS IMPLEMENTADOS
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "2. Matriz de Control: Todos los Requisitos Implementados", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    elements.append(make_p(style="Ttulo2", runs=[
        {"text": "2.1. Requerimientos Funcionales (RF-01 al RF-13)", "bold": True, "color": "1F4E79", "size": 24}
    ], space_after=80))

    rf_headers = ["ID", "Requerimiento Funcional", "Componente Asociado", "Estado", "Evidencia de Cumplimiento"]
    rf_rows = [
        ["RF-01", "Autenticación segura basada en tokens JWT", "Backend / Auth", "CUMPLIDO", "Endpoint POST /api/v1/auth/login y gestión auth_version."],
        ["RF-02", "Tablero Kanban de despacho en 5 columnas", "Frontend / Dispatch", "CUMPLIDO", "Tablero dinámico con soporte drag & drop responsivo."],
        ["RF-03", "Georreferenciación y mapa de rutas técnicas", "Frontend / Leaflet", "CUMPLIDO", "Mapa interactivo OpenStreetMap y cálculo de distancias."],
        ["RF-04", "Gestión integral de órdenes de trabajo (OT)", "Backend / Orders", "CUMPLIDO", "CRUD completo con validación estricta de estados y SLAs."],
        ["RF-05", "Custodia y asignación de hardware (Routers/SIM)", "Backend / Inventory", "CUMPLIDO", "Control de series/IMEIs y bloqueo de activos duplicados."],
        ["RF-06", "Aplicación móvil para técnicos en terreno (PWA)", "PWA / Mobile", "CUMPLIDO", "Soporte offline mediante Service Worker e IndexedDB."],
        ["RF-07", "Checklist técnico y protocolo de instalación", "PWA / Forms", "CUMPLIDO", "Formulario digital con validación de potencia óptica/4G."],
        ["RF-08", "Captura y compresión de fotos de evidencias", "PWA / Camera", "CUMPLIDO", "Subida multipart sanitizada y almacenamiento seguro en S3."],
        ["RF-09", "Firma digital manuscrita en pantalla táctil", "PWA / SignaturePad", "CUMPLIDO", "Captura vectorial acumulativa con coordenadas corregidas."],
        ["RF-10", "Portal de cliente sin autenticación previa", "Web / ClientPortal", "CUMPLIDO", "Consulta segura por Magic Link con token hash único."],
        ["RF-11", "Módulo de auditoría técnica y control de calidad", "Frontend / Audit", "CUMPLIDO", "Flujo de aprobación/rechazo con bloqueo FOR UPDATE."],
        ["RF-12", "Reportabilidad operativa y métricas KPI", "Frontend / Analytics", "CUMPLIDO", "Dashboard interactivo con gráficos Donut y barras."],
        ["RF-13", "Notificaciones y campana de alertas en tiempo real", "Frontend / Alerts", "CUMPLIDO", "Persistencia de lecturas en localStorage y feedback."]
    ]
    elements.append(make_table(rf_headers, rf_rows, [900, 3000, 2000, 1300, 2442]))
    elements.append(make_p(style="Normal", runs=[], space_after=120))

    elements.append(make_p(style="Ttulo2", runs=[
        {"text": "2.2. Requerimientos No Funcionales (RNF-01 al RNF-08)", "bold": True, "color": "1F4E79", "size": 24}
    ], space_after=80))

    rnf_headers = ["ID", "Requerimiento No Funcional", "Métrica / Parámetro", "Estado", "Verificación"]
    rnf_rows = [
        ["RNF-01", "Seguridad de Datos y Cifrado", "TLS 1.3 / Bcrypt salt / JWT HS256", "CUMPLIDO", "Certificado SSL A+ Cloudflare y contraseñas hasheadas."],
        ["RNF-02", "Disponibilidad del Servicio", "SLA >= 99.5% mensual", "CUMPLIDO", "Arquitectura serverless distribuida en Render y Neon."],
        ["RNF-03", "Tiempo de Respuesta de la API", "Latencia promedio < 200 ms", "CUMPLIDO", "Pool PgBouncer y consultas indexadas en PostgreSQL."],
        ["RNF-04", "Operación Móvil Fuera de Línea", "Modo Offline 100% funcional en PWA", "CUMPLIDO", "Sincronización diferida transparente tras desconexión."],
        ["RNF-05", "Escalabilidad Elástica", "Autoscaling de 0.25 a 2 Compute Units", "CUMPLIDO", "Neon Serverless escala recursos según demanda."],
        ["RNF-06", "Usabilidad y Diseño Mobile-First", "Puntuación Lighthouse >= 90 en Mobile", "CUMPLIDO", "Diseño adaptativo con Tailwind CSS y accesibilidad."],
        ["RNF-07", "Trazabilidad Inmutable", "Bitácora de auditoría histórica", "CUMPLIDO", "Tabla order_status_history con usuario y timestamp."],
        ["RNF-08", "Mantenibilidad y Código Limpio", "PEP8 en Backend y ESLint en Frontend", "CUMPLIDO", "Pruebas automatizadas y tipado estricto Pydantic/JSX."]
    ]
    elements.append(make_table(rnf_headers, rnf_rows, [1000, 2800, 2400, 1300, 2142]))
    elements.append(make_p(style="Normal", runs=[], space_after=140))

    # SECCIÓN 3: PRUEBAS COMPLETADAS Y DEFECTOS CERRADOS
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "3. Matriz de Control: Pruebas Completadas y Defectos Cerrados", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    tests_headers = ["Ciclo de Pruebas", "Enfoque de Aseguramiento", "Defectos Detectados", "Defectos Cerrados", "Tasa de Éxito"]
    tests_rows = [
        ["Ciclo 1: Estabilidad Base", "Autenticación, esquema SQL, seeds y carga inicial.", "11 Defectos (DEF-001 al DEF-011)", "11 Cerrados (0 Abiertos)", "100.0%"],
        ["Ciclo 2: Operaciones Terreno", "App móvil PWA, firma digital, fotos S3 y Magic Links.", "12 Defectos (DEF-012 al DEF-023)", "12 Cerrados (0 Abiertos)", "100.0%"],
        ["Ciclo 3: UX y Despacho", "Tablero Kanban, mapas Leaflet, reportes y accesibilidad.", "14 Defectos (DEF-024 al DEF-037)", "14 Cerrados (0 Abiertos)", "100.0%"],
        ["TOTAL CONSOLIDADO", "Ciclo Integral de Calidad Atlas FSM", "37 Defectos Totales", "37 Defectos Resueltos", "100.0%"]
    ]
    elements.append(make_table(tests_headers, tests_rows, [2200, 2600, 2200, 1800, 1400]))
    elements.append(make_p(style="Normal", runs=[], space_after=140))

    # SECCIÓN 4: MANUALES ENTREGADOS
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "4. Matriz de Control: Manuales y Entregables del Proyecto", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    docs_headers = ["Código", "Nombre del Entregable", "Formato", "Ubicación en Repositorio", "Estado"]
    docs_rows = [
        ["DOC-01", "Plan de Pruebas de Software", ".docx / .md", "docs/Fase 2 Capstone/Evidencia Proyecto/", "ENTREGADO"],
        ["DOC-02", "Especificación de Casos de Prueba", ".docx / .md", "docs/Fase 2 Capstone/Evidencia Proyecto/", "ENTREGADO"],
        ["DOC-03", "Registro de Defectos por Ciclos (37 Defectos)", ".docx / .md", "docs/Fase 2 Capstone/Evidencia Proyecto/", "ENTREGADO"],
        ["DOC-04", "Manual de Usuario Final", ".docx / .md", "docs/Fase 2 Capstone/Evidencia Proyecto/", "ENTREGADO"],
        ["DOC-05", "Manual de Implementación y Despliegue", ".docx / .md", "docs/Fase 2 Capstone/Evidencia Proyecto/", "ENTREGADO"],
        ["DOC-06", "Checklist de Término del Proyecto", ".docx / .md", "docs/Fase 2 Capstone/Evidencia Proyecto/", "ENTREGADO"],
        ["DOC-UML", "Diagramas de Arquitectura y UML (v3.3)", ".docx", "docs/Fase 2 Capstone/Evidencia Proyecto/", "ENTREGADO"],
        ["DOC-DER", "Modelo de Base de Datos y Diccionario (11 Tablas)", ".docx / .sql", "docs/Fase 2 Capstone/Evidencia Proyecto/", "ENTREGADO"]
    ]
    elements.append(make_table(docs_headers, docs_rows, [1100, 3200, 1300, 3042, 1200]))
    elements.append(make_p(style="Normal", runs=[], space_after=140))

    # SECCIÓN 5: DOCUMENTACIÓN Y REPOSITORIOS
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "5. Matriz de Control: Documentación y Repositorios Actualizados", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    repo_headers = ["Elemento de Control", "Criterio de Verificación", "Resultado", "Conformidad"]
    repo_rows = [
        ["Control de Versiones Git", "Ramas de trabajo integradas a main sin conflictos", "Merged en GitHub", "CONFORME"],
        ["Etiquetado de Versión", "Tag de release v3.3-final aplicado sobre el commit de cierre", "Tag v3.3 creado", "CONFORME"],
        ["Seguridad de Secretos", "Ningún archivo .env ni credenciales sensibles en commits", "Verificado con git-secrets", "CONFORME"],
        ["Sincronización Institucional", "Copia íntegra respaldada en OneDrive / Blackboard Duoc UC", "Archivos subidos", "CONFORME"]
    ]
    elements.append(make_table(repo_headers, repo_rows, [2200, 3200, 2442, 1800]))
    elements.append(make_p(style="Normal", runs=[], space_after=140))

    # SECCIÓN 6: ENTORNO DE PRODUCCIÓN
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "6. Matriz de Control: Entorno de Producción Operativo", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    prod_headers = ["Servicio / Entorno", "URL de Producción", "Estado Operativo", "Monitoreo"]
    prod_rows = [
        ["Aplicación Web & PWA", "https://www.atlasfsm.cl", "OPERATIVO (HTTP 200)", "Edge Vercel Analytics"],
        ["API RESTful Backend", "https://api.atlasfsm.cl", "OPERATIVO (HTTP 200 /health)", "Render Metrics & Logs"],
        ["Base de Datos Neon", "ep-weathered-glade-a4a5...neon.tech", "OPERATIVO (Conectado / Pool)", "Neon Console Metrics"],
        ["Zona DNS Cloudflare", "atlasfsm.cl (DNS Anycast)", "ACTIVO (SSL Full Strict)", "Cloudflare WAF Analytics"]
    ]
    elements.append(make_table(prod_headers, prod_rows, [2200, 3200, 2442, 1800]))
    elements.append(make_p(style="Normal", runs=[], space_after=140))

    # SECCIÓN 7: CAPACITACIÓN Y TRANSFERENCIA
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "7. Matriz de Control: Capacitación y Transferencia Operativa", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    train_headers = ["Población Objetivo", "Modalidad del Taller", "Contenidos Impartidos", "Estado"]
    train_rows = [
        ["Coordinadores de Despacho", "Sesión Remota Teams / Práctica", "Operación del tablero Kanban, balanceo de rutas y asignación de hardware.", "COMPLETADA"],
        ["Cuadrillas Técnicas de Terreno", "Taller Práctico Presencial / Móvil", "Uso de la PWA, modo offline, checklist, toma de fotos y firma táctil.", "COMPLETADA"],
        ["Supervisores de Calidad", "Sesión Técnica de Auditoría", "Criterios de inspección fotográfica, control de SLA y aprobación formal de OTs.", "COMPLETADA"]
    ]
    elements.append(make_table(train_headers, train_rows, [2200, 2400, 3642, 1400]))
    elements.append(make_p(style="Normal", runs=[], space_after=140))

    # SECCIÓN 8: VALIDACIÓN DEL CLIENTE
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "8. Validación y Aceptación Formal del Cliente / Docente Guía", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    elements.append(make_p(style="Normal", runs=[
        {"text": "Por medio del presente instrumento, se deja constancia de que los requerimientos comprometidos en la Ficha de Proyecto y en el Product Backlog han sido ejecutados conforme a los estándares de calidad institucional de Duoc UC y a las exigencias operativas del entorno Entel B2B. El docente guía y sponsor aprueba la recepción formal de los entregables y la solución tecnológica desarrollada.", "color": "333333"}
    ], space_after=100))

    sign_headers = ["Rol en el Proyecto", "Nombre y Apellidos", "Entidad / Cargo", "Firma / Dictamen"]
    sign_rows = [
        ["Docente Guía / Sponsor", "Erwin Aguilera", "Duoc UC / Patrocinador Proyecto Capstone", "APROBADO CONFORME"],
        ["Líder Técnico Frontend", "Diego Bastián Jiménez Escobar", "Equipo Atlas FSM (Duoc UC)", "CONFORME"],
        ["Líder Técnico Backend", "Joaquín Ignacio Mendoza Arias", "Equipo Atlas FSM (Duoc UC)", "CONFORME"],
        ["Líder Base de Datos e Infra", "Alexander Andrés Sáez López", "Equipo Atlas FSM (Duoc UC)", "CONFORME"],
        ["Líder PWA & Calidad QA", "Matías Ignacio Abarca Contreras", "Equipo Atlas FSM (Duoc UC)", "CONFORME"]
    ]
    elements.append(make_table(sign_headers, sign_rows, [2200, 2400, 3042, 2000]))
    elements.append(make_p(style="Normal", runs=[], space_after=140))

    # SECCIÓN 9: CIERRE ADMINISTRATIVO
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "9. Cierre Administrativo y Lecciones Aprendidas", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    elements.append(make_p(style="Normal", runs=[
        {"text": "1. ", "bold": True, "color": "1F497D"},
        {"text": "Gestión Serverless: ", "bold": True, "color": "1F4E79"},
        {"text": "La adopción de Neon PostgreSQL con branching y connection pooling demostró ser una ventaja competitiva crítica para evitar cuellos de botella en entornos multi-tenant.\n", "color": "333333"},
        {"text": "2. ", "bold": True, "color": "1F497D"},
        {"text": "Resiliencia Offline en Terreno: ", "bold": True, "color": "1F4E79"},
        {"text": "La incorporación temprana de Service Workers y almacenamiento local en la PWA resolvió de forma definitiva la pérdida de información en zonas con baja conectividad celular.\n", "color": "333333"},
        {"text": "3. ", "bold": True, "color": "1F497D"},
        {"text": "Aseguramiento de Calidad Riguroso: ", "bold": True, "color": "1F4E79"},
        {"text": "La ejecución estructurada de 3 ciclos de pruebas y el seguimiento riguroso de los 37 defectos reales permitieron alcanzar un software robusto con 0 incidencias abiertas en el hito de cierre final.", "color": "333333"}
    ], space_after=140))

def generate_md_doc6():
    md_content = """# 06. CHECKLIST DE TÉRMINO DEL PROYECTO
## Sistema de Gestión de Servicios de Campo (Atlas FSM)
### Entel B2B — Cierre Formal de Fase 2 Capstone

---

### Identificación del Documento y Equipo de Proyecto
* **Proyecto:** Atlas Field Service Management (FSM)
* **Entregable:** Documento 6 — Checklist de Término del Proyecto
* **Versión:** 3.3 (Cierre Final Capstone Fase 2)
* **Fecha:** Noviembre 2026
* **Equipo de Desarrollo:**
  * Diego Bastián Jiménez Escobar (*Frontend & PWA*)
  * Joaquín Ignacio Mendoza Arias (*Backend & APIs*)
  * Alexander Andrés Sáez López (*Modelado & Gestión de Base de Datos e Infraestructura*)
  * Matías Ignacio Abarca Contreras (*App Técnica PWA / QA*)
* **Instancia de Evaluación:** Fase 2 Capstone | Docente Guía: Erwin Aguilera | Entorno: Entel B2B.

---

## 1. Resumen Ejecutivo y Declaración de Término
El presente **Checklist de Término del Proyecto Atlas FSM** formaliza la verificación integral de todas las actividades, entregables, matrices de calidad y requisitos técnicos comprometidos para el cierre oficial de la **Fase 2 de Proyecto Capstone (Duoc UC)**, certificando que el sistema se encuentra completamente implementado, probado, documentado y operativo en producción para **Entel B2B**.

### Métricas Consolidadas de Cierre

| Dimensión de Control | Meta Comprometida | Resultado Logrado | Estado Final |
| :--- | :--- | :--- | :--- |
| **Requerimientos Funcionales (RF)** | 13 Requisitos (100%) | 13 Requisitos Implementados y Verificados | **CONFORME (100%)** |
| **Requerimientos No Funcionales (RNF)** | 8 Requisitos (100%) | 8 Requisitos Validados en Producción | **CONFORME (100%)** |
| **Ciclos de Pruebas de Calidad** | 3 Ciclos de Pruebas | Ciclos 1, 2 y 3 Ejecutados con Éxito | **CONFORME (100%)** |
| **Resolución de Defectos (Bugs)** | 100% Defectos Resueltos | 37 de 37 Defectos Corregidos y Cerrados (0 Pendientes) | **CONFORME (100%)** |
| **Entregables y Manuales** | 6 Documentos Oficiales | Doc 01 al Doc 06 Generados y Sincronizados | **CONFORME (100%)** |
| **Disponibilidad de Producción** | URLs Activas y Certificadas | `https://www.atlasfsm.cl` y `https://api.atlasfsm.cl` | **OPERATIVO (100%)** |

---

## 2. Matriz de Control: Todos los Requisitos Implementados

### 2.1. Requerimientos Funcionales (RF-01 al RF-13)

| ID | Requerimiento Funcional | Componente Asociado | Estado | Evidencia de Cumplimiento |
| :--- | :--- | :--- | :--- | :--- |
| **RF-01** | Autenticación segura basada en tokens JWT | Backend / Auth | **CUMPLIDO** | Endpoint POST `/api/v1/auth/login` y gestión `auth_version`. |
| **RF-02** | Tablero Kanban de despacho en 5 columnas | Frontend / Dispatch | **CUMPLIDO** | Tablero dinámico con soporte drag & drop responsivo. |
| **RF-03** | Georreferenciación y mapa de rutas técnicas | Frontend / Leaflet | **CUMPLIDO** | Mapa interactivo OpenStreetMap y cálculo de distancias. |
| **RF-04** | Gestión integral de órdenes de trabajo (OT) | Backend / Orders | **CUMPLIDO** | CRUD completo con validación estricta de estados y SLAs. |
| **RF-05** | Custodia y asignación de hardware (Routers/SIM) | Backend / Inventory | **CUMPLIDO** | Control de series/IMEIs y bloqueo de activos duplicados. |
| **RF-06** | Aplicación móvil para técnicos en terreno (PWA) | PWA / Mobile | **CUMPLIDO** | Soporte offline mediante Service Worker e IndexedDB. |
| **RF-07** | Checklist técnico y protocolo de instalación | PWA / Forms | **CUMPLIDO** | Formulario digital con validación de potencia óptica/4G. |
| **RF-08** | Captura y compresión de fotos de evidencias | PWA / Camera | **CUMPLIDO** | Subida multipart sanitizada y almacenamiento seguro en S3. |
| **RF-09** | Firma digital manuscrita en pantalla táctil | PWA / SignaturePad | **CUMPLIDO** | Captura vectorial acumulativa con coordenadas corregidas. |
| **RF-10** | Portal de cliente sin autenticación previa | Web / ClientPortal | **CUMPLIDO** | Consulta segura por Magic Link con token hash único. |
| **RF-11** | Módulo de auditoría técnica y control de calidad | Frontend / Audit | **CUMPLIDO** | Flujo de aprobación/rechazo con bloqueo FOR UPDATE. |
| **RF-12** | Reportabilidad operativa y métricas KPI | Frontend / Analytics | **CUMPLIDO** | Dashboard interactivo con gráficos Donut y barras. |
| **RF-13** | Notificaciones y campana de alertas en tiempo real | Frontend / Alerts | **CUMPLIDO** | Persistencia de lecturas en localStorage y feedback. |

### 2.2. Requerimientos No Funcionales (RNF-01 al RNF-08)

| ID | Requerimiento No Funcional | Métrica / Parámetro | Estado | Verificación |
| :--- | :--- | :--- | :--- | :--- |
| **RNF-01** | Seguridad de Datos y Cifrado | TLS 1.3 / Bcrypt salt / JWT HS256 | **CUMPLIDO** | Certificado SSL A+ Cloudflare y contraseñas hasheadas. |
| **RNF-02** | Disponibilidad del Servicio | SLA >= 99.5% mensual | **CUMPLIDO** | Arquitectura serverless distribuida en Render y Neon. |
| **RNF-03** | Tiempo de Respuesta de la API | Latencia promedio < 200 ms | **CUMPLIDO** | Pool PgBouncer y consultas indexadas en PostgreSQL. |
| **RNF-04** | Operación Móvil Fuera de Línea | Modo Offline 100% funcional en PWA | **CUMPLIDO** | Sincronización diferida transparente tras desconexión. |
| **RNF-05** | Escalabilidad Elástica | Autoscaling de 0.25 a 2 Compute Units | **CUMPLIDO** | Neon Serverless escala recursos según demanda. |
| **RNF-06** | Usabilidad y Diseño Mobile-First | Puntuación Lighthouse >= 90 en Mobile | **CUMPLIDO** | Diseño adaptativo con Tailwind CSS y accesibilidad. |
| **RNF-07** | Trazabilidad Inmutable | Bitácora de auditoría histórica | **CUMPLIDO** | Tabla `order_status_history` con usuario y timestamp. |
| **RNF-08** | Mantenibilidad y Código Limpio | PEP8 en Backend y ESLint en Frontend | **CUMPLIDO** | Pruebas automatizadas y tipado estricto Pydantic/JSX. |

---

## 3. Matriz de Control: Pruebas Completadas y Defectos Cerrados

| Ciclo de Pruebas | Enfoque de Aseguramiento | Defectos Detectados | Defectos Cerrados | Tasa de Éxito |
| :--- | :--- | :--- | :--- | :--- |
| **Ciclo 1: Estabilidad Base** | Autenticación, esquema SQL, seeds y carga inicial. | 11 Defectos (DEF-001 al DEF-011) | 11 Cerrados (0 Abiertos) | **100.0%** |
| **Ciclo 2: Operaciones Terreno** | App móvil PWA, firma digital, fotos S3 y Magic Links. | 12 Defectos (DEF-012 al DEF-023) | 12 Cerrados (0 Abiertos) | **100.0%** |
| **Ciclo 3: UX y Despacho** | Tablero Kanban, mapas Leaflet, reportes y accesibilidad. | 14 Defectos (DEF-024 al DEF-037) | 14 Cerrados (0 Abiertos) | **100.0%** |
| **TOTAL CONSOLIDADO** | **Ciclo Integral de Calidad Atlas FSM** | **37 Defectos Totales** | **37 Defectos Resueltos** | **100.0%** |

---

## 4. Matriz de Control: Manuales y Entregables del Proyecto

| Código | Nombre del Entregable | Formato | Ubicación en Repositorio | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **DOC-01** | Plan de Pruebas de Software | `.docx` / `.md` | `docs/Fase 2 Capstone/Evidencia Proyecto/` | **ENTREGADO** |
| **DOC-02** | Especificación de Casos de Prueba | `.docx` / `.md` | `docs/Fase 2 Capstone/Evidencia Proyecto/` | **ENTREGADO** |
| **DOC-03** | Registro de Defectos por Ciclos (37 Defectos) | `.docx` / `.md` | `docs/Fase 2 Capstone/Evidencia Proyecto/` | **ENTREGADO** |
| **DOC-04** | Manual de Usuario Final | `.docx` / `.md` | `docs/Fase 2 Capstone/Evidencia Proyecto/` | **ENTREGADO** |
| **DOC-05** | Manual de Implementación y Despliegue | `.docx` / `.md` | `docs/Fase 2 Capstone/Evidencia Proyecto/` | **ENTREGADO** |
| **DOC-06** | Checklist de Término del Proyecto | `.docx` / `.md` | `docs/Fase 2 Capstone/Evidencia Proyecto/` | **ENTREGADO** |
| **DOC-UML** | Diagramas de Arquitectura y UML (v3.3) | `.docx` | `docs/Fase 2 Capstone/Evidencia Proyecto/` | **ENTREGADO** |
| **DOC-DER** | Modelo de Base de Datos y Diccionario (11 Tablas) | `.docx` / `.sql` | `docs/Fase 2 Capstone/Evidencia Proyecto/` | **ENTREGADO** |

---

## 5. Matriz de Control: Documentación y Repositorios Actualizados

| Elemento de Control | Criterio de Verificación | Resultado | Conformidad |
| :--- | :--- | :--- | :--- |
| **Control de Versiones Git** | Ramas de trabajo integradas a main sin conflictos | Merged en GitHub | **CONFORME** |
| **Etiquetado de Versión** | Tag de release `v3.3-final` aplicado sobre el commit de cierre | Tag v3.3 creado | **CONFORME** |
| **Seguridad de Secretos** | Ningún archivo `.env` ni credenciales sensibles en commits | Verificado con `git-secrets` | **CONFORME** |
| **Sincronización Institucional** | Copia íntegra respaldada en OneDrive / Blackboard Duoc UC | Archivos subidos | **CONFORME** |

---

## 6. Matriz de Control: Entorno de Producción Operativo

| Servicio / Entorno | URL de Producción | Estado Operativo | Monitoreo |
| :--- | :--- | :--- | :--- |
| **Aplicación Web & PWA** | `https://www.atlasfsm.cl` | **OPERATIVO (HTTP 200)** | Edge Vercel Analytics |
| **API RESTful Backend** | `https://api.atlasfsm.cl` | **OPERATIVO (HTTP 200 /health)** | Render Metrics & Logs |
| **Base de Datos Neon** | `ep-weathered-glade-a4a5...neon.tech` | **OPERATIVO (Conectado / Pool)** | Neon Console Metrics |
| **Zona DNS Cloudflare** | `atlasfsm.cl` (DNS Anycast) | **ACTIVO (SSL Full Strict)** | Cloudflare WAF Analytics |

---

## 7. Matriz de Control: Capacitación y Transferencia Operativa

| Población Objetivo | Modalidad del Taller | Contenidos Impartidos | Estado |
| :--- | :--- | :--- | :--- |
| **Coordinadores de Despacho** | Sesión Remota Teams / Práctica | Operación del tablero Kanban, balanceo de rutas y asignación de hardware. | **COMPLETADA** |
| **Cuadrillas Técnicas de Terreno** | Taller Práctico Presencial / Móvil | Uso de la PWA, modo offline, checklist, toma de fotos y firma táctil. | **COMPLETADA** |
| **Supervisores de Calidad** | Sesión Técnica de Auditoría | Criterios de inspección fotográfica, control de SLA y aprobación formal de OTs. | **COMPLETADA** |

---

## 8. Validación y Aceptación Formal del Cliente / Docente Guía

Por medio del presente instrumento, se deja constancia de que los requerimientos comprometidos en la Ficha de Proyecto y en el Product Backlog han sido ejecutados conforme a los estándares de calidad institucional de Duoc UC y a las exigencias operativas del entorno Entel B2B. El docente guía y sponsor aprueba la recepción formal de los entregables y la solución tecnológica desarrollada.

| Rol en el Proyecto | Nombre y Apellidos | Entidad / Cargo | Firma / Dictamen |
| :--- | :--- | :--- | :--- |
| **Docente Guía / Sponsor** | Erwin Aguilera | Duoc UC / Patrocinador Proyecto Capstone | **APROBADO CONFORME** |
| **Líder Técnico Frontend** | Diego Bastián Jiménez Escobar | Equipo Atlas FSM (Duoc UC) | **CONFORME** |
| **Líder Técnico Backend** | Joaquín Ignacio Mendoza Arias | Equipo Atlas FSM (Duoc UC) | **CONFORME** |
| **Líder Base de Datos e Infra** | Alexander Andrés Sáez López | Equipo Atlas FSM (Duoc UC) | **CONFORME** |
| **Líder PWA & Calidad QA** | Matías Ignacio Abarca Contreras | Equipo Atlas FSM (Duoc UC) | **CONFORME** |

---

## 9. Cierre Administrativo y Lecciones Aprendidas
1. **Gestión Serverless:** La adopción de Neon PostgreSQL con branching y connection pooling demostró ser una ventaja competitiva crítica para evitar cuellos de botella en entornos multi-tenant.
2. **Resiliencia Offline en Terreno:** La incorporación temprana de Service Workers y almacenamiento local en la PWA resolvió de forma definitiva la pérdida de información en zonas con baja conectividad celular.
3. **Aseguramiento de Calidad Riguroso:** La ejecución estructurada de 3 ciclos de pruebas y el seguimiento riguroso de los 37 defectos reales permitieron alcanzar un software robusto con 0 incidencias abiertas en el hito de cierre final.
"""
    for dest_dir in DEST_DIRS:
        os.makedirs(dest_dir, exist_ok=True)
        md_path = os.path.join(dest_dir, "06_Checklist_de_Termino_del_Proyecto_Atlas_FSM.md")
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(md_content.strip() + "\n")
        print(f"  📝 Markdown guardado: {md_path}")

def run_doc6():
    generate_md_doc6()
    compile_docx(
        doc_title_cover="Checklist de Término",
        footer_text="06. Checklist de Término",
        elements_generator_func=build_doc6_elements,
        output_filename="06_Checklist_de_Termino_del_Proyecto_Atlas_FSM.docx"
    )

if __name__ == "__main__":
    run_doc6()
