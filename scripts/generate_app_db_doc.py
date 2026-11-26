#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador de Documento: Conexión Aplicación / Base de Datos - Atlas FSM
Genera la versión Markdown (.md) y la versión Word (.docx) con formato institucional Duoc UC.
"""

import os
import sys
import shutil

# Añadir scripts al path para reutilizar los generadores existentes
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ATLAS_CORE_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, SCRIPT_DIR)

from generate_docs_4_5_6 import (
    make_project_box, compile_docx, make_p, make_table, make_cell,
    DEST_DIRS, ATLAS_CORE_DIR, TEMPLATE_PATH, W_NS, w_tag
)
import xml.etree.ElementTree as ET

def make_callout_box(title, text_lines, border_color="1F4E79", bg_color="F2F5F8"):
    tbl = ET.Element(w_tag("tbl"))
    tblPr = ET.SubElement(tbl, w_tag("tblPr"))
    tblW = ET.SubElement(tblPr, w_tag("tblW"))
    tblW.set(w_tag("w"), "9142")
    tblW.set(w_tag("type"), "dxa")
    jc = ET.SubElement(tblPr, w_tag("jc"))
    jc.set(w_tag("val"), "center")

    tblBorders = ET.SubElement(tblPr, w_tag("tblBorders"))
    left_b = ET.SubElement(tblBorders, w_tag("left"))
    left_b.set(w_tag("val"), "single")
    left_b.set(w_tag("sz"), "24")
    left_b.set(w_tag("space"), "0")
    left_b.set(w_tag("color"), border_color)

    for b_name in ("top", "bottom", "right", "insideH", "insideV"):
        b = ET.SubElement(tblBorders, w_tag(b_name))
        b.set(w_tag("val"), "none")

    tr = ET.SubElement(tbl, w_tag("tr"))
    tc = ET.SubElement(tr, w_tag("tc"))
    tcPr = ET.SubElement(tc, w_tag("tcPr"))
    tcW = ET.SubElement(tcPr, w_tag("tcW"))
    tcW.set(w_tag("w"), "9142")
    tcW.set(w_tag("type"), "dxa")

    shd = ET.SubElement(tcPr, w_tag("shd"))
    shd.set(w_tag("val"), "clear")
    shd.set(w_tag("color"), "auto")
    shd.set(w_tag("fill"), bg_color)

    tcMar = ET.SubElement(tcPr, w_tag("tcMar"))
    for m_name, m_val in (("top", "120"), ("left", "180"), ("bottom", "120"), ("right", "180")):
        m = ET.SubElement(tcMar, w_tag(m_name))
        m.set(w_tag("w"), m_val)
        m.set(w_tag("type"), "dxa")

    # Contenido
    p_title = make_p(style="Normal", runs=[{"text": title, "bold": True, "color": border_color, "size": 20}], space_after=60, is_table_cell=True)
    tc.append(p_title)

    for line in text_lines:
        p_line = make_p(style="Normal", runs=[{"text": line, "color": "333333", "size": 18}], space_after=40, is_table_cell=True)
        tc.append(p_line)

    return tbl

def make_image_placeholder_box(img_num, title, instructions, suggested_caption):
    tbl = ET.Element(w_tag("tbl"))
    tblPr = ET.SubElement(tbl, w_tag("tblPr"))
    tblW = ET.SubElement(tblPr, w_tag("tblW"))
    tblW.set(w_tag("w"), "9142")
    tblW.set(w_tag("type"), "dxa")
    jc = ET.SubElement(tblPr, w_tag("jc"))
    jc.set(w_tag("val"), "center")

    tblBorders = ET.SubElement(tblPr, w_tag("tblBorders"))
    for b_name in ("top", "left", "bottom", "right"):
        b = ET.SubElement(tblBorders, w_tag(b_name))
        b.set(w_tag("val"), "dashed")
        b.set(w_tag("sz"), "12")
        b.set(w_tag("space"), "0")
        b.set(w_tag("color"), "2E75B6")
    for b_name in ("insideH", "insideV"):
        b = ET.SubElement(tblBorders, w_tag(b_name))
        b.set(w_tag("val"), "none")

    tr = ET.SubElement(tbl, w_tag("tr"))
    tc = ET.SubElement(tr, w_tag("tc"))
    tcPr = ET.SubElement(tc, w_tag("tcPr"))
    tcW = ET.SubElement(tcPr, w_tag("tcW"))
    tcW.set(w_tag("w"), "9142")
    tcW.set(w_tag("type"), "dxa")

    shd = ET.SubElement(tcPr, w_tag("shd"))
    shd.set(w_tag("val"), "clear")
    shd.set(w_tag("color"), "auto")
    shd.set(w_tag("fill"), "F9FBFD")

    tcMar = ET.SubElement(tcPr, w_tag("tcMar"))
    for m_name, m_val in (("top", "160"), ("left", "200"), ("bottom", "160"), ("right", "200")):
        m = ET.SubElement(tcMar, w_tag(m_name))
        m.set(w_tag("w"), m_val)
        m.set(w_tag("type"), "dxa")

    # Header de la caja
    p_header = make_p(style="Normal", runs=[
        {"text": f"📷 [ESPACIO PARA CAPTURA {img_num}]: {title.upper()}", "bold": True, "color": "1F4E79", "size": 20}
    ], space_after=60, is_table_cell=True)
    tc.append(p_header)

    # Instrucciones para el estudiante
    p_instr = make_p(style="Normal", runs=[
        {"text": "Instrucciones de captura: ", "bold": True, "color": "555555", "size": 17},
        {"text": instructions, "italic": True, "color": "555555", "size": 17}
    ], space_after=120, is_table_cell=True)
    tc.append(p_instr)

    # Zona de pegado
    p_paste = make_p(style="Normal", runs=[
        {"text": f"--- PEGUE AQUÍ LA IMAGEN {img_num} ---", "bold": True, "color": "888888", "size": 18}
    ], jc="center", space_after=120, is_table_cell=True)
    tc.append(p_paste)

    # Pie de foto formal
    p_caption = make_p(style="Normal", runs=[
        {"text": f"Figura {img_num}: ", "bold": True, "color": "1F497D", "size": 17},
        {"text": suggested_caption, "italic": True, "color": "333333", "size": 17}
    ], jc="center", space_after=40, is_table_cell=True)
    tc.append(p_caption)

    return tbl

def build_app_db_elements(elements):
    # Cuadro institucional de control
    elements.append(make_project_box("Aplicación / Base de Datos", "DOC-INT-01"))
    elements.append(make_p(style="Normal", runs=[], space_after=120))

    # ==========================================
    # SECCIÓN 1: INTRODUCCIÓN Y JUSTIFICACIÓN
    # ==========================================
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "1. Introducción y Justificación Arquitectónica", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    elements.append(make_p(style="Normal", runs=[
        {"text": "El presente documento técnico establece el modelo de integración, comunicación y persistencia de datos entre la ", "color": "333333"},
        {"text": "Aplicación Móvil (React Native / Expo)", "bold": True, "color": "1F4E79"},
        {"text": " y la ", "color": "333333"},
        {"text": "Base de Datos Relacional PostgreSQL Serverless (Neon.tech)", "bold": True, "color": "1F4E79"},
        {"text": " para el proyecto ", "color": "333333"},
        {"text": "ATLAS - Field Service Management (FSM)", "bold": True, "color": "1F4E79"},
        {"text": ". Este informe formaliza las decisiones de diseño adoptadas para garantizar la seguridad de las credenciales, la integridad transaccional y la continuidad operativa en terreno.", "color": "333333"}
    ], space_after=80))

    elements.append(make_p(style="Ttulo2", runs=[
        {"text": "1.1. Análisis Comparativo: Conexión Directa vs Arquitectura de 3 Capas", "bold": True, "color": "1F4E79", "size": 24}
    ], space_after=80))

    elements.append(make_p(style="Normal", runs=[
        {"text": "En el desarrollo de aplicaciones para dispositivos móviles, establecer una conexión directa por protocolo TCP hacia el puerto de una base de datos relacional (por ejemplo, el puerto 5432 de PostgreSQL) representa una mala práctica severa conocida como antipatrón de diseño. A continuación se detallan las razones técnicas por las cuales se descarta la conexión directa y se implementa una arquitectura desacoplada en 3 capas:", "color": "333333"}
    ], space_after=80))

    comp_headers = ["Criterio de Evaluación", "Conexión Directa Móvil ➔ PostgreSQL (Descartada)", "Arquitectura 3 Capas ATLAS: Móvil ➔ FastAPI ➔ Neon (Adoptada)"]
    comp_rows = [
        ["Seguridad de Credenciales", "Crítico: La cadena de conexión y usuario maestro quedarían expuestos en el binario APK/IPA descompilable.", "Máxima: El cliente móvil no conoce las credenciales de la base de datos; solo utiliza tokens JWT temporales."],
        ["Gestión de Conexiones", "Pobre: Cientos de dispositivos móviles saturarían el pool de conexiones simultáneas del motor relacional.", "Eficiente: FastAPI administra un Connection Pool asíncrono controlado (10-20 conexiones reutilizables)."],
        ["Restricciones de Red Móvil", "Bloqueos frecuentes: Las redes 4G/5G y cortafuegos de operadoras celulares bloquean puertos no web como el 5432.", "Transparente: Todo el tráfico viaja a través de HTTPS estándar (puerto 443) sin bloqueos por operadoras."],
        ["Lógica de Negocio y Reglas", "Difusa: La validación de datos dependería de triggers o del cliente, complicando la mantenibilidad.", "Centralizada: FastAPI valida esquemas con Pydantic, aplica roles (RBAC) y sanitiza peticiones."],
        ["Resiliencia Fuera de Línea", "Nula: Una desconexión temporal interrumpe la sesión TCP y corrompe las transacciones en curso.", "Robusta: La app gestiona caché local (AsyncStorage/SecureStore) y reintenta peticiones de forma ordenada."]
    ]
    elements.append(make_table(comp_headers, comp_rows, [2200, 3471, 3471]))
    elements.append(make_p(style="Normal", runs=[], space_after=120))

    # ==========================================
    # SECCIÓN 2: STACK TECNOLÓGICO Y TOPOLOGÍA
    # ==========================================
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "2. Stack Tecnológico y Componentes de la Integración", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    elements.append(make_p(style="Normal", runs=[
        {"text": "La solución ATLAS FSM distribuye las responsabilidades en tres capas tecnológicas claramente delimitadas:", "color": "333333"}
    ], space_after=80))

    stack_headers = ["Capa de Arquitectura", "Tecnología Principal", "Ubicación / Plataforma", "Responsabilidad en la Integración"]
    stack_rows = [
        ["Capa 1: Cliente Móvil (Frontend)", "React Native 0.88 + Expo 58 + TypeScript", "Dispositivo móvil técnico (Android / iOS)", "Interfaz de usuario, geolocalización GPS, captura fotográfica, almacenamiento de tokens JWT en SecureStore y cola local."],
        ["Capa 2: API Gateway / Lógica (Backend)", "FastAPI + Python 3.11 + SQLAlchemy 2.0 (asyncpg)", "Render Cloud Services (PaaS en Frankfurt/US)", "Autenticación JWT, autorización RBAC, endpoints RESTful JSON, serialización Pydantic y pool de conexiones."],
        ["Capa 3: Persistencia de Datos (Database)", "PostgreSQL 15 / 16 Serverless", "Neon Cloud (Infraestructura Serverless con SSL)", "Almacenamiento ACID de órdenes, evidencias, clientes y técnicos; indexación geoespacial y respaldos continuos."]
    ]
    elements.append(make_table(stack_headers, stack_rows, [2200, 2400, 2200, 2342]))
    elements.append(make_p(style="Normal", runs=[], space_after=120))

    # ==========================================
    # SECCIÓN 3: PROTOCOLOS DE SEGURIDAD Y FLUJO
    # ==========================================
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "3. Seguridad, Autenticación y Flujo Transaccional", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    elements.append(make_p(style="Ttulo2", runs=[
        {"text": "3.1. Esquema de Autenticación mediante Tokens JWT Bearer", "bold": True, "color": "1F4E79", "size": 24}
    ], space_after=80))

    elements.append(make_p(style="Normal", runs=[
        {"text": "La comunicación entre el dispositivo móvil y la base de datos se rige por el protocolo ", "color": "333333"},
        {"text": "OAuth2 con Tokens Bearer (JWT)", "bold": True, "color": "1F4E79"},
        {"text": ":", "color": "333333"}
    ], space_after=60))

    jwt_steps = [
        "1. Solicitud de Login: El técnico ingresa su correo y contraseña en la aplicación móvil. Esta información se envía mediante una petición cifrada HTTPS POST a '/api/v1/auth/login'.",
        "2. Validación en Base de Datos: FastAPI recibe la solicitud, consulta la tabla de técnicos/usuarios en Neon PostgreSQL y verifica el hash de la contraseña usando algoritmos criptográficos robustos (bcrypt).",
        "3. Emisión de Token: Si las credenciales son válidas, el backend genera un token JWT firmado digitalmente con una clave secreta (SECRET_KEY). Este token contiene la identidad del técnico (ID, rol, expiración).",
        "4. Almacenamiento Seguro Móvil: La aplicación móvil recibe el token y lo almacena de forma aislada en el 'SecureStore' de Expo (Keystore en Android y Keychain en iOS).",
        "5. Inyección en Cada Petición: En las consultas subsecuentes (actualización de estados, captura de fotos, agenda), el cliente móvil añade la cabecera 'Authorization: Bearer <token>'."
    ]
    for step in jwt_steps:
        elements.append(make_p(style="Normal", runs=[{"text": step, "color": "333333"}], space_after=40))

    elements.append(make_p(style="Normal", runs=[], space_after=80))

    elements.append(make_p(style="Ttulo2", runs=[
        {"text": "3.2. Ciclo de Vida de Escritura: Registro de Evidencias en Terreno", "bold": True, "color": "1F4E79", "size": 24}
    ], space_after=80))

    elements.append(make_p(style="Normal", runs=[
        {"text": "Cuando el técnico en terreno completa una visita técnica y toma una fotografía como evidencia, se ejecuta el siguiente flujo transaccional:", "color": "333333"}
    ], space_after=60))

    tx_steps = [
        "a) Captura Local: La cámara del dispositivo móvil captura la imagen mediante 'expo-image-picker' y obtiene las coordenadas satelitales vía 'expo-location'.",
        "b) Transmisión Segura: La app envía la orden actualizada junto con la evidencia codificada a través de 'POST /api/v1/work-orders/{id}/evidences'.",
        "c) Transacción ACID en Backend: FastAPI abre una sesión asíncrona ('AsyncSession') contra PostgreSQL Neon. Se inserta el registro en la tabla 'evidences' y se actualiza el estado de la orden en 'work_orders'.",
        "d) Confirmación (Commit): Si ambas operaciones son exitosas, se confirma la transacción (COMMIT) y se retorna código 201 Created al móvil. Si ocurre un fallo de red o validación, se aplica Rollback automático evitando datos huérfanos."
    ]
    for st in tx_steps:
        elements.append(make_p(style="Normal", runs=[{"text": st, "color": "333333"}], space_after=40))

    elements.append(make_p(style="Normal", runs=[], space_after=120))

    # ==========================================
    # SECCIÓN 4: CONFIGURACIÓN TÉCNICA Y VARIABLES
    # ==========================================
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "4. Configuración de Parámetros y Variables de Entorno", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    elements.append(make_p(style="Normal", runs=[
        {"text": "Para asegurar la interoperabilidad sin exponer datos sensibles, el sistema se configura mediante variables de entorno diferenciadas para cada entorno:", "color": "333333"}
    ], space_after=80))

    env_headers = ["Entorno", "Archivo de Configuración", "Variable de Entorno Clave", "Propósito y Valor de Referencia"]
    env_rows = [
        ["Cliente Móvil (Expo)", "atlas-core/mobile/.env", "EXPO_PUBLIC_API_URL", "URL base pública de la API REST: https://atlas-fsm-backend.onrender.com/api/v1"],
        ["Cliente Móvil (Timeout)", "atlas-core/mobile/src/config.ts", "REQUEST_TIMEOUT_MS", "Tiempo máximo de espera (60.000 ms) para tolerar el arranque en frío (cold start) del hosting Render."],
        ["Backend (FastAPI)", "atlas-core/backend/.env", "DATABASE_URL", "Cadena asíncrona de conexión con Neon: postgresql+asyncpg://neondb_owner:***@ep-***.neon.tech/atlas_fsm?sslmode=require"],
        ["Backend (Seguridad)", "atlas-core/backend/.env", "SECRET_KEY / ALGORITHM", "Clave criptográfica para firma de tokens JWT (HS256) con expiración configurable (ACCESS_TOKEN_EXPIRE_MINUTES)."]
    ]
    elements.append(make_table(env_headers, env_rows, [1800, 2200, 2400, 2742]))
    elements.append(make_p(style="Normal", runs=[], space_after=120))

    # ==========================================
    # SECCIÓN 5: APARTADO DE IMÁGENES / EVIDENCIAS
    # ==========================================
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "5. Evidencias Visuales de la Integración (Capturas de Pantalla)", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    elements.append(make_p(style="Normal", runs=[
        {"text": "En esta sección se disponen los cinco (5) apartados de evidencia gráfica requeridos para validar técnica y documentalmente la comunicación entre la aplicación móvil, los servicios web intermediarios y el repositorio de base de datos PostgreSQL.", "color": "333333"}
    ], space_after=120))

    # IMAGEN 1
    elements.append(make_image_placeholder_box(
        1,
        "Diagrama de Arquitectura de Conexión (Móvil ➔ Backend ➔ PostgreSQL)",
        "Pegue aquí el diagrama que ilustra la arquitectura de 3 capas: Aplicación Móvil (React Native/Expo) comunicándose por HTTPS/REST hacia la API en Render (FastAPI), y esta última interactuando mediante SQLAlchemy y asyncpg con PostgreSQL Serverless en Neon.",
        "Arquitectura de 3 capas para la comunicación segura entre la aplicación móvil ATLAS y la base de datos PostgreSQL en Neon."
    ))
    elements.append(make_p(style="Normal", runs=[], space_after=160))

    # IMAGEN 2
    elements.append(make_image_placeholder_box(
        2,
        "Configuración de Variables de Entorno y Cliente API en la App Móvil",
        "Pegue aquí la captura de pantalla de los archivos 'config.ts' y '.env' de la carpeta 'mobile/', donde se aprecie la variable EXPO_PUBLIC_API_URL configurada hacia la URL de producción o desarrollo de Render y el cliente 'client.ts'.",
        "Configuración del cliente HTTP y variables de entorno del entorno móvil en Expo."
    ))
    elements.append(make_p(style="Normal", runs=[], space_after=160))

    # IMAGEN 3
    elements.append(make_image_placeholder_box(
        3,
        "Flujo de Autenticación Móvil y Almacenamiento Seguro del Token JWT",
        "Pegue aquí la captura de la interfaz de inicio de sesión móvil ('LoginScreen.tsx') en ejecución o la evidencia del código donde se almacena el token JWT retornado por la base de datos en 'SecureStore'.",
        "Pantalla de autenticación técnica en la aplicación móvil y recepción del token Bearer."
    ))
    elements.append(make_p(style="Normal", runs=[], space_after=160))

    # IMAGEN 4
    elements.append(make_image_placeholder_box(
        4,
        "Recepción de Peticiones y Endpoints en la API Backend (Swagger UI / Logs)",
        "Pegue aquí la captura de pantalla de la interfaz interactiva Swagger UI de FastAPI ('/docs') o de los logs en vivo de Render, mostrando las peticiones procesadas (ej: GET /api/v1/work-orders o POST de evidencias).",
        "Documentación Swagger de endpoints RESTful y procesamiento de peticiones provenientes del móvil."
    ))
    elements.append(make_p(style="Normal", runs=[], space_after=160))

    # IMAGEN 5
    elements.append(make_image_placeholder_box(
        5,
        "Persistencia y Verificación de Datos en PostgreSQL (Neon Console / DBeaver)",
        "Pegue aquí la captura de pantalla de la consola de Neon.tech (SQL Editor / Tables) o cliente SQL de escritorio (DBeaver/pgAdmin), mostrando los registros de órdenes de trabajo o evidencias que fueron guardadas o actualizadas desde la app móvil.",
        "Verificación de tuplas y registros persistidos en las tablas de PostgreSQL Neon tras la interacción móvil."
    ))
    elements.append(make_p(style="Normal", runs=[], space_after=160))

    # ==========================================
    # SECCIÓN 6: CONCLUSIONES Y RECOMENDACIONES
    # ==========================================
    elements.append(make_p(style="Ttulo1", runs=[
        {"text": "6. Conclusiones y Recomendaciones Técnicas", "bold": True, "color": "1F497D", "size": 28}
    ], space_after=100))

    elements.append(make_p(style="Normal", runs=[
        {"text": "1. ", "bold": True, "color": "1F4E79"},
        {"text": "El modelo de integración implementado protege íntegramente la capa de persistencia al evitar exponer contraseñas de PostgreSQL en dispositivos de usuarios finales, dando estricto cumplimiento a las directrices de seguridad de OWASP Mobile Application Security Verification Standard (MASVS).", "color": "333333"}
    ], space_after=60))

    elements.append(make_p(style="Normal", runs=[
        {"text": "2. ", "bold": True, "color": "1F4E79"},
        {"text": "La incorporación de un pool de conexiones asíncrono en FastAPI optimiza los recursos computacionales de la base de datos serverless Neon, permitiendo una rápida escalabilidad ante incrementos en el volumen de cuadrillas técnicas en terreno.", "color": "333333"}
    ], space_after=60))

    elements.append(make_p(style="Normal", runs=[
        {"text": "3. ", "bold": True, "color": "1F4E79"},
        {"text": "La arquitectura desacoplada garantiza que futuras migraciones de base de datos o ampliaciones en el esquema relacional no requieran redistribuir una nueva versión de la aplicación móvil en las tiendas de aplicaciones, siempre que se conserve la compatibilidad de contratos en la API REST.", "color": "333333"}
    ], space_after=100))

    # Callout final
    elements.append(make_callout_box(
        "Verificación Final de Entrega",
        [
            "• El documento cuenta con todos los aspectos teóricos y prácticos de la conexión aplicación móvil / base de datos.",
            "• Para completar el entregable, inserte las cinco (5) capturas de pantalla en los cuadros delimitados de la Sección 5.",
            "• Recuerde guardar el documento final como PDF antes de subirlo a la plataforma académica institucional."
        ],
        border_color="2E75B6",
        bg_color="F2F5F8"
    ))
    elements.append(make_p(style="Normal", runs=[], space_after=120))

def generate_markdown(out_path):
    md_content = """# 📱 Conexión Aplicación / Base de Datos: Guía Técnica de Integración y Arquitectura

