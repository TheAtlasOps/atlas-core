import re
import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.models.enums import SimStatusEnum, EquipmentTypeEnum, EquipmentStatusEnum


# ─── Tarjetas SIM (RF-API-01) ───────────────────────────────────────────────
class SimCardBase(BaseModel):
    iccid: str = Field(..., max_length=22, description="Identificador único del chip (ICCID de 19 a 22 dígitos)")
    imsi: Optional[str] = Field(None, max_length=20)
    msisdn: Optional[str] = Field(None, max_length=20, description="Número de línea móvil asociado")
    operator: Optional[str] = Field("Entel", max_length=50)
    notes: Optional[str] = None


class SimCardCreate(SimCardBase):
    status: Optional[SimStatusEnum] = SimStatusEnum.DISPONIBLE
    assigned_technician_id: Optional[uuid.UUID] = None
    installed_client_id: Optional[uuid.UUID] = None


class SimCardUpdate(BaseModel):
    status: Optional[SimStatusEnum] = None
    imsi: Optional[str] = None
    msisdn: Optional[str] = None
    operator: Optional[str] = None
    assigned_technician_id: Optional[uuid.UUID] = None
    installed_client_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None


class SimCardResponse(SimCardBase):
    id: uuid.UUID
    status: SimStatusEnum
    assigned_technician_id: Optional[uuid.UUID] = None
    installed_client_id: Optional[uuid.UUID] = None
    assigned_technician_name: Optional[str] = None
    installed_client_name: Optional[str] = None
    work_order_id: Optional[uuid.UUID] = None
    work_order_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SimCardListResponse(BaseModel):
    items: List[SimCardResponse]
    total: int
    page: int
    size: int
    pages: int


# ─── Routers y Equipamiento (RF-API-02) ──────────────────────────────────────
class EquipmentBase(BaseModel):
    serial_number: str = Field(..., max_length=100, description="Número de serie físico único")
    mac_address: Optional[str] = Field(None, max_length=50, description="Dirección MAC física")
    brand: str = Field(..., max_length=100, description="Marca (Huawei, Teltonika, MikroTik, etc.)")
    model: str = Field(..., max_length=100, description="Modelo del dispositivo")
    type: EquipmentTypeEnum
    notes: Optional[str] = None

    @field_validator("mac_address", mode="before")
    @classmethod
    def validate_mac_address(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            clean = v.strip()
            if not clean:
                return None
            if not re.match(r"^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$", clean):
                raise ValueError("Formato de dirección MAC inválido. Debe ser XX:XX:XX:XX:XX:XX o XX-XX-XX-XX-XX-XX")
            return clean.upper()
        return v


class EquipmentCreate(EquipmentBase):
    status: Optional[EquipmentStatusEnum] = EquipmentStatusEnum.DISPONIBLE
    assigned_technician_id: Optional[uuid.UUID] = None
    installed_client_id: Optional[uuid.UUID] = None


class EquipmentUpdate(BaseModel):
    status: Optional[EquipmentStatusEnum] = None
    mac_address: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    type: Optional[EquipmentTypeEnum] = None
    assigned_technician_id: Optional[uuid.UUID] = None
    installed_client_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None

    @field_validator("mac_address", mode="before")
    @classmethod
    def validate_mac_address(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            clean = v.strip()
            if not clean:
                return None
            if not re.match(r"^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$", clean):
                raise ValueError("Formato de dirección MAC inválido. Debe ser XX:XX:XX:XX:XX:XX o XX-XX-XX-XX-XX-XX")
            return clean.upper()
        return v


class EquipmentResponse(EquipmentBase):
    id: uuid.UUID
    status: EquipmentStatusEnum
    assigned_technician_id: Optional[uuid.UUID] = None
    installed_client_id: Optional[uuid.UUID] = None
    assigned_technician_name: Optional[str] = None
    installed_client_name: Optional[str] = None
    work_order_id: Optional[uuid.UUID] = None
    work_order_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EquipmentListResponse(BaseModel):
    items: List[EquipmentResponse]
    total: int
    page: int
    size: int
    pages: int


# ─── Emparejamiento Lógico Router-SIM 1:1 (RF-API-03 / 14-DocArq §3.2) ──────
class DevicePairRequest(BaseModel):
    """Payload para emparejar un Router con una SIM bajo control de exclusividad."""
    equipment_id: uuid.UUID
    sim_card_id: uuid.UUID
    work_order_id: Optional[uuid.UUID] = None
    client_id: Optional[uuid.UUID] = None
    technician_id: Optional[uuid.UUID] = None
    action_type: str = Field("INSTALACION", description="INSTALACION, REEMPLAZO o RETIRO")


class DevicePairResponse(BaseModel):
    success: bool
    message: str
    equipment: EquipmentResponse
    sim_card: SimCardResponse
    work_order_item_id: Optional[uuid.UUID] = None
