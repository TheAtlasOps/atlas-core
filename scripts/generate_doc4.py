#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador de Documento 4: Manual de Usuario Final - Atlas FSM
Genera la versión Markdown (.md) y la versión Word (.docx) con formato Duoc UC.
"""

import os
import sys
from generate_docs_4_5_6 import (
    make_project_box, compile_docx, make_p, make_table,
    DEST_DIRS, ATLAS_CORE_DIR
)

def build_doc4_elements(elements):
    # Cuadro institucional superior
    elements.append(make_project_box("Manual de Usuario Final", "DOC-04"))
    elements.append(make_p(style="Normal", runs=[], space_after=120))

    # SECCIÓN 1: INTRODUCCIÓN
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "1. Introducción y Propósito del Manual", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    elements.append(make_p(style="Normal", runs=[
        {"text": "El presente ", "color": "333333"},
        {"text": "Manual de Usuario Final de Atlas FSM", "bold": True, "color": "1F4E79"},
        {"text": " tiene como propósito guiar a los distintos actores operativos en el uso correcto, seguro y autónomo de la plataforma de gestión de servicios de campo (Field Service Management), desarrollada para optimizar los procesos de instalación, mantenimiento y retiro de servicios de conectividad corporativa en el ecosistema ", "color": "333333"},
        {"text": "Entel B2B", "bold": True, "color": "1F4E79"},
        {"text": ".", "color": "333333"}
    ], space_after=80))

    elements.append(make_p(style="Ttulo2", runs=[
        {"text": "1.1. Alcance de la Plataforma Atlas FSM", "bold": True, "color": "1F4E79", "size": 24}
    ], space_after=80))

    elements.append(make_p(style="Normal", runs=[
        {"text": "Atlas FSM centraliza el ciclo de vida completo de las órdenes de trabajo técnicas mediante una arquitectura web responsiva y una aplicación web progresiva (PWA) para dispositivos móviles con capacidad de funcionamiento offline. La solución conecta a coordinadores de despacho, cuadrillas técnicas en terreno, supervisores de aseguramiento de calidad y clientes corporativos a través de enlaces seguros de seguimiento.", "color": "333333"}
    ], space_after=100))

    elements.append(make_p(style="Ttulo2", runs=[
        {"text": "1.2. Perfiles de Usuario y Matriz de Roles", "bold": True, "color": "1F4E79", "size": 24}
    ], space_after=80))

    roles_headers = ["Rol Operativo", "Identificador", "Alcance y Responsabilidades Principales", "Dispositivo de Acceso"]
    roles_rows = [
        ["Administrador del Sistema", "ADMIN", "Gestión global de usuarios, configuración del sistema, auditoría de logs y parametrización de catálogos maestros.", "PC de Escritorio / Notebook"],
        ["Despachador / Coordinador", "DISPATCHER", "Planificación de visitas, asignación de cuadrillas técnicas, monitoreo geográfico de rutas y balanceo de carga operativa en el tablero Kanban.", "PC de Escritorio / Monitor Doble"],
        ["Técnico en Terreno", "TECHNICIAN", "Recepción de órdenes asignadas, reporte de estados en ruta y en sitio, checklist técnico, captura de evidencias fotográficas y toma de firma digital del cliente.", "Smartphone / Tablet PWA"],
        ["Supervisor de Calidad", "SUPERVISOR", "Revisión técnica de evidencias fotográficas, auditoría de firmas digitales, aprobación o rechazo con notas de control de calidad.", "PC de Escritorio / Tablet"],
        ["Cliente Corporativo", "CLIENT", "Seguimiento en tiempo real de la llegada del técnico mediante Magic Link de consulta pública sin credenciales previas.", "Smartphone / Navegador Web"]
    ]
    elements.append(make_table(roles_headers, roles_rows, [2000, 1400, 3942, 1800]))
    elements.append(make_p(style="Normal", runs=[], space_after=140))

    # SECCIÓN 2: REQUISITOS DEL SISTEMA
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "2. Requisitos del Sistema y Compatibilidad", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    elements.append(make_p(style="Normal", runs=[
        {"text": "Para asegurar una experiencia óptima y sin interrupciones, los dispositivos que accedan a la plataforma deben cumplir con los siguientes requerimientos técnicos mínimos y recomendados:", "color": "333333"}
    ], space_after=80))

    req_headers = ["Componente", "Requisitos Mínimos", "Requisitos Recomendados", "Observaciones"]
    req_rows = [
        ["Navegador Web (PC)", "Google Chrome 110+, Microsoft Edge 110+, Mozilla Firefox 115+", "Google Chrome última versión estable con aceleración por hardware", "Requerido para el renderizado fluido de mapas vectoriales Leaflet."],
        ["Dispositivo Móvil (PWA)", "Android 10.0+ o iOS 15.0+ con navegador Safari / Chrome", "Android 12+ con 4 GB RAM, pantalla táctil capacitiva y cámara 12 MP", "Imprescindible permiso de geolocalización (GPS) y cámara web."],
        ["Conectividad de Red", "Conexión 3G estable (mínimo 512 kbps)", "Conectividad 4G LTE / 5G / Wi-Fi corporativo de alta velocidad", "La PWA almacena órdenes localmente y sincroniza al recuperar cobertura."],
        ["Resolución de Pantalla", "1366 x 768 píxeles (PC Despacho) / 360 x 640 (Móvil)", "1920 x 1080 píxeles (Full HD) o superior para despachadores", "El panel Kanban se adapta dinámicamente mediante CSS Grid responsivo."]
    ]
    elements.append(make_table(req_headers, req_rows, [1800, 2400, 2600, 2342]))
    elements.append(make_p(style="Normal", runs=[], space_after=140))

    # SECCIÓN 3: ACCESO Y SEGURIDAD
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "3. Acceso al Sistema y Gestión de Seguridad", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    elements.append(make_p(style="Ttulo2", runs=[
        {"text": "3.1. Inicio de Sesión y Autenticación", "bold": True, "color": "1F4E79", "size": 24}
    ], space_after=80))

    elements.append(make_p(style="Normal", runs=[
        {"text": "1. Ingrese a la dirección oficial del portal corporativo: ", "color": "333333"},
        {"text": "https://www.atlasfsm.cl", "bold": True, "color": "0070C0"},
        {"text": ".\n2. Ingrese su correo institucional (ejemplo: ", "color": "333333"},
        {"text": "usuario@entelb2b.cl", "italic": True, "color": "555555"},
        {"text": ") y su contraseña asignada.\n3. Presione el botón 'Iniciar Sesión'. Al autenticarse correctamente, el backend emitirá un token criptográfico JWT firmado (HS256) que gestionará su identidad de manera segura.", "color": "333333"}
    ], space_after=100))

    elements.append(make_p(style="Ttulo2", runs=[
        {"text": "3.2. Recuperación Segura de Contraseña", "bold": True, "color": "1F4E79", "size": 24}
    ], space_after=80))

    elements.append(make_p(style="Normal", runs=[
        {"text": "En caso de olvido o bloqueo de credenciales, el usuario debe pulsar el enlace '¿Olvidó su contraseña?'. El sistema solicitará su correo registrado y generará un token criptográfico de un solo uso con una vigencia máxima estricta de 15 minutos (almacenado en la tabla password_reset_tokens). Una vez utilizado o transcurrido dicho plazo, el enlace quedará automáticamente invalidado por motivos de seguridad.", "color": "333333"}
    ], space_after=140))

    # SECCIÓN 4: DESCRIPCIÓN DE MÓDULOS
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "4. Descripción Detallada de Módulos y Funcionalidades", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    mod_headers = ["Módulo del Sistema", "Propósito Operativo", "Funcionalidades Clave Disponibles"]
    mod_rows = [
        ["Panel de Despacho (Kanban)", "Coordinación visual de todas las órdenes de trabajo activas.", "Visualización en 5 columnas de estado (Por coordinar, Asignada, En ruta, En sitio, Completada), arrastre rápido, filtrado por cliente corporativo, severidad y técnico asignado."],
        ["Mapa de Georreferenciación", "Supervisión geoespacial de clientes y técnicos en terreno.", "Capa interactiva OpenStreetMap con marcadores diferenciados por estado de visita, cálculo de distancias, visualización de rutas óptimas y geocodificación automática de direcciones."],
        ["Gestión de Órdenes (OT)", "Administración del ciclo de vida de la orden de trabajo.", "Formulario de ingreso de OTs, tipificación (Instalación, Mantenimiento, Retiro), asignación de fecha pactada, SLA comprometido y vinculación con contratos corporativos."],
        ["Control de Inventario", "Custodia y trazabilidad de hardware de red.", "Registro de routers industriales y tarjetas SIM, validación de números de serie / IMEI / ICCID, y prevención estricta de duplicidades o reasignaciones cruzadas."],
        ["App Móvil PWA Técnico", "Herramienta de campo para técnicos en terreno.", "Recepción de órdenes asignadas, cambio de estados con un toque, registro de tiempos de traslado, checklist técnico, carga de fotos con validación y firma táctil."],
        ["Portal Cliente (Magic Link)", "Visibilidad y transparencia hacia el cliente final.", "Acceso sin clave mediante enlace cifrado, seguimiento del estado de la visita, ventana horaria de atención y visualización de datos de la cuadrilla técnica."],
        ["Módulo de Auditoría", "Aseguramiento de calidad y control de conformidad.", "Inspección detallada de evidencias fotográficas, verificación de rúbricas del cliente, aprobación formal de cierre de OT o rechazo fundado con notas de retroalimentación."]
    ]
    elements.append(make_table(mod_headers, mod_rows, [2200, 2400, 4242]))
    elements.append(make_p(style="Normal", runs=[], space_after=140))

    # SECCIÓN 5: INSTRUCCIONES PASO A PASO
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "5. Instrucciones Operativas Paso a Paso", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    elements.append(make_p(style="Ttulo2", runs=[
        {"text": "5.1. Flujo A: Creación y Despacho de una Orden de Trabajo (Coordinador)", "bold": True, "color": "1F4E79", "size": 24}
    ], space_after=80))

    elements.append(make_p(style="Normal", runs=[
        {"text": "Paso 1: ", "bold": True, "color": "1F497D"},
        {"text": "Desde el menú lateral, seleccione 'Órdenes de Trabajo' y presione el botón '+ Nueva Orden'.\n", "color": "333333"},
        {"text": "Paso 2: ", "bold": True, "color": "1F497D"},
        {"text": "Seleccione el cliente corporativo (ej. BancoEstado, Codelco) y la sucursal de destino. La dirección y coordenadas GPS se precargarán automáticamente.\n", "color": "333333"},
        {"text": "Paso 3: ", "bold": True, "color": "1F497D"},
        {"text": "Defina el tipo de servicio (Instalación Router 4G/5G, Cambio de SIM, Mantenimiento Preventivo) y seleccione los activos de hardware requeridos desde el inventario disponible.\n", "color": "333333"},
        {"text": "Paso 4: ", "bold": True, "color": "1F497D"},
        {"text": "Asigne la cuadrilla técnica responsable y defina la fecha/hora comprometida de la visita. Presione 'Crear y Notificar'. La orden se ubicará en la columna 'Asignada'.", "color": "333333"}
    ], space_after=120))

    elements.append(make_p(style="Ttulo2", runs=[
        {"text": "5.2. Flujo B: Ejecución en Terreno y Toma de Evidencias (Técnico)", "bold": True, "color": "1F4E79", "size": 24}
    ], space_after=80))

    elements.append(make_p(style="Normal", runs=[
        {"text": "Paso 1 (Inicio de Traslado): ", "bold": True, "color": "1F497D"},
        {"text": "En la PWA móvil, presione 'Iniciar Ruta' en la orden correspondiente. El estado cambia a 'En ruta' y se activa el geoposicionamiento.\n", "color": "333333"},
        {"text": "Paso 2 (Llegada al Sitio): ", "bold": True, "color": "1F497D"},
        {"text": "Al presentarse en las instalaciones del cliente, presione 'Llegada al Sitio'. El estado pasa a 'En sitio', registrando la hora exacta para control de SLA.\n", "color": "333333"},
        {"text": "Paso 3 (Checklist Técnico): ", "bold": True, "color": "1F497D"},
        {"text": "Complete los campos del protocolo técnico (nivel de señal dBm, pruebas de ping y validación de enlace corporativo).\n", "color": "333333"},
        {"text": "Paso 4 (Captura Fotográfica): ", "bold": True, "color": "1F497D"},
        {"text": "Capture las 3 fotografías requeridas (gabinete de telecomunicaciones, rotulación de cableado y estado de LEDs del equipo).\n", "color": "333333"},
        {"text": "Paso 5 (Firma de Recepción): ", "bold": True, "color": "1F497D"},
        {"text": "Entregue el dispositivo al contacto en sucursal para que dibuje su firma digital en el panel táctil. Presione 'Finalizar Visita'. La orden cambia a 'Completada'.", "color": "333333"}
    ], space_after=120))

    elements.append(make_p(style="Ttulo2", runs=[
        {"text": "5.3. Flujo C: Auditoría y Cierre Formal (Supervisor)", "bold": True, "color": "1F4E79", "size": 24}
    ], space_after=80))

    elements.append(make_p(style="Normal", runs=[
        {"text": "Paso 1: ", "bold": True, "color": "1F497D"},
        {"text": "Acceda a la pestaña 'Auditoría y Calidad' donde listan las órdenes en estado 'Completada'.\n", "color": "333333"},
        {"text": "Paso 2: ", "bold": True, "color": "1F497D"},
        {"text": "Haga clic en la orden para inspeccionar las fotos en alta resolución, los parámetros de potencia óptica/celular y la firma digital.\n", "color": "333333"},
        {"text": "Paso 3: ", "bold": True, "color": "1F497D"},
        {"text": "Si todos los criterios son conformes, presione 'Aprobar Auditoría'. La orden pasa a estado 'Auditada' y se archiva formalmente en el histórico inmutable.", "color": "333333"}
    ], space_after=140))

    # SECCIÓN 6: PREGUNTAS FRECUENTES
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "6. Preguntas Frecuentes (FAQ) y Solución de Problemas", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    faq_headers = ["Pregunta o Incidencia", "Causa Potencial", "Solución Paso a Paso Recomendada"]
    faq_rows = [
        ["¿Qué hago si la pantalla de login muestra 'Token expirado'?", "La sesión ha cumplido el tiempo límite de inactividad por seguridad.", "Haga clic en 'Aceptar' y vuelva a ingresar sus credenciales para generar un nuevo token JWT válido."],
        ["¿Cómo opera la PWA si el técnico se encuentra en un subterráneo sin señal móvil?", "Falta temporal de cobertura de red 4G/5G en la zona de trabajo.", "La PWA almacena localmente los datos y fotos en el almacenamiento IndexedDB. Al salir a la superficie y recuperar señal, presione 'Sincronizar Pendientes'."],
        ["El sistema arroja error al intentar asignar un router o SIM a una orden.", "El activo ya está asociado a otra orden activa o en estado 'EN_TRANSITO'.", "Verifique el número de serie en el módulo de Inventario. Solo pueden asociarse activos que figuren en estado 'DISPONIBLE'."],
        ["Al tomar la firma digital, el trazo no se dibuja en la pantalla.", "Bloqueo de gestos táctiles por zoom involuntario del navegador móvil.", "Restablezca el zoom de la pantalla al 100% o presione el botón 'Limpiar Lienzo' antes de solicitar la firma al cliente."],
        ["El Magic Link del cliente indica 'Enlace expirado o no encontrado'.", "El enlace superó las 48 horas de vigencia o la orden ya fue cerrada.", "Desde el panel de despacho, el coordinador puede presionar 'Reenviar Magic Link' para despachar un nuevo SMS o correo al cliente."]
    ]
    elements.append(make_table(faq_headers, faq_rows, [2800, 2600, 3442]))
    elements.append(make_p(style="Normal", runs=[], space_after=140))

def generate_md_doc4():
    md_content = """# 04. MANUAL DE USUARIO FINAL