**Proyecto:** ATLAS - Field Service Management (FSM)  
**Código de Documento:** ATLAS-INT-APP-DB-01  
**Tipo de Entregable:** Especificación Técnica de Conexión Aplicación / Base de Datos  
**Equipo Responsable:** Alexander Sáez (DevOps / DBA), Joaquín Mendoza (Backend Lead), Diego Jiménez (Frontend/Mobile Lead), Matías Abarca (QA)  
**Institución:** Duoc UC - Escuela de Informática y Telecomunicaciones  
**Fecha:** Noviembre 2026 | **Versión:** 1.0  

---

## 1. Introducción y Justificación Arquitectónica

El presente documento técnico establece el modelo de integración, comunicación y persistencia de datos entre la **Aplicación Móvil (React Native / Expo)** y la **Base de Datos Relacional PostgreSQL Serverless (Neon.tech)** para el proyecto **ATLAS - Field Service Management (FSM)**.

### 1.1. Análisis Comparativo: Conexión Directa vs Arquitectura de 3 Capas

En el desarrollo de software móvil, conectarse directamente desde el teléfono por TCP (puerto 5432) a PostgreSQL es considerado un grave **antipatrón de diseño**. ATLAS implementa una **Arquitectura en 3 Capas Desacoplada**:

| Criterio de Evaluación | Conexión Directa Móvil ➔ PostgreSQL (Descartada) | Arquitectura 3 Capas ATLAS: Móvil ➔ FastAPI ➔ Neon (Adoptada) |
|---|---|---|
| **Seguridad de Credenciales** | Crítico: Cadena de conexión y credenciales maestras quedarían expuestas en el APK/IPA descompilable. | Máxima: El cliente móvil desconoce las credenciales de la BD; opera exclusivamente con tokens temporales JWT. |
| **Gestión de Conexiones** | Pobre: Cientos de teléfonos saturarían el límite de conexiones concurrentes del motor relacional. | Eficiente: FastAPI administra un Connection Pool asíncrono controlado (10-20 conexiones reutilizables). |
| **Restricciones de Red Móvil** | Bloqueos frecuentes: Las redes celulares 4G/5G bloquean puertos no estándar como el 5432. | Transparente: Tráfico cifrado mediante HTTPS estándar (puerto 443) compatible con todas las operadoras. |
| **Lógica de Negocio y Reglas** | Difusa: Complicaría la validación de estados y auditoría en cada cliente móvil. | Centralizada: FastAPI valida esquemas con Pydantic, aplica roles (RBAC) y sanitiza peticiones. |
| **Resiliencia Fuera de Línea** | Nula: Pérdida momentánea de cobertura aborta sockets TCP y corrompe transacciones. | Robusta: La app gestiona caché local (AsyncStorage/SecureStore) y reintenta operaciones al recuperar señal. |

