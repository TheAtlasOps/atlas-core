-- =============================================================================
-- PROYECTO ATLAS - FIELD SERVICE MANAGEMENT (FSM)
-- DATOS SEMILLA (SEED DATA)
-- Compatible con mock data de Frontend (Dispatch Board, WorkOrders, Magic Links)
-- =============================================================================

-- Limpieza preventiva en cascada (para entorno de desarrollo)
TRUNCATE TABLE order_status_history CASCADE;
TRUNCATE TABLE work_order_evidences CASCADE;
TRUNCATE TABLE magic_links CASCADE;
TRUNCATE TABLE work_order_items CASCADE;
TRUNCATE TABLE work_orders CASCADE;
TRUNCATE TABLE sim_cards CASCADE;
TRUNCATE TABLE equipment CASCADE;
TRUNCATE TABLE clients CASCADE;
TRUNCATE TABLE technicians CASCADE;
TRUNCATE TABLE users CASCADE;

-- 1. USUARIOS (COORDINADORES Y TÉCNICOS)
-- Passwords hash simulados (bcrypt para 'Atlas2026!')
INSERT INTO users (id, email, password_hash, full_name, phone, role) VALUES
('a0000000-0000-0000-0000-000000000001', 'diego.jimenez@atlasops.cl', '$2b$12$e8Y6BqQ8W5.mockhash1', 'Diego Jiménez Escobar', '+56 9 9123 4567', 'COORDINADOR'),
('a0000000-0000-0000-0000-000000000002', 'joaquin.mendoza@atlasops.cl', '$2b$12$e8Y6BqQ8W5.mockhash2', 'Joaquín Ignacio Mendoza Arias', '+56 9 9234 5678', 'COORDINADOR'),
('a0000000-0000-0000-0000-000000000003', 'alexander.saez@atlasops.cl', '$2b$12$e8Y6BqQ8W5.mockhash3', 'Alexander Andrés Sáez López', '+56 9 9563 3425', 'ADMIN'),
-- Técnicos de Terreno
('b0000000-0000-0000-0000-000000000001', 'carlos.mendoza@entel.cl', '$2b$12$e8Y6BqQ8W5.mockhash4', 'Carlos Mendoza', '+56 9 8765 4321', 'TECNICO'),
('b0000000-0000-0000-0000-000000000002', 'juan.rojas@entel.cl', '$2b$12$e8Y6BqQ8W5.mockhash5', 'Juan Rojas', '+56 9 8111 2233', 'TECNICO'),
('b0000000-0000-0000-0000-000000000003', 'luis.paredes@entel.cl', '$2b$12$e8Y6BqQ8W5.mockhash6', 'Luis Paredes', '+56 9 8222 3344', 'TECNICO'),
('b0000000-0000-0000-0000-000000000004', 'matias.koch@entel.cl', '$2b$12$e8Y6BqQ8W5.mockhash7', 'Matías Koch', '+56 9 8333 4455', 'TECNICO'),
('b0000000-0000-0000-0000-000000000005', 'tomas.castro@entel.cl', '$2b$12$e8Y6BqQ8W5.mockhash8', 'Tomás Castro', '+56 9 8444 5566', 'TECNICO'),
('b0000000-0000-0000-0000-000000000006', 'esteban.kral@entel.cl', '$2b$12$e8Y6BqQ8W5.mockhash9', 'Esteban Kral', '+56 9 8555 6677', 'TECNICO'),
('b0000000-0000-0000-0000-000000000007', 'sebastian.araya@entel.cl', '$2b$12$e8Y6BqQ8W5.mockhash10', 'Sebastián Araya', '+56 9 8666 7788', 'TECNICO');

