import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.enums import SimStatusEnum, EquipmentTypeEnum, EquipmentStatusEnum

if TYPE_CHECKING:
    from app.models.user import Technician
    from app.models.client import Client
    from app.models.work_order import WorkOrderItem


class SimCard(Base):
    __tablename__ = "sim_cards"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    iccid: Mapped[str] = mapped_column(String(22), unique=True, nullable=False, index=True)
    imsi: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    msisdn: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    operator: Mapped[Optional[str]] = mapped_column(String(50), default="Entel")
    status: Mapped[SimStatusEnum] = mapped_column(
        ENUM(SimStatusEnum, name="sim_status_enum", create_type=False),
        nullable=False,
        default=SimStatusEnum.DISPONIBLE,
        index=True,
    )
    assigned_technician_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("technicians.id", ondelete="SET NULL"), nullable=True
    )
    installed_client_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relaciones
    assigned_technician: Mapped[Optional["Technician"]] = relationship(
        "Technician", back_populates="custody_sims"
    )
    installed_client: Mapped[Optional["Client"]] = relationship(
        "Client", back_populates="installed_sims"
    )
    work_order_associations: Mapped[List["WorkOrderItem"]] = relationship(
        "WorkOrderItem", back_populates="sim_card"
    )


class Equipment(Base):
    __tablename__ = "equipment"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    serial_number: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    mac_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    brand: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[EquipmentTypeEnum] = mapped_column(
        ENUM(EquipmentTypeEnum, name="equipment_type_enum", create_type=False),
        nullable=False,
    )
    status: Mapped[EquipmentStatusEnum] = mapped_column(
        ENUM(EquipmentStatusEnum, name="equipment_status_enum", create_type=False),
        nullable=False,
        default=EquipmentStatusEnum.DISPONIBLE,
    )
    assigned_technician_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("technicians.id", ondelete="SET NULL"), nullable=True
    )
    installed_client_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relaciones
    assigned_technician: Mapped[Optional["Technician"]] = relationship(
        "Technician", back_populates="custody_equipment"
    )
    installed_client: Mapped[Optional["Client"]] = relationship(
        "Client", back_populates="installed_equipment"
    )
    work_order_associations: Mapped[List["WorkOrderItem"]] = relationship(
        "WorkOrderItem", back_populates="equipment"
    )