---

## 2. Stack Tecnológico y Componentes de la Integración

```
┌─────────────────────────────────┐
│     1. CLIENTE MÓVIL (APP)      │
│  React Native + Expo (Android)  │
│  - SecureStore (JWT Token)      │
│  - AsyncStorage (Offline Cache) │
└────────────────┬────────────────┘
                 │ HTTPS (TLS 1.3) / JSON REST API
                 │ Authorization: Bearer <JWT>
                 ▼
┌─────────────────────────────────┐
│     2. CAPA BACKEND (API)       │
│   FastAPI (Python en Render)    │
│  - Validación Pydantic          │
│  - SQLAlchemy 2.0 (asyncpg)     │
│  - Connection Pool (10/20)      │
└────────────────┬────────────────┘
                 │ TCP + TLS / SSL Obligatorio
                 │ asyncpg connection string
                 ▼
┌─────────────────────────────────┐
│  3. BASE DE DATOS (PERSISTENCIA)│
│  Neon PostgreSQL Serverless     │
│  - Tablas: work_orders,         │
│    evidences, technicians, etc. │
└─────────────────────────────────┘
```

1. **Capa 1: Cliente Móvil (Frontend)**: React Native 0.88, Expo 58, TypeScript, Expo SecureStore y AsyncStorage.
2. **Capa 2: API Gateway / Lógica (Backend)**: FastAPI, Python 3.11, SQLAlchemy 2.0 con driver asíncrono `asyncpg`, alojado en Render.
3. **Capa 3: Persistencia de Datos (Database)**: PostgreSQL 15/16 Serverless en Neon.tech con modo SSL requerido (`sslmode=require`).

