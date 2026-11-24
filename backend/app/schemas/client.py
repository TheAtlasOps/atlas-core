import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator
from app.models.enums import ClientTypeEnum
from app.utils.rut import validate_and_format_rut


def _clean_optional_phone(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if len(cleaned) < 5:
        raise ValueError("El teléfono alternativo debe tener al menos 5 caracteres.")
    return cleaned


class ClientBase(BaseModel):
    client_type: ClientTypeEnum = Field(
        default=ClientTypeEnum.EMPRESARIAL,
        description="Tipo de cliente: EMPRESARIAL o RESIDENCIAL",
    )
    business_name: str = Field(..., min_length=2, max_length=200, description="Razón social o nombre completo")
    contact_email: EmailStr = Field(..., description="Correo electrónico de contacto principal")
    contact_phone: str = Field(..., min_length=5, max_length=50, description="Teléfono de contacto")
    secondary_phone: Optional[str] = Field(None, max_length=50, description="Teléfono alternativo opcional")
    address: str = Field(..., min_length=3, max_length=300, description="Dirección comercial, domiciliaria o técnica")
    comuna: str = Field(default="Santiago", min_length=2, max_length=100, description="Comuna")
    region: Optional[str] = Field(default="Metropolitana", max_length=100, description="Región")
    rut: Optional[str] = Field(None, max_length=20, description="RUT chileno (ej: 76.123.456-0 o 12.345.678-5)")
    contact_person: Optional[str] = Field(None, max_length=150, description="Nombre de persona de contacto")
    lat: Optional[Decimal] = Field(None, description="Latitud geográfica")
    lng: Optional[Decimal] = Field(None, description="Longitud geográfica")

    @field_validator("rut")
    @classmethod
    def validate_rut_field(cls, value: Optional[str]) -> Optional[str]:
        return validate_and_format_rut(value)

    @field_validator("secondary_phone")
    @classmethod
    def validate_secondary_phone_field(cls, value: Optional[str]) -> Optional[str]:
        return _clean_optional_phone(value)


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    client_type: Optional[ClientTypeEnum] = None
    business_name: Optional[str] = Field(None, min_length=2, max_length=200)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(None, min_length=5, max_length=50)
    secondary_phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, min_length=3, max_length=300)
    comuna: Optional[str] = Field(None, min_length=2, max_length=100)
    region: Optional[str] = None
    rut: Optional[str] = Field(None, max_length=20)
    contact_person: Optional[str] = Field(None, max_length=150)
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None

    @field_validator("rut")
    @classmethod
    def validate_rut_field(cls, value: Optional[str]) -> Optional[str]:
        return validate_and_format_rut(value)

    @field_validator("secondary_phone")
    @classmethod
    def validate_secondary_phone_field(cls, value: Optional[str]) -> Optional[str]:
        return _clean_optional_phone(value)


class ClientOrderItem(BaseModel):
    id: uuid.UUID
    order_number: str
    title: str
    service_type: str
    status: str
    priority: str
    scheduled_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    technician_name: Optional[str] = None
    tag: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ClientResponse(BaseModel):
    id: uuid.UUID
    client_type: str = "EMPRESARIAL"
    rut: Optional[str] = None
    business_name: str
    contact_person: Optional[str] = None
    contact_phone: str
    secondary_phone: Optional[str] = None
    contact_email: str
    address: str
    comuna: str
    region: Optional[str] = "Metropolitana"
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime
    active_orders_count: int = 0
    total_orders_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ClientDetailResponse(ClientResponse):
    orders: List[ClientOrderItem] = []
