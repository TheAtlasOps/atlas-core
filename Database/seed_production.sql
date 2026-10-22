-- =============================================================================
-- PROYECTO ATLAS - FIELD SERVICE MANAGEMENT (FSM) PARA ENTEL
-- SCRIPT DE INICIALIZACION PARA AMBIENTE DE PRODUCCION (DATOS REALES)
-- AUTOR: Alexander Sáez López (Gestión y Modelado de Base de Datos)
-- =============================================================================

-- Instrucciones:
-- 1. Este script está diseñado para ejecutarse en una base de datos limpia con schema.sql ya aplicado.
-- 2. Modifica los correos, RUTs y contraseñas según los datos de los usuarios reales de la empresa.
-- 3. Las contraseñas se encriptan con bcrypt (costo 12) utilizando la extensión pgcrypto de PostgreSQL.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. USUARIOS CORPORATIVOS DE LA EMPRESA (ADMINISTRADORES Y COORDINADORES)
-- =============================================================================

-- Inserción de Administradores
-- Contraseña por defecto: Cambiar en primer inicio de sesión
INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active)
VALUES
    (
        'a0000000-0000-0000-0000-000000000001',
        'alexander.saez@atlasops.cl',
        crypt('Atlas2026!Prod', gen_salt('bf', 12)),
        'Alexander Sáez López',
        '+56 9 1234 5678',
        'ADMIN',
        TRUE
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'diego.jimenez@atlasops.cl',
        crypt('Atlas2026!Prod', gen_salt('bf', 12)),
        'Diego Jiménez Escobar',
        '+56 9 8765 4321',
        'ADMIN',
        TRUE
    ),
    (
        'a0000000-0000-0000-0000-000000000003',
        'joaquin.mendoza@atlasops.cl',
        crypt('Atlas2026!Prod', gen_salt('bf', 12)),
        'Joaquín Mendoza Arias',
        '+56 9 2345 6789',
        'COORDINADOR',
        TRUE
    )
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- 2. TECNICOS EN TERRENO (USUARIOS + PERFIL DE TECNICO)
-- =============================================================================

-- Usuario para Técnico: Alexander Sáez López
INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active)
VALUES
    (
        'b0000000-0000-0000-0000-000000000001',
        'al.saezl@duocuc.cl',
        crypt('TecnicoAtlas2026!', gen_salt('bf', 12)),
        'Alexander Sáez López',
        '+56 9 1234 5678',
        'TECNICO',
        TRUE
    )
ON CONFLICT (email) DO NOTHING;

-- Perfil técnico con patente y coordenadas de inicio
INSERT INTO technicians (id, rut, initials, vehicle_plate, current_lat, current_lng, is_available)
VALUES
    (
        'b0000000-0000-0000-0000-000000000001',
        '19.876.543-2',
        'AS',
        'GG-WP-24',
        -33.4372000,
        -70.6506000,
        TRUE
    )
ON CONFLICT (rut) DO NOTHING;

-- =============================================================================
-- 3. CLIENTES EMPRESARIALES (CON CORREOS REALES PARA ENVIO DE MAGIC LINKS)
-- =============================================================================

INSERT INTO clients (id, rut, business_name, contact_person, contact_phone, contact_email, address, comuna, region, lat, lng)
VALUES
    (
        'c0000000-0000-0000-0000-000000000001',
        '18.987.654-3',
        'Entel B2B - Soluciones SpA',
        'Diego Jiménez Escobar',
        '+56 9 8765 4321',
        'di.jimeneze@duocuc.cl',
        'Av. Vitacura 2939, Torre Entel',
        'Las Condes',
        'Metropolitana',
        -33.4140000,
        -70.6050000
    )
ON CONFLICT (rut) DO NOTHING;

-- =============================================================================
-- FIN DEL SCRIPT DE PRODUCCION
-- =============================================================================
