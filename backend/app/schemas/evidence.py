import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import EvidenceTypeEnum


class EvidenceCreateRequest(BaseModel):
    """Payload para registrar una evidencia o medición técnica vinculada a una OT."""
    work_order_id: uuid.UUID
    evidence_type: EvidenceTypeEnum
    storage_url: str = Field(..., description="URL persistida en Cloud Storage")
    signal_dbm: Optional[Decimal] = Field(None, ge=-140, le=-40, description="Potencia de señal 4G/5G en dBm (ej: -85.5)")
    speed_download_mbps: Optional[Decimal] = Field(None, ge=0, description="Velocidad de descarga en Mbps")
    speed_upload_mbps: Optional[Decimal] = Field(None, ge=0, description="Velocidad de subida en Mbps")
    validated_iccid: Optional[str] = Field(None, max_length=22, description="ICCID escaneado o verificado en terreno")
    validated_imsi: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = Field(None, description="Observaciones técnicas de la evidencia")
    lat: Optional[Decimal] = Field(None, description="Latitud GPS capturada al registrar la evidencia")
    lng: Optional[Decimal] = Field(None, description="Longitud GPS capturada al registrar la evidencia")


class EvidenceResponse(BaseModel):
    """DTO de respuesta de evidencia registrada."""
    id: uuid.UUID
    work_order_id: uuid.UUID
    technician_id: uuid.UUID
    technician_name: Optional[str] = None
    evidence_type: EvidenceTypeEnum
    storage_url: str
    signal_dbm: Optional[Decimal] = None
    speed_download_mbps: Optional[Decimal] = None
    speed_upload_mbps: Optional[Decimal] = None
    validated_iccid: Optional[str] = None
    validated_imsi: Optional[str] = None
    notes: Optional[str] = None
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None
    captured_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FileUploadResponse(BaseModel):
    """Respuesta tras validar e inspeccionar magic bytes del archivo (RNF-SEG-05)."""
    success: bool
    filename: str
    mime_type: str
    size_bytes: int
    storage_url: str
    message: str


class OrderEvidencesAuditResponse(BaseModel):
    """Auditoría de evidencias para cierre formal de la orden (RF-BO-09 / RF-APP-13)."""
    work_order_id: uuid.UUID
    order_number: str
    total_evidences: int
    has_photo_before: bool
    has_photo_after: bool
    has_signature: bool
    has_signal_check: bool
    is_ready_for_closing: bool
    items: List[EvidenceResponse]
