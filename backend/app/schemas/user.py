import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.enums import UserRoleEnum


class TechnicianProfileResponse(BaseModel):
    rut: str
    initials: str
    avatar_url: Optional[str] = None
    vehicle_plate: Optional[str] = None
    current_lat: Optional[Decimal] = None
    current_lng: Optional[Decimal] = None
    is_available: bool = True

    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: UserRoleEnum = UserRoleEnum.TECNICO
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    technician_profile: Optional[TechnicianProfileResponse] = None

    model_config = ConfigDict(from_attributes=True)