---

## 3. Seguridad, Autenticación y Flujo Transaccional

### 3.1. Flujo de Autenticación con Tokens JWT Bearer
1. **Solicitud de Login**: El técnico envía credenciales mediante HTTPS POST a `/api/v1/auth/login`.
2. **Validación en BD**: FastAPI consulta el hash de contraseña (bcrypt) en PostgreSQL.
3. **Emisión de Token**: Si es válido, se emite un JWT firmado con `SECRET_KEY`.
4. **Almacenamiento Seguro**: El móvil almacena el token en `SecureStore` (Keystore/Keychain del SO móvil).
5. **Inyección en Cabecera**: Cada petición adjunta `Authorization: Bearer <token>`.

### 3.2. Ciclo de Vida de Escritura: Registro de Evidencias
- Captura de foto con cámara (`expo-image-picker`) y geolocalización satelital (`expo-location`).
- Envío a través del endpoint `POST /api/v1/work-orders/{id}/evidences`.
- Transacción atómica en FastAPI (`AsyncSession`): inserción en `evidences` + cambio de estado en `work_orders`.
- COMMIT con retorno `201 Created` o ROLLBACK automático si ocurre alguna inconsistencia.

---

## 4. Configuración de Parámetros y Variables de Entorno

* **Móvil (`.env`)**:
  ```env
  EXPO_PUBLIC_API_URL=https://atlas-fsm-backend.onrender.com/api/v1
  ```
