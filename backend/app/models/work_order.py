import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional
from decimal import Decimal
from sqlalchemy import String, DateTime, Numeric, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.enums import OrderStatusEnum, OrderPriorityEnum, ServiceTypeEnum

if TYPE_CHECKING:
    from app.models.user import User, Technician
    from app.models.client import Client
    from app.models.inventory import SimCard, Equipment
    from app.models.magic_link import MagicLink
    from app.models.evidence import WorkOrderEvidence


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(250), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    service_type: Mapped[ServiceTypeEnum] = mapped_column(
        ENUM(ServiceTypeEnum, name="service_type_enum", create_type=False),
        nullable=False,
    )
    priority: Mapped[OrderPriorityEnum] = mapped_column(
        ENUM(OrderPriorityEnum, name="order_priority_enum", create_type=False),
        nullable=False,
        default=OrderPriorityEnum.MEDIA,
    )
    status: Mapped[OrderStatusEnum] = mapped_column(
        ENUM(OrderStatusEnum, name="order_status_enum", create_type=False),
        nullable=False,
        default=OrderStatusEnum.IDLE,
        index=True,
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    technician_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("technicians.id", ondelete="SET NULL"), nullable=True, index=True
    )
    scheduled_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    eta: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    address_override: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    comuna_override: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    lat: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7), nullable=True)
    lng: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7), nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    tag: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relaciones
    client: Mapped["Client"] = relationship("Client", back_populates="work_orders")
    technician: Mapped[Optional["Technician"]] = relationship(
        "Technician", back_populates="assigned_orders", foreign_keys=[technician_id]
    )
    creator: Mapped[Optional["User"]] = relationship(
        "User", back_populates="created_orders", foreign_keys=[created_by]
    )
    items: Mapped[List["WorkOrderItem"]] = relationship(
        "WorkOrderItem", back_populates="work_order", cascade="all, delete-orphan"
    )
    magic_links: Mapped[List["MagicLink"]] = relationship(
        "MagicLink", back_populates="work_order", cascade="all, delete-orphan"
    )
    evidences: Mapped[List["WorkOrderEvidence"]] = relationship(
        "WorkOrderEvidence", back_populates="work_order", cascade="all, delete-orphan"
    )
    status_history: Mapped[List["OrderStatusHistory"]] = relationship(
        "OrderStatusHistory",
        back_populates="work_order",
        cascade="all, delete-orphan",
        order_by="OrderStatusHistory.created_at.asc()",
    )


class WorkOrderItem(Base):
    __tablename__ = "work_order_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    work_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False
    )
    sim_card_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sim_cards.id", ondelete="SET NULL"), nullable=True
    )
    equipment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("equipment.id", ondelete="SET NULL"), nullable=True
    )
    action_type: Mapped[str] = mapped_column(String(50), default="INSTALACION")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relaciones
    work_order: Mapped["WorkOrder"] = relationship("WorkOrder", back_populates="items")
    sim_card: Mapped[Optional["SimCard"]] = relationship("SimCard", back_populates="work_order_associations")
    equipment: Mapped[Optional["Equipment"]] = relationship("Equipment", back_populates="work_order_associations")


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    work_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False
    )
    old_status: Mapped[Optional[OrderStatusEnum]] = mapped_column(
        ENUM(OrderStatusEnum, name="order_status_enum", create_type=False), nullable=True
    )
    new_status: Mapped[OrderStatusEnum] = mapped_column(
        ENUM(OrderStatusEnum, name="order_status_enum", create_type=False), nullable=False
    )
    changed_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    lat: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7), nullable=True)
    lng: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7), nullable=True)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relaciones
    work_order: Mapped["WorkOrder"] = relationship("WorkOrder", back_populates="status_history")
    changed_by_user: Mapped[Optional["User"]] = relationship("User", back_populates="status_changes")