## Sistema de Gestión de Servicios de Campo (Atlas FSM)
### Entel B2B — Conectividad y Mantenimiento Corporativo

---

### Identificación del Documento y Equipo de Proyecto
* **Proyecto:** Atlas Field Service Management (FSM)
* **Entregable:** Documento 4 — Manual de Usuario Final
* **Versión:** 3.3 (Cierre Final Capstone Fase 2)
* **Fecha:** Noviembre 2026
* **Equipo de Desarrollo:**
  * Diego Bastián Jiménez Escobar (*Frontend & PWA*)
  * Joaquín Ignacio Mendoza Arias (*Backend & APIs*)
  * Alexander Andrés Sáez López (*Modelado & Gestión de Base de Datos e Infraestructura*)
  * Matías Ignacio Abarca Contreras (*App Técnica PWA / QA*)
* **Instancia de Evaluación:** Fase 2 Capstone | Docente Guía: Erwin Aguilera | Entorno: Entel B2B.

---

## 1. Introducción y Propósito del Manual
El presente **Manual de Usuario Final de Atlas FSM** tiene como propósito guiar a los distintos actores operativos en el uso correcto, seguro y autónomo de la plataforma de gestión de servicios de campo (Field Service Management), desarrollada para optimizar los procesos de instalación, mantenimiento y retiro de servicios de conectividad corporativa en el ecosistema **Entel B2B**.