-- 2. TÉCNICOS (DETALLE OPERATIVO)
INSERT INTO technicians (id, rut, initials, vehicle_plate, current_lat, current_lng, is_available) VALUES
('b0000000-0000-0000-0000-000000000001', '16.890.123-4', 'CM', 'KDXL-42', -33.4320, -70.6093, TRUE), -- Providencia
('b0000000-0000-0000-0000-000000000002', '15.432.765-8', 'JR', 'LPRT-89', -33.4103, -70.5684, TRUE), -- Las Condes
('b0000000-0000-0000-0000-000000000003', '17.654.321-9', 'LP', 'JHGF-12', -33.4569, -70.5990, TRUE), -- Ñuñoa
('b0000000-0000-0000-0000-000000000004', '18.123.456-7', 'MK', 'MKPL-99', -33.4489, -70.6693, TRUE), -- Santiago Centro
('b0000000-0000-0000-0000-000000000005', '14.987.654-3', 'TC', 'TCRY-55', -33.4000, -70.5800, TRUE),
('b0000000-0000-0000-0000-000000000006', '16.345.678-2', 'EK', 'EKTR-77', -33.4400, -70.6200, TRUE),
('b0000000-0000-0000-0000-000000000007', '19.456.789-1', 'SA', 'SABX-11', -33.5100, -70.7600, TRUE);

