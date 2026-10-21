import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


# ─── Timeline y Credenciales de Terreno ─────────────────────────────────────
class TimelineStepItem(BaseModel):
    key: str  # confirmada | en_ruta | en_sitio | completada
    label: str
    completed: bool
    current: bool
    timestamp: Optional[str] = None
    description: Optional[str] = None


class ClientTechnicianBadge(BaseModel):
    name: str
    phone: str
    avatar: str
    vehicle_plate: Optional[str] = None


# ─── Resumen de la Orden para Portal Cliente (14-DocArq §3.2) ───────────────
class ClientOrderSummaryResponse(BaseModel):
    order_id: uuid.UUID
    order_number: str
    status: str
    status_key: str  # idle | confirmada | en_ruta | en_sitio | completada | cancelada
    service_type: str
    scheduled_date: datetime
    eta: Optional[str] = None
    eta_label: str = "Llegada estimada"
    address: str
    comuna: str
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    technician: Optional[ClientTechnicianBadge] = None
    timeline_steps: List[TimelineStepItem]
    client_confirmed_at: Optional[datetime] = None
    is_confirmed: bool
    signature_url: Optional[str] = None
    is_completed: bool
    is_expired: bool = False


# ─── Confirmación de Visita por el Cliente (RF-CLI-06 / RF-CLI-07) ──────────
class ConfirmVisitRequest(BaseModel):
    contact_person: Optional[str] = Field(None, max_length=150, description="Actualización de persona que recibirá al técnico")
    contact_phone: Optional[str] = Field(None, max_length=50, description="Teléfono de contacto directo en sitio")
    notes: Optional[str] = Field(None, description="Instrucciones de acceso para el técnico (ej: piso, timbre)")


class ConfirmVisitResponse(BaseModel):
    success: bool
    message: str
    confirmed_at: datetime


# ─── Firma de Conformidad Digital (RF-CLI-08 / RF-APP-09) ───────────────────
class SignConformityRequest(BaseModel):
    signature_base64: str = Field(..., description="Cadena base64 de la firma capturada en canvas HTML5")
    signed_by_name: str = Field(..., max_length=150, description="Nombre de quien firma en recepción")


class SignConformityResponse(BaseModel):
    success: bool
    message: str
    signature_url: str
    signed_at: datetime