### 1.1. Alcance de la Plataforma Atlas FSM
Atlas FSM centraliza el ciclo de vida completo de las órdenes de trabajo técnicas mediante una arquitectura web responsiva y una aplicación web progresiva (PWA) para dispositivos móviles con capacidad de funcionamiento offline. La solución conecta a coordinadores de despacho, cuadrillas técnicas en terreno, supervisores de aseguramiento de calidad y clientes corporativos a través de enlaces seguros de seguimiento.

### 1.2. Perfiles de Usuario y Matriz de Roles

| Rol Operativo | Identificador | Alcance y Responsabilidades Principales | Dispositivo de Acceso |
| :--- | :--- | :--- | :--- |
| **Administrador del Sistema** | `ADMIN` | Gestión global de usuarios, configuración del sistema, auditoría de logs y parametrización de catálogos maestros. | PC de Escritorio / Notebook |
| **Despachador / Coordinador** | `DISPATCHER` | Planificación de visitas, asignación de cuadrillas técnicas, monitoreo geográfico de rutas y balanceo de carga operativa en el tablero Kanban. | PC de Escritorio / Monitor Doble |
| **Técnico en Terreno** | `TECHNICIAN` | Recepción de órdenes asignadas, reporte de estados en ruta y en sitio, checklist técnico, captura de evidencias fotográficas y toma de firma digital del cliente. | Smartphone / Tablet PWA |
| **Supervisor de Calidad** | `SUPERVISOR` | Revisión técnica de evidencias fotográficas, auditoría de firmas digitales, aprobación o rechazo con notas de control de calidad. | PC de Escritorio / Tablet |
| **Cliente Corporativo** | `CLIENT` | Seguimiento en tiempo real de la llegada del técnico mediante Magic Link de consulta pública sin credenciales previas. | Smartphone / Navegador Web |

