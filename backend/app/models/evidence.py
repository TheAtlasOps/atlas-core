import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
from decimal import Decimal
from sqlalchemy import String, DateTime, Numeric, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.enums import EvidenceTypeEnum

if TYPE_CHECKING:
    from app.models.work_order import WorkOrder
    from app.models.user import Technician


class WorkOrderEvidence(Base):
    __tablename__ = "work_order_evidences"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    work_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("work_orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    technician_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("technicians.id", ondelete="RESTRICT"), nullable=False
    )
    evidence_type: Mapped[EvidenceTypeEnum] = mapped_column(
        ENUM(EvidenceTypeEnum, name="evidence_type_enum", create_type=False),
        nullable=False,
    )
    storage_url: Mapped[str] = mapped_column(Text, nullable=False)
    signal_dbm: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    speed_download_mbps: Mapped[Optional[Decimal]] = mapped_column(Numeric(7, 2), nullable=True)
    speed_upload_mbps: Mapped[Optional[Decimal]] = mapped_column(Numeric(7, 2), nullable=True)
    validated_iccid: Mapped[Optional[str]] = mapped_column(String(22), nullable=True)
    validated_imsi: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lat: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7), nullable=True)
    lng: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 7), nullable=True)
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relaciones
    work_order: Mapped["WorkOrder"] = relationship("WorkOrder", back_populates="evidences")
    technician: Mapped["Technician"] = relationship("Technician", back_populates="evidences")
