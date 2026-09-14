# 📊 Modelo Entidad-Relación (DER) - Proyecto Atlas FSM

**Autor:** Alexander Sáez López (Gestión y Modelado de Base de Datos)  
**Proyecto:** Atlas - Field Service Management (FSM) para Entel  
**Motor de Base de Datos:** PostgreSQL 15+ Serverless (Neon.tech / Supabase / AWS RDS)  
**Rama Git:** `base-datos`

---

## 1. Diagrama Entidad-Relación (Mermaid)

```mermaid
erDiagram
    users ||--o| technicians : "perfil extendido"
    users ||--o{ work_orders : "crea"
    users ||--o{ order_status_history : "registra cambio"

    technicians ||--o{ work_orders : "tiene asignadas"
    technicians ||--o{ sim_cards : "custodia en vehiculo"
    technicians ||--o{ equipment : "custodia en vehiculo"
    technicians ||--o{ work_order_evidences : "captura en terreno"

    clients ||--o{ work_orders : "solicita"
    clients ||--o{ sim_cards : "tiene instaladas"
    clients ||--o{ equipment : "tiene instalado"

    work_orders ||--|| magic_links : "genera token de acceso"
    work_orders ||--o{ work_order_items : "contiene"
    work_orders ||--o{ work_order_evidences : "respalda"
    work_orders ||--o{ order_status_history : "trazabilidad"

    sim_cards ||--o{ work_order_items : "se asocia a"
    equipment ||--o{ work_order_items : "se asocia a"

    users {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        string phone
        enum role "ADMIN, COORDINADOR, TECNICO, CLIENTE"
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    technicians {
        uuid id PK, FK
        string rut UK
        string initials
        string avatar_url
        string vehicle_plate
        numeric current_lat
        numeric current_lng
        boolean is_available
        timestamp updated_at
    }

    clients {
        uuid id PK
        string rut UK
        string business_name
        string contact_person
        string contact_phone
        string contact_email
        string address
        string comuna
        numeric lat
        numeric lng
    }

    work_orders {
        uuid id PK
        string order_number UK
        string title
        text description
        enum service_type
        enum priority "BAJA, MEDIA, ALTA, URGENTE"
        enum status "IDLE, CONFIRMADA, EN_RUTA, EN_SITIO, COMPLETADA, CANCELADA"
        uuid client_id FK
        uuid technician_id FK
        timestamp scheduled_date
        timestamp eta
        string address_override
        string comuna_override
        numeric lat
        numeric lng
        string tag
        timestamp created_at
    }

    magic_links {
        uuid id PK
        uuid work_order_id FK
        string token UK
        timestamp expires_at
        timestamp used_at
        boolean is_active
        timestamp client_confirmed_at
        text signature_url
    }

    sim_cards {
        uuid id PK
        string iccid UK
        string imsi
        string msisdn
        string operator
        enum status "DISPONIBLE, ASIGNADA_TECNICO, INSTALADA, DEFECTUOSA, BAJA"
        uuid assigned_technician_id FK
        uuid installed_client_id FK
        text notes
    }

    equipment {
        uuid id PK
        string serial_number UK
        string mac_address
        string brand
        string model
        enum type "ROUTER_4G, ROUTER_5G, MODEM_ADSL, REPETIDOR_WIFI, ANTENA_EXTERNA"
        enum status "DISPONIBLE, ASIGNADO_TECNICO, INSTALADO, DEFECTUOSO, BAJA"
        uuid assigned_technician_id FK
        uuid installed_client_id FK
    }

    work_order_items {
        uuid id PK
        uuid work_order_id FK
        uuid sim_card_id FK
        uuid equipment_id FK
        string action_type "INSTALACION, RETIRO, REEMPLAZO"
    }

    work_order_evidences {
        uuid id PK
        uuid work_order_id FK
        uuid technician_id FK
        enum evidence_type "FOTO_ANTES, FOTO_DESPUES, TEST_VELOCIDAD, DIAGNOSTICO_DBM, FIRMA_CLIENTE"
        text storage_url
        numeric signal_dbm
        numeric speed_download_mbps
        numeric speed_upload_mbps
        timestamp captured_at
    }

    order_status_history {
        uuid id PK
        uuid work_order_id FK
        enum old_status
        enum new_status
        uuid changed_by_user_id FK
        numeric lat
        numeric lng
        timestamp created_at
    }
```

---

## 2. Descripción de Entidades y Normalización

1. **`users` y `technicians` (Especialización 1:1):**
   * Se desacopla la autenticación general de los datos específicos de campo del técnico (patente de vehículo, iniciales, última geolocalización GPS y estado de disponibilidad).
2. **`clients`:**
   * Almacena clientes corporativos (Entel HQ, BancoEstado) y pymes, incluyendo dirección y coordenadas para cálculo de rutas del Dispatch Board.
3. **`work_orders` (Núcleo FSM):**
   * Representa los tickets de servicio. Maneja los 6 estados estandarizados: `IDLE` (Pendiente), `CONFIRMADA` (Visita aprobada), `EN_RUTA` (Técnico viajando), `EN_SITIO` (En el lugar), `COMPLETADA` y `CANCELADA`.
4. **`magic_links`:**
   * Garantiza acceso sin fricción para el cliente final mediante tokens UUID criptográficamente seguros con tiempo de expiración y auditoría de firma digital.
5. **`sim_cards` y `equipment`:**
   * Inventario trazable con doble relación: una SIM o Router puede estar bajo custodia de un técnico (en la camioneta) o instalada formalmente en la sede de un cliente.
6. **`work_order_evidences`:**
   * Respaldo técnico de la App Móvil para auditar calidad de instalación (fotos, potencias dBm de señal 4G/5G y mediciones de ancho de banda).
7. **`order_status_history`:**
   * Trazabilidad inmutable que registra cada transición de estado con coordenadas del técnico, impidiendo manipulación de SLAs.