---

## 2. Requisitos del Sistema y Compatibilidad

| Componente | Requisitos Mínimos | Requisitos Recomendados | Observaciones |
| :--- | :--- | :--- | :--- |
| **Navegador Web (PC)** | Google Chrome 110+, Microsoft Edge 110+, Mozilla Firefox 115+ | Google Chrome última versión estable con aceleración por hardware | Requerido para el renderizado fluido de mapas vectoriales Leaflet. |
| **Dispositivo Móvil (PWA)** | Android 10.0+ o iOS 15.0+ con navegador Safari / Chrome | Android 12+ con 4 GB RAM, pantalla táctil capacitiva y cámara 12 MP | Imprescindible permiso de geolocalización (GPS) y cámara web. |
| **Conectividad de Red** | Conexión 3G estable (mínimo 512 kbps) | Conectividad 4G LTE / 5G / Wi-Fi corporativo de alta velocidad | La PWA almacena órdenes localmente y sincroniza al recuperar cobertura. |
| **Resolución de Pantalla** | 1366 x 768 píxeles (PC Despacho) / 360 x 640 (Móvil) | 1920 x 1080 píxeles (Full HD) o superior para despachadores | El panel Kanban se adapta dinámicamente mediante CSS Grid responsivo. |

---

## 3. Acceso al Sistema y Gestión de Seguridad

