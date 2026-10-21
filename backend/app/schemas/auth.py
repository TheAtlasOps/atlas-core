import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class LoginRequest(BaseModel):
    """Esquema para autenticación estándar vía JSON."""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Respuesta con token JWT firmado (RNF-SEG-02)."""
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user_id: uuid.UUID
    email: str
    full_name: str
    role: str


class TokenPayload(BaseModel):
    """Payload decodificado del JWT."""
    sub: str
    role: str
    exp: int


class MagicLinkGenerateRequest(BaseModel):
    """Solicitud de emisión de Magic Link para cliente."""
    work_order_id: uuid.UUID
    expire_hours: Optional[int] = 48


class MagicLinkResponse(BaseModel):
    """Respuesta con token seguro y URL del portal cliente (RNF-SEG-03)."""
    id: uuid.UUID
    work_order_id: uuid.UUID
    token: str
    portal_url: str
    expires_at: datetime
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