* **Móvil (`src/config.ts`)**:
  ```typescript
  export const API_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\\/+$/, '');
  export const REQUEST_TIMEOUT_MS = 60_000; // Tolerancia a cold-start de hosting
  ```
* **Backend (`.env`)**:
  ```env
  DATABASE_URL=postgresql+asyncpg://neondb_owner:<PASSWORD>@<HOST_NEON>/atlas_fsm?sslmode=require
  SECRET_KEY=<CLAVE_SECRETA_JWT>
  ALGORITHM=HS256
  ```

---

## 5. Evidencias Visuales de la Integración (5 Espacios para Imágenes)

A continuación se disponen los apartados formales para incorporar las capturas de verificación:

### 📷 Imagen 1: Diagrama de Arquitectura de Conexión (Móvil ➔ Backend ➔ PostgreSQL)
> *Instrucciones:* Inserte el diagrama de bloques que represente la interacción de 3 capas entre la app móvil React Native, la API FastAPI y la base de datos PostgreSQL Neon.  
> **Figura 1: Arquitectura de 3 capas para la comunicación segura entre la aplicación móvil ATLAS y la base de datos PostgreSQL en Neon.**

---

### 📷 Imagen 2: Configuración de Variables de Entorno y Cliente API en la App Móvil
> *Instrucciones:* Inserte la captura de pantalla de los archivos `mobile/src/config.ts` y `.env` mostrando la variable `EXPO_PUBLIC_API_URL` y el cliente HTTP `client.ts`.  
> **Figura 2: Configuración del cliente HTTP y variables de entorno del entorno móvil en Expo.**