### 3.1. Inicio de Sesión y Autenticación
1. Ingrese a la dirección oficial del portal corporativo: **`https://www.atlasfsm.cl`**.
2. Ingrese su correo institucional (ejemplo: `usuario@entelb2b.cl`) y su contraseña asignada.
3. Presione el botón **Iniciar Sesión**. Al autenticarse correctamente, el backend emitirá un token criptográfico JWT firmado (`HS256`) que gestionará su identidad de manera segura.

### 3.2. Recuperación Segura de Contraseña
En caso de olvido o bloqueo de credenciales, el usuario debe pulsar el enlace *¿Olvidó su contraseña?*. El sistema solicitará su correo registrado y generará un token criptográfico de un solo uso con una vigencia máxima estricta de 15 minutos (almacenado en la tabla `password_reset_tokens`). Una vez utilizado o transcurrido dicho plazo, el enlace quedará automáticamente invalidado por motivos de seguridad.

---

## 4. Descripción Detallada de Módulos y Funcionalidades

| Módulo del Sistema | Propósito Operativo | Funcionalidades Clave Disponibles |
| :--- | :--- | :--- |
| **Panel de Despacho (Kanban)** | Coordinación visual de todas las órdenes de trabajo activas. | Visualización en 5 columnas de estado (Por coordinar, Asignada, En ruta, En sitio, Completada), arrastre rápido, filtrado por cliente corporativo, severidad y técnico asignado. |
| **Mapa de Georreferenciación** | Supervisión geoespacial de clientes y técnicos en terreno. | Capa interactiva OpenStreetMap con marcadores diferenciados por estado de visita, cálculo de distancias, visualización de rutas óptimas y geocodificación automática de direcciones. |
| **Gestión de Órdenes (OT)** | Administración del ciclo de vida de la orden de trabajo. | Formulario de ingreso de OTs, tipificación (Instalación, Mantenimiento, Retiro), asignación de fecha pactada, SLA comprometido y vinculación con contratos corporativos. |
| **Control de Inventario** | Custodia y trazabilidad de hardware de red. | Registro de routers industriales y tarjetas SIM, validación de números de serie / IMEI / ICCID, y prevención estricta de duplicidades o reasignaciones cruzadas. |
| **App Móvil PWA Técnico** | Herramienta de campo para técnicos en terreno. | Recepción de órdenes asignadas, cambio de estados con un toque, registro de tiempos de traslado, checklist técnico, carga de fotos con validación y firma táctil. |
| **Portal Cliente (Magic Link)** | Visibilidad y transparencia hacia el cliente final. | Acceso sin clave mediante enlace cifrado, seguimiento del estado de la visita, ventana horaria de atención y visualización de datos de la cuadrilla técnica. |
| **Módulo de Auditoría** | Aseguramiento de calidad y control de conformidad. | Inspección detallada de evidencias fotográficas, verificación de rúbricas del cliente, aprobación formal de cierre de OT o rechazo fundado con notas de retroalimentación. |

