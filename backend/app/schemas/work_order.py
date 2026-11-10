import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Dict
from pydantic import BaseModel, ConfigDict, Field, EmailStr
from app.models.enums import OrderStatusEnum, OrderPriorityEnum, ServiceTypeEnum


# ─── Resúmenes de Entidades Relacionadas ─────────────────────────────────────
class ClientSummary(BaseModel):
    id: uuid.UUID
    business_name: str
    contact_person: Optional[str] = None
    contact_phone: str
    contact_email: str
    address: str
    comuna: str
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None

    model_config = ConfigDict(from_attributes=True)


class AuditorSummary(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    role: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AuditorSummary(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    role: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TechnicianSummary(BaseModel):
    id: uuid.UUID
    full_name: str
    rut: Optional[str] = None
    initials: Optional[str] = None
    phone: Optional[str] = None
    vehicle_plate: Optional[str] = None
    is_available: bool = True
    current_lat: Optional[Decimal] = None
    current_lng: Optional[Decimal] = None
    last_location_at: Optional[datetime] = None
    active_order_id: Optional[uuid.UUID] = None
    active_order_number: Optional[str] = None
    active_order_status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class WorkOrderLocationUpdate(BaseModel):
    lat: Decimal = Field(..., ge=-90.0, le=90.0, description="Latitud WGS84 (-90.0 a 90.0)")
    lng: Decimal = Field(..., ge=-180.0, le=180.0, description="Longitud WGS84 (-180.0 a 180.0)")
    recorded_at: Optional[datetime] = Field(None, description="Timestamp de captura en dispositivo móvil")


class WorkOrderLocationResponse(BaseModel):
    success: bool = True
    order_id: uuid.UUID
    technician_id: uuid.UUID
    current_lat: Decimal
    current_lng: Decimal
    last_location_at: datetime
    status: str


class TechnicianLocationSummary(BaseModel):
    technician_id: uuid.UUID
    full_name: str
    initials: Optional[str] = None
    vehicle_plate: Optional[str] = None
    current_lat: Optional[Decimal] = None
    current_lng: Optional[Decimal] = None
    last_location_at: Optional[datetime] = None
    active_order_id: Optional[uuid.UUID] = None
    active_order_number: Optional[str] = None
    active_order_status: Optional[str] = None
    is_available: bool = True


class TechnicianCreate(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=150, description="Nombre completo del técnico")
    email: EmailStr = Field(..., description="Correo de acceso corporativo")
    password: str = Field(..., min_length=6, description="Contraseña temporal para la app móvil")
    rut: str = Field(..., min_length=7, max_length=20, description="RUT chileno del técnico")
    phone: Optional[str] = Field(None, max_length=50, description="Teléfono de contacto")
    vehicle_plate: Optional[str] = Field(None, max_length=20, description="Patente del vehículo asignado")
    initials: Optional[str] = Field(None, max_length=10, description="Iniciales del técnico")


class OrderStatusHistoryResponse(BaseModel):
    id: uuid.UUID
    old_status: Optional[OrderStatusEnum] = None
    new_status: OrderStatusEnum
    changed_by_user_id: Optional[uuid.UUID] = None
    changed_by_name: Optional[str] = None
    changed_by_role: Optional[str] = None
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None
    comment: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkOrderItemResponse(BaseModel):
    id: uuid.UUID
    work_order_id: uuid.UUID
    sim_card_id: Optional[uuid.UUID] = None
    equipment_id: Optional[uuid.UUID] = None
    action_type: str = "INSTALACION"
    created_at: datetime
    sim_iccid: Optional[str] = None
    equipment_serial: Optional[str] = None
    equipment_model: Optional[str] = None
    equipment_brand: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class OrderActivityLogItem(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    order_number: str
    client_name: Optional[str] = None
    technician_name: Optional[str] = None
    performer_role: Optional[str] = None
    action: str
    old_status: Optional[OrderStatusEnum] = None
    new_status: OrderStatusEnum
    service_type: Optional[ServiceTypeEnum] = None
    created_at: datetime
    comment: Optional[str] = None
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None

    model_config = ConfigDict(from_attributes=True)


class OrderActivityLogPaginatedResponse(BaseModel):
    items: List[OrderActivityLogItem]
    total: int
    page: int
    size: int
    pages: int

    model_config = ConfigDict(from_attributes=True)


# ─── Creación y Actualización de Órdenes ─────────────────────────────────────
class WorkOrderBase(BaseModel):
    title: str = Field(..., max_length=250)
    description: Optional[str] = None
    service_type: ServiceTypeEnum
    priority: OrderPriorityEnum = OrderPriorityEnum.MEDIA
    scheduled_date: Optional[datetime] = None
    eta: Optional[datetime] = None
    address_override: Optional[str] = None
    comuna_override: Optional[str] = None
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None
    tag: Optional[str] = Field(None, max_length=50)


class WorkOrderCreate(WorkOrderBase):
    client_id: Optional[uuid.UUID] = None
    client_name: Optional[str] = None
    technician_id: Optional[uuid.UUID] = None
    order_number: Optional[str] = None  # Si es None, el servicio genera uno secuencial


class WorkOrderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    service_type: Optional[ServiceTypeEnum] = None
    priority: Optional[OrderPriorityEnum] = None
    scheduled_date: Optional[datetime] = None
    eta: Optional[datetime] = None
    address_override: Optional[str] = None
    comuna_override: Optional[str] = None
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None
    tag: Optional[str] = None


class WorkOrderStatusUpdate(BaseModel):
    """Payload para transición de estado en terreno o coordinación."""
    new_status: OrderStatusEnum
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None
    comment: Optional[str] = None


class WorkOrderAssign(BaseModel):
    """Payload para asignación o reasignación de técnico."""
    technician_id: uuid.UUID
    eta: Optional[datetime] = None


class AuditApprovalRequest(BaseModel):
    """Payload para aprobar administrativamente la auditoría de una orden."""
    notes: Optional[str] = Field(None, max_length=1000, description="Observaciones o notas de auditoría")


class AuditApprovalRequest(BaseModel):
    """Payload para aprobar administrativamente la auditoría de una orden."""
    notes: Optional[str] = Field(None, max_length=1000, description="Observaciones o notas de auditoría")


class MagicLinkDetailSummary(BaseModel):
    id: Optional[uuid.UUID] = None
    token: Optional[str] = None
    portal_url: Optional[str] = None
    is_active: bool = False
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    link_status: str = "SIN_ENLACE"  # VIGENTE | VENCIDO | REVOCADO | SIN_ENLACE
    portal_mode: str = "Resumen final"  # Seguimiento activo | Atención en sitio | Resumen final
    has_signature: bool = False
    signature_url: Optional[str] = None
    signed_at: Optional[datetime] = None
    signed_by_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ─── Respuestas de Órdenes ──────────────────────────────────────────────────
class WorkOrderResponse(WorkOrderBase):
    id: uuid.UUID
    order_number: str
    status: OrderStatusEnum
    client_id: uuid.UUID
    technician_id: Optional[uuid.UUID] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    
    # Auditoría administrativa persistente
    is_audited: bool = False
    audited_at: Optional[datetime] = None
    audited_by_user_id: Optional[uuid.UUID] = None
    auditor: Optional[AuditorSummary] = None
    audit_notes: Optional[str] = None

    # Trazabilidad de firma digital de conformidad
    has_signature: bool = False
    is_signed: bool = False
    signature_url: Optional[str] = None
    signed_at: Optional[datetime] = None
    signed_by_name: Optional[str] = None

    # Entidades anidadas cargadas
    client: Optional[ClientSummary] = None
    technician_summary: Optional[TechnicianSummary] = None
    active_magic_link_token: Optional[str] = None
    magic_link_detail: Optional[MagicLinkDetailSummary] = None
    status_history: List[OrderStatusHistoryResponse] = []
    items: List[WorkOrderItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class WorkOrderListResponse(BaseModel):
    items: List[WorkOrderResponse]
    total: int
    page: int
    size: int
    pages: int


# ─── KPIs del Dispatch Board ────────────────────────────────────────────────
class DispatchKPIsResponse(BaseModel):
    active_orders: int
    technicians_in_field: int
    available_sims_rate: float
    completed_today: int
    delayed_orders: int
    status_distribution: Dict[str, int]


# ─── Sincronización Masiva Offline (PWA - RNF-REN-05 / RF-API-11) ───────────
class SyncBatchMutationItem(BaseModel):
    client_mutation_id: uuid.UUID
    work_order_id: uuid.UUID
    status: OrderStatusEnum
    timestamp: datetime
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None
    comment: Optional[str] = None
    
    # Evidencia técnica opcional si la mutación incluye checklist
    signal_dbm: Optional[Decimal] = None
    speed_download_mbps: Optional[Decimal] = None
    speed_upload_mbps: Optional[Decimal] = None
    validated_iccid: Optional[str] = None
    validated_imsi: Optional[str] = None
    evidence_storage_url: Optional[str] = None


class SyncBatchRequest(BaseModel):
    client_batch_id: uuid.UUID
    device_synced_at: datetime
    mutations: List[SyncBatchMutationItem]


class SyncBatchResponse(BaseModel):
    success: bool
    processed_count: int
    failed_count: int
    synced_order_ids: List[uuid.UUID]
    processing_time_ms: float
    message: str