---

### 📷 Imagen 3: Flujo de Autenticación Móvil y Almacenamiento Seguro del Token JWT
> *Instrucciones:* Inserte la captura de la pantalla de Login en el teléfono (`LoginScreen.tsx`) o el bloque de código donde se almacena el token recibido en `SecureStore`.  
> **Figura 3: Pantalla de autenticación técnica en la aplicación móvil y recepción del token Bearer.**

---

### 📷 Imagen 4: Recepción de Peticiones y Endpoints en la API Backend (Swagger UI / Logs)
> *Instrucciones:* Inserte la captura de pantalla de la documentación Swagger UI (`/docs`) o de los logs de Render procesando peticiones del móvil.  
> **Figura 4: Documentación Swagger de endpoints RESTful y procesamiento de peticiones provenientes del móvil.**

---

### 📷 Imagen 5: Persistencia y Verificación de Datos en PostgreSQL (Neon Console / DBeaver)
> *Instrucciones:* Inserte la captura de pantalla de Neon Console (SQL Editor) o cliente SQL de escritorio (DBeaver) mostrando los registros de órdenes o evidencias guardados desde la app.  
> **Figura 5: Verificación de tuplas y registros persistidos en las tablas de PostgreSQL Neon tras la interacción móvil.**

---

## 6. Conclusiones y Recomendaciones Técnicas
1. **Cumplimiento de Seguridad OWASP MASVS**: No se exponen credenciales de base de datos en los dispositivos móviles.
2. **Eficiencia y Escalabilidad**: El pool asíncrono de FastAPI protege a PostgreSQL Neon ante cientos de peticiones móviles concurrentes.
3. **Mantenibilidad**: Los cambios en tablas o esquemas de base de datos son absorbidos por la capa de API sin obligar a actualizar la app móvil en los clientes.
"""
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"  📝 Archivo Markdown generado: {out_path}")

def main():
    print("=== Generando Documento: Conexión Aplicación / Base de Datos ===")
    
    # 1. Compilar versión DOCX
    docx_filename = "Aplicacion_Base_de_Datos_Atlas.docx"
    compile_docx(
        output_filename=docx_filename,
        doc_title_cover="Aplicación / Base de Datos",
        footer_text="Aplicación / Base de Datos",
        elements_generator_func=build_app_db_elements
    )

    # 2. Generar versión Markdown
    md_filename = "APLICACION_BASE_DE_DATOS.md"
    md_dest = os.path.join(ATLAS_CORE_DIR, "docs", md_filename)
    generate_markdown(md_dest)

    # 3. Copiar a la carpeta oficial de entregables
    oficial_dir = os.path.join(ATLAS_CORE_DIR, "docs", "Fase 2 Capstone", "Evidencia Proyecto", "Evidencias de documentación")
    os.makedirs(oficial_dir, exist_ok=True)
    shutil.copy2(os.path.join(ATLAS_CORE_DIR, "docs", docx_filename), os.path.join(oficial_dir, docx_filename))
    print(f"  📁 Copiado a entregables oficiales: {os.path.join(oficial_dir, docx_filename)}")

    # 4. Copiar a la carpeta del Escritorio
    desktop_dir = "/mnt/c/Users/Alexander/Desktop/Documentos Fase Final Atlas"
    if os.path.exists(desktop_dir):
        shutil.copy2(os.path.join(ATLAS_CORE_DIR, "docs", docx_filename), os.path.join(desktop_dir, docx_filename))
        shutil.copy2(md_dest, os.path.join(desktop_dir, md_filename))
        print(f"  🖥️ Copiado a carpeta de Escritorio: {desktop_dir}")

    print("\n✅ Generación completada con éxito.")

if __name__ == "__main__":
    main()