---

## 5. Instrucciones Operativas Paso a Paso

### 5.1. Flujo A: Creación y Despacho de una Orden de Trabajo (Coordinador)
1. **Acceso al Formulario:** Desde el menú lateral, seleccione *Órdenes de Trabajo* y presione el botón `+ Nueva Orden`.
2. **Selección del Cliente:** Elija el cliente corporativo (ej. BancoEstado, Codelco) y la sucursal de destino. La dirección y coordenadas GPS se precargarán automáticamente.
3. **Hardware Requerido:** Defina el tipo de servicio (Instalación Router 4G/5G, Cambio de SIM) y seleccione los activos requeridos desde el inventario disponible.
4. **Asignación y Publicación:** Asigne la cuadrilla técnica responsable y defina la fecha/hora comprometida de la visita. Presione `Crear y Notificar`. La orden se ubicará automáticamente en la columna *Asignada*.

### 5.2. Flujo B: Ejecución en Terreno y Toma de Evidencias (Técnico)
1. **Inicio de Traslado:** En la PWA móvil, presione `Iniciar Ruta` en la orden correspondiente. El estado cambia a *En ruta* y se activa el geoposicionamiento.
2. **Llegada al Sitio:** Al presentarse en las instalaciones del cliente, presione `Llegada al Sitio`. El estado pasa a *En sitio*, registrando la hora exacta para control de SLA.
3. **Checklist Técnico:** Complete los campos del protocolo técnico (nivel de señal dBm, pruebas de ping y validación de enlace corporativo).
4. **Captura Fotográfica:** Capture las 3 fotografías requeridas (gabinete de telecomunicaciones, rotulación de cableado y estado de LEDs del equipo).
5. **Firma de Recepción:** Entregue el dispositivo al contacto en sucursal para que dibuje su firma digital en el panel táctil. Presione `Finalizar Visita`. La orden cambia a *Completada*.

