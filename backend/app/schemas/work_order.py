import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Dict
from pydantic import BaseModel, ConfigDict, Field
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


class TechnicianSummary(BaseModel):
    id: uuid.UUID
    full_name: str
    rut: Optional[str] = None
    initials: Optional[str] = None
    phone: Optional[str] = None
    vehicle_plate: Optional[str] = None
    is_available: bool = True

    model_config = ConfigDict(from_attributes=True)


class OrderStatusHistoryResponse(BaseModel):
    id: uuid.UUID
    old_status: Optional[OrderStatusEnum] = None
    new_status: OrderStatusEnum
    changed_by_user_id: Optional[uuid.UUID] = None
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None
    comment: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Creación y Actualización de Órdenes ─────────────────────────────────────
class WorkOrderBase(BaseModel):
    title: str = Field(..., max_length=250)
    description: Optional[str] = None
    service_type: ServiceTypeEnum
    priority: OrderPriorityEnum = OrderPriorityEnum.MEDIA
    scheduled_date: datetime
    eta: Optional[datetime] = None
    address_override: Optional[str] = None
    comuna_override: Optional[str] = None
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None
    tag: Optional[str] = Field(None, max_length=50)


class WorkOrderCreate(WorkOrderBase):
    client_id: uuid.UUID
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
    
    # Entidades anidadas cargadas
    client: Optional[ClientSummary] = None
    technician_summary: Optional[TechnicianSummary] = None
    active_magic_link_token: Optional[str] = None
    status_history: List[OrderStatusHistoryResponse] = []

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