-- 3. CLIENTES
INSERT INTO clients (id, rut, business_name, contact_person, contact_phone, contact_email, address, comuna, lat, lng) VALUES
('c0000000-0000-0000-0000-000000000001', '76.123.456-7', 'Oficinas Providencia S.A.', 'Camila Valenzuela', '+56 9 7111 2222', 'contacto@providenciasa.cl', 'Av. Providencia 1234, Piso 3', 'Providencia', -33.4320, -70.6093),
('c0000000-0000-0000-0000-000000000002', '96.555.444-3', 'Entel HQ Corporativo', 'Rodrigo Silva', '+56 9 7222 3333', 'rsilva@entel.cl', 'Amunátegui 20, Santiago Centro', 'Santiago', -33.4440, -70.6550),
('c0000000-0000-0000-0000-000000000003', '77.888.999-1', 'Torre Costanera Hub', 'Ignacia Morales', '+56 9 7333 4444', 'imorales@costanera.cl', 'Av. Andrés Bello 2457, Las Condes', 'Las Condes', -33.4180, -70.6060),
('c0000000-0000-0000-0000-000000000004', '78.999.111-2', 'Empresas Vitacura SpA', 'Felipe Castro', '+56 9 7444 5555', 'felipe@vitacuraspas.cl', 'Av. Vitacura 2939, Vitacura', 'Vitacura', -33.4020, -70.5950),
('c0000000-0000-0000-0000-000000000005', '76.444.333-8', 'Comercial Ñuñoa Ltda.', 'Daniela Rojas', '+56 9 7555 6666', 'daniela@nunoaltda.cl', 'Calle Irarrázaval 890, Ñuñoa', 'Ñuñoa', -33.4540, -70.6120),
('c0000000-0000-0000-0000-000000000006', '69.070.100-5', 'Municipalidad de Maipú', 'Álvaro Bravo', '+56 9 7666 7777', 'infra@maipu.cl', 'Av. Pajaritos 2024, Maipú', 'Maipú', -33.5100, -70.7600),
('c0000000-0000-0000-0000-000000000007', '97.036.000-K', 'BancoEstado Casa Matriz', 'Gonzalo Vidal', '+56 9 7777 8888', 'gvidal@bancoestado.cl', 'Av. Libertador B. O'Higgins 1111, Santiago', 'Santiago', -33.4445, -70.6540),
('c0000000-0000-0000-0000-000000000008', '79.123.789-0', 'Servicios Los Aromos', 'Patricia Fuentes', '+56 9 7888 9999', 'pfuentes@losaromos.cl', 'Calle Los Aromos 52, Peñalolén', 'Peñalolén', -33.4750, -70.5500),
('c0000000-0000-0000-0000-000000000009', '77.333.222-4', 'Edificio Apoquindo Prime', 'Jorge Tapia', '+56 9 7999 0000', 'jtapia@apoquindoprime.cl', 'Av. Apoquindo 6100, Las Condes', 'Las Condes', -33.4110, -70.5650);

-- 4. INVENTARIO DE SIM CARDS (ENTEL)
INSERT INTO sim_cards (iccid, imsi, msisdn, operator, status, assigned_technician_id) VALUES
('89560200102400018491', '730010240001849', '+56911220001', 'Entel', 'ASIGNADA_TECNICO', 'b0000000-0000-0000-0000-000000000001'),
('89560200102400018492', '730010240001849', '+56911220002', 'Entel', 'ASIGNADA_TECNICO', 'b0000000-0000-0000-0000-000000000002'),
('89560200102400018493', '730010240001849', '+56911220003', 'Entel', 'DISPONIBLE', NULL),
('89560200102400018494', '730010240001849', '+56911220004', 'Entel', 'DISPONIBLE', NULL),
('89560200102400018495', '730010240001849', '+56911220005', 'Entel', 'INSTALADA', NULL),
('89560200102400018496', '730010240001849', '+56911220006', 'Entel', 'DEFECTUOSA', NULL);

-- 5. INVENTARIO DE HARDWARE / ROUTERS
INSERT INTO equipment (serial_number, mac_address, brand, model, type, status, assigned_technician_id) VALUES
('RTR-ENTEL-2024-001', 'B8:27:EB:01:44:A1', 'Huawei', 'B310s-518', 'ROUTER_4G', 'ASIGNADO_TECNICO', 'b0000000-0000-0000-0000-000000000001'),
('RTR-ENTEL-2024-002', 'B8:27:EB:02:55:B2', 'Teltonika', 'RUT240 IoT', 'ROUTER_4G', 'ASIGNADO_TECNICO', 'b0000000-0000-0000-0000-000000000002'),
('RTR-ENTEL-2024-003', 'B8:27:EB:03:66:C3', 'MikroTik', 'hEX S Gigabit', 'ROUTER_5G', 'DISPONIBLE', NULL),
('RTR-ENTEL-2024-004', 'B8:27:EB:04:77:D4', 'TP-Link', 'Archer C6', 'REPETIDOR_WIFI', 'DISPONIBLE', NULL);

-- 6. ÓRDENES DE TRABAJO (ALINEADAS CON WORKORDERS.JSX DEL FRONTEND)
INSERT INTO work_orders (
    id, order_number, title, description, service_type, priority, status,
    client_id, technician_id, scheduled_date, eta, address_override, comuna_override, lat, lng, tag
) VALUES
-- IDLE / PENDIENTE
('d0000000-0000-0000-0000-000000000001', '#OT-08491', 'Instalación fibra óptica', 'Instalación y configuración de router corporativo y enlace de respaldo.', 'INSTALACION_FIBRA', 'ALTA', 'CONFIRMADA', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP + interval '2 hours', CURRENT_TIMESTAMP + interval '2 hours', 'Av. Providencia 1234, Providencia', 'Providencia', -33.4320, -70.6093, 'Fibra'),

('d0000000-0000-0000-0000-000000000002', '#OT-08492', 'Cambio de SIM corporativa', 'Sustitución de chip 3G por nueva SIM 5G M2M de alta velocidad.', 'CAMBIO_SIM', 'MEDIA', 'IDLE', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', CURRENT_TIMESTAMP + interval '4 hours', NULL, 'Entel HQ, Santiago Centro', 'Santiago', -33.4440, -70.6550, 'SIM'),

('d0000000-0000-0000-0000-000000000003', '#OT-08493', 'Revisión antena 4G', 'Alineación de ganancia y medición de RSSI/RSRP en azotea.', 'REVISION_ANTENA_4G', 'ALTA', 'IDLE', 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004', CURRENT_TIMESTAMP + interval '5 hours', NULL, 'Torre Entel, Las Condes', 'Las Condes', -33.4180, -70.6060, 'Red'),

('d0000000-0000-0000-0000-000000000004', '#OT-08494', 'Diagnóstico router empresarial', 'Verificación de caídas intermitentes y logs de firewall.', 'DIAGNOSTICO_ROUTER', 'BAJA', 'IDLE', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000005', CURRENT_TIMESTAMP + interval '6 hours', NULL, 'Av. Vitacura 2939, Vitacura', 'Vitacura', -33.4020, -70.5950, 'Hardware'),

-- EN RUTA / EN TRÁNSITO
('d0000000-0000-0000-0000-000000000005', '#OT-08495', 'Activación Magic Link', 'Configuración de acceso seguro y entrega de credenciales a cliente.', 'ACTIVACION_MAGIC_LINK', 'ALTA', 'EN_RUTA', 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000006', CURRENT_TIMESTAMP + interval '30 minutes', CURRENT_TIMESTAMP + interval '45 minutes', 'Calle Irarrázaval 890, Ñuñoa', 'Ñuñoa', -33.4540, -70.6120, 'Magic Link'),

('d0000000-0000-0000-0000-000000000006', '#OT-08496', 'Revisión señal móvil', 'Mapeo de cobertura interior en subterráneo comercial.', 'REVISION_ANTENA_4G', 'MEDIA', 'EN_RUTA', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000006', CURRENT_TIMESTAMP + interval '1 hour', CURRENT_TIMESTAMP + interval '1 hour', 'Torre Entel, Santiago Centro', 'Santiago', -33.4440, -70.6550, 'Red'),

('d0000000-0000-0000-0000-000000000007', '#OT-08497', 'Instalación repetidor WiFi', 'Extensión de cobertura para red de operarios en bodega.', 'INSTALACION_REPETIDOR', 'ALTA', 'EN_RUTA', 'c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000007', CURRENT_TIMESTAMP + interval '45 minutes', CURRENT_TIMESTAMP + interval '45 minutes', 'Municipalidad de Maipú, Maipú', 'Maipú', -33.5100, -70.7600, 'Hardware'),

-- COMPLETADAS
('d0000000-0000-0000-0000-000000000008', '#OT-08498', 'Alta de línea empresarial', 'Habilitación de troncal SIP y pruebas de audio.', 'ALTA_LINEA_EMPRESARIAL', 'BAJA', 'COMPLETADA', 'c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000006', CURRENT_TIMESTAMP - interval '4 hours', NULL, 'BancoEstado Casa Matriz, Santiago', 'Santiago', -33.4445, -70.6540, 'SIM'),

('d0000000-0000-0000-0000-000000000009', '#OT-08499', 'Reemplazo módem ADSL', 'Migración obligatoria a enlace 4G LTE de alta disponibilidad.', 'REEMPLAZO_MODEM', 'MEDIA', 'COMPLETADA', 'c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000003', CURRENT_TIMESTAMP - interval '2 hours', NULL, 'Calle Los Aromos 52, Peñalolén', 'Peñalolén', -33.4750, -70.5500, 'Hardware'),

('d0000000-0000-0000-0000-000000000010', '#OT-08500', 'Configuración VPN corporativa', 'Túnel IPsec entre router sucursal y datacenter Entel.', 'CONFIGURACION_VPN', 'MEDIA', 'COMPLETADA', 'c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000002', CURRENT_TIMESTAMP - interval '1 hour', NULL, 'Av. Apoquindo 6100, Las Condes', 'Las Condes', -33.4110, -70.5650, 'Red');

-- 7. MAGIC LINKS DE ACCESO AL CLIENTE
INSERT INTO magic_links (work_order_id, token, expires_at, is_active) VALUES
('d0000000-0000-0000-0000-000000000001', 'token_magic_providencia_8491_abc', CURRENT_TIMESTAMP + interval '48 hours', TRUE),
('d0000000-0000-0000-0000-000000000005', 'token_magic_nunoa_8495_xyz', CURRENT_TIMESTAMP + interval '48 hours', TRUE);

-- 8. EVIDENCIAS EN TERRENO PARA ORDENES COMPLETADAS
INSERT INTO work_order_evidences (
    work_order_id, technician_id, evidence_type, storage_url, signal_dbm, speed_download_mbps, speed_upload_mbps, notes
) VALUES
('d0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000006', 'TEST_VELOCIDAD', 'https://storage.googleapis.com/atlas-evidences/ot_8498_speed.png', -78.50, 112.40, 45.20, 'Test de enlace exitoso en rack principal.'),
('d0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000006', 'FIRMA_CLIENTE', 'https://storage.googleapis.com/atlas-evidences/ot_8498_signature.png', NULL, NULL, NULL, 'Firma conforme de Gonzalo Vidal (Jefe Infraestructura).');