### 5.3. Flujo C: Auditoría y Cierre Formal (Supervisor)
1. **Revisión de Casos:** Acceda a la pestaña *Auditoría y Calidad* donde listan las órdenes en estado *Completada*.
2. **Control de Evidencias:** Haga clic en la orden para inspeccionar las fotos en alta resolución, los parámetros de potencia óptica/celular y la firma digital.
3. **Dictamen de Conformidad:** Si todos los criterios son conformes, presione `Aprobar Auditoría`. La orden pasa a estado *Auditada* y se archiva formalmente en el histórico inmutable.

---

## 6. Preguntas Frecuentes (FAQ) y Solución de Problemas

| Pregunta o Incidencia | Causa Potencial | Solución Paso a Paso Recomendada |
| :--- | :--- | :--- |
| **¿Qué hago si la pantalla de login muestra 'Token expirado'?** | La sesión ha cumplido el tiempo límite de inactividad por seguridad. | Haga clic en *Aceptar* y vuelva a ingresar sus credenciales para generar un nuevo token JWT válido. |
| **¿Cómo opera la PWA si el técnico se encuentra en un subterráneo sin señal móvil?** | Falta temporal de cobertura de red 4G/5G en la zona de trabajo. | La PWA almacena localmente los datos y fotos en IndexedDB. Al salir a la superficie y recuperar señal, presione *Sincronizar Pendientes*. |
| **El sistema arroja error al intentar asignar un router o SIM a una orden.** | El activo ya está asociado a otra orden activa o en estado `EN_TRANSITO`. | Verifique el número de serie en el módulo de Inventario. Solo pueden asociarse activos que figuren en estado `DISPONIBLE`. |
| **Al tomar la firma digital, el trazo no se dibuja en la pantalla.** | Bloqueo de gestos táctiles por zoom involuntario del navegador móvil. | Restablezca el zoom de la pantalla al 100% o presione el botón *Limpiar Lienzo* antes de solicitar la firma al cliente. |
| **El Magic Link del cliente indica 'Enlace expirado o no encontrado'.** | El enlace superó las 48 horas de vigencia o la orden ya fue cerrada. | Desde el panel de despacho, el coordinador puede presionar *Reenviar Magic Link* para despachar un nuevo SMS o correo al cliente. |
"""
    for dest_dir in DEST_DIRS:
        os.makedirs(dest_dir, exist_ok=True)
        md_path = os.path.join(dest_dir, "04_Manual_de_Usuario_Final_Atlas_FSM.md")
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(md_content.strip() + "\n")
        print(f"  📝 Markdown guardado: {md_path}")

def run_doc4():
    generate_md_doc4()
    compile_docx(
        doc_title_cover="Manual de Usuario Final",
        footer_text="04. Manual de Usuario Final",
        elements_generator_func=build_doc4_elements,
        output_filename="04_Manual_de_Usuario_Final_Atlas_FSM.docx"
    )

if __name__ == "__main__":
    run_doc4()
