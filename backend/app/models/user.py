import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, Numeric, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.enums import UserRoleEnum

if TYPE_CHECKING:
    from app.models.work_order import WorkOrder, OrderStatusHistory
    from app.models.inventory import SimCard, Equipment
    from app.models.evidence import WorkOrderEvidence


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    role: Mapped[UserRoleEnum] = mapped_column(
        ENUM(UserRoleEnum, name="user_role_enum", create_type=False),
        nullable=False,
        default=UserRoleEnum.TECNICO,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relaciones
    technician_profile: Mapped[Optional["Technician"]] = relationship(
        "Technician", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    created_orders: Mapped[List["WorkOrder"]] = relationship(
        "WorkOrder", back_populates="creator", foreign_keys="WorkOrder.created_by"
    )
    status_changes: Mapped[List["OrderStatusHistory"]] = relationship(
        "OrderStatusHistory", back_populates="changed_by_user"
    )


class Technician(Base):
    __tablename__ = "technicians"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    rut: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    initials: Mapped[str] = mapped_column(String(10), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    vehicle_plate: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    current_lat: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7), nullable=True)
    current_lng: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7), nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relaciones
    user: Mapped["User"] = relationship("User", back_populates="technician_profile")
    assigned_orders: Mapped[List["WorkOrder"]] = relationship(
        "WorkOrder", back_populates="technician", foreign_keys="WorkOrder.technician_id"
    )
    custody_sims: Mapped[List["SimCard"]] = relationship(
        "SimCard", back_populates="assigned_technician"
    )
    custody_equipment: Mapped[List["Equipment"]] = relationship(
        "Equipment", back_populates="assigned_technician"
    )
    evidences: Mapped[List["WorkOrderEvidence"]] = relationship(
        "WorkOrderEvidence", back_populates="technician"
    )
