import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field


class EmailNotificationRequest(BaseModel):
    """Payload para solicitud de envío de correo transaccional."""
    recipient_email: EmailStr
    recipient_name: str
    order_number: str
    magic_link_url: str
    service_type: str
    scheduled_date: datetime
    address: str


class EmailNotificationResponse(BaseModel):
    """Respuesta del proveedor de correo (Resend)."""
    success: bool
    recipient: str
    message_id: Optional[str] = None
    status: str
    sent_at: datetime
    simulated: bool = False


class ManualNotifyRequest(BaseModel):
    """Solicitud de reenvío manual de enlace o recordatorio por el coordinador (RF-BO-11)."""
    work_order_id: uuid.UUID
    recipient_email: Optional[EmailStr] = None
    notification_type: str = Field(
        "MAGIC_LINK_INVITATION",
        description="MAGIC_LINK_INVITATION | SERVICE_COMPLETED | REMINDER"
    )
    custom_message: Optional[str] = None


class WebhookEventPayload(BaseModel):
    """Estructura de evento transaccional saliente para integraciones Entel (14-DocArq §3.3)."""
    event: str = Field(..., description="order.status_changed | device.swapped | visit.completed")
    work_order_id: uuid.UUID
    timestamp: datetime
    data: Dict[str, Any]
