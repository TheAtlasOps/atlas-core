-- =============================================================================
-- PROYECTO ATLAS - FIELD SERVICE MANAGEMENT (FSM)
-- BASE DE DATOS: PostgreSQL 15+ (Compatible con Neon.tech / Supabase / AWS RDS)
-- AUTOR: Alexander Sáez (Gestión y Modelado de Base de Datos)
-- =============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPOS ENUMERADOS (ENUMS)
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'COORDINADOR', 'TECNICO', 'CLIENTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status_enum AS ENUM ('IDLE', 'CONFIRMADA', 'EN_RUTA', 'EN_SITIO', 'COMPLETADA', 'CANCELADA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_priority_enum AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'URGENTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE service_type_enum AS ENUM (
        'INSTALACION_FIBRA',
        'CAMBIO_SIM',
        'REVISION_ANTENA_4G',
        'DIAGNOSTICO_ROUTER',
        'ACTIVACION_MAGIC_LINK',
        'INSTALACION_REPETIDOR',
        'ALTA_LINEA_EMPRESARIAL',
        'REEMPLAZO_MODEM',
        'CONFIGURACION_VPN',
        'OTRO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sim_status_enum AS ENUM ('DISPONIBLE', 'ASIGNADA_TECNICO', 'INSTALADA', 'DEFECTUOSA', 'BAJA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE equipment_type_enum AS ENUM ('ROUTER_4G', 'ROUTER_5G', 'MODEM_ADSL', 'REPETIDOR_WIFI', 'ANTENA_EXTERNA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE equipment_status_enum AS ENUM ('DISPONIBLE', 'ASIGNADO_TECNICO', 'INSTALADO', 'DEFECTUOSO', 'BAJA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE evidence_type_enum AS ENUM ('FOTO_ANTES', 'FOTO_DESPUES', 'TEST_VELOCIDAD', 'DIAGNOSTICO_DBM', 'FIRMA_CLIENTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. FUNCION PARA AUTO-ACTUALIZAR updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================================================
-- 4. TABLAS PRINCIPALES
-- =============================================================================

-- TABLA: users (Usuarios y autenticación del sistema)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    role user_role_enum NOT NULL DEFAULT 'TECNICO',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- TABLA: technicians (Perfil extendido para técnicos en terreno)
CREATE TABLE IF NOT EXISTS technicians (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    rut VARCHAR(20) UNIQUE NOT NULL,
    initials VARCHAR(10) NOT NULL,
    avatar_url TEXT,
    vehicle_plate VARCHAR(20),
    current_lat NUMERIC(10, 7),
    current_lng NUMERIC(10, 7),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER update_technicians_updated_at BEFORE UPDATE ON technicians FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- TABLA: clients (Clientes corporativos y residenciales)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rut VARCHAR(20) UNIQUE,
    business_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(150),
    contact_phone VARCHAR(50) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    address VARCHAR(300) NOT NULL,
    comuna VARCHAR(100) NOT NULL,
    region VARCHAR(100) DEFAULT 'Metropolitana',
    lat NUMERIC(10, 7),
    lng NUMERIC(10, 7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- TABLA: sim_cards (Inventario de tarjetas SIM / IoT Entel)
CREATE TABLE IF NOT EXISTS sim_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iccid VARCHAR(22) UNIQUE NOT NULL,
    imsi VARCHAR(20),
    msisdn VARCHAR(20),
    operator VARCHAR(50) DEFAULT 'Entel',
    status sim_status_enum NOT NULL DEFAULT 'DISPONIBLE',
    assigned_technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    installed_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER update_sim_cards_updated_at BEFORE UPDATE ON sim_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- TABLA: equipment (Inventario de Routers y hardware de conectividad)
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    mac_address VARCHAR(50),
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    type equipment_type_enum NOT NULL,
    status equipment_status_enum NOT NULL DEFAULT 'DISPONIBLE',
    assigned_technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    installed_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- TABLA: work_orders (Órdenes de Trabajo / FSM Core)
CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL, -- ej. "#OT-08491" o "OT-2024-08491"
    title VARCHAR(250) NOT NULL,
    description TEXT,
    service_type service_type_enum NOT NULL,
    priority order_priority_enum NOT NULL DEFAULT 'MEDIA',
    status order_status_enum NOT NULL DEFAULT 'IDLE',
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    eta TIMESTAMP WITH TIME ZONE,
    address_override VARCHAR(300),
    comuna_override VARCHAR(100),
    lat NUMERIC(10, 7),
    lng NUMERIC(10, 7),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    tag VARCHAR(50), -- Tag visual para el Kanban (Fibra, SIM, Red, Hardware, Magic Link)
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- TABLA: work_order_items (Items de equipamiento o SIMs vinculados a una OT)
CREATE TABLE IF NOT EXISTS work_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    sim_card_id UUID REFERENCES sim_cards(id) ON DELETE SET NULL,
    equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL DEFAULT 'INSTALACION', -- INSTALACION, RETIRO, REEMPLAZO
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: magic_links (Tokens de acceso seguro para portal clientes sin contraseña)
CREATE TABLE IF NOT EXISTS magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    token VARCHAR(128) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    client_confirmed_at TIMESTAMP WITH TIME ZONE,
    signature_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: work_order_evidences (Evidencias y checklist en terreno de la App Móvil)
CREATE TABLE IF NOT EXISTS work_order_evidences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE RESTRICT,
    evidence_type evidence_type_enum NOT NULL,
    storage_url TEXT NOT NULL,
    signal_dbm NUMERIC(5, 2), -- Medición de potencia de señal (-85.5 dBm)
    speed_download_mbps NUMERIC(7, 2),
    speed_upload_mbps NUMERIC(7, 2),
    validated_iccid VARCHAR(22),
    validated_imsi VARCHAR(20),
    notes TEXT,
    lat NUMERIC(10, 7),
    lng NUMERIC(10, 7),
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: order_status_history (Trazabilidad y auditoría de cambios de estado)
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    old_status order_status_enum,
    new_status order_status_enum NOT NULL,
    changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    lat NUMERIC(10, 7),
    lng NUMERIC(10, 7),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 5. ÍNDICES DE OPTIMIZACIÓN (QUERY PERFORMANCE)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_technician ON work_orders(technician_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_client ON work_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_scheduled_date ON work_orders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_sim_cards_iccid ON sim_cards(iccid);
CREATE INDEX IF NOT EXISTS idx_sim_cards_status ON sim_cards(status);
CREATE INDEX IF NOT EXISTS idx_equipment_serial ON equipment(serial_number);
CREATE INDEX IF NOT EXISTS idx_work_order_evidences_order ON work_order_evidences(work_order_id);
